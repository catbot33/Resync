import { hash } from "bcryptjs";

import { auth } from "@/auth";
import { Prisma, UserRole } from "@/generated/prisma/client";
import { onboardingSchema } from "@/lib/onboarding/validation";
import { prisma } from "@/lib/prisma";
import { normalizeCategoryName } from "@/lib/resources/validation";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ message: "Sign in to continue." }, { status: 401 });
  }

  if (session.user.role !== UserRole.ADMIN) {
    return Response.json({ message: "Only an administrator can create an organization." }, { status: 403 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, ownedOrganization: { select: { id: true } } },
  });

  if (!currentUser) {
    return Response.json({ message: "Your account could not be found. Sign in again." }, { status: 401 });
  }

  if (currentUser.organizationId || currentUser.ownedOrganization) {
    return Response.json({ message: "Your organization has already been created." }, { status: 409 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: parsed.error.issues[0]?.message ?? "Check the onboarding details." },
      { status: 400 },
    );
  }

  const organizationName = parsed.data.organizationName;
  const normalizedName = organizationName.toLocaleLowerCase("en-US");
  const memberUsernames = parsed.data.members.map((member) => member.username);

  if (new Set(memberUsernames).size !== memberUsernames.length) {
    return Response.json({ message: "Each member needs a different username." }, { status: 409 });
  }

  try {
    // Hash every password before the database write; plaintext passwords are never persisted.
    const members = await Promise.all(
      parsed.data.members.map(async (member) => ({
        name: member.username,
        username: member.username,
        passwordHash: await hash(member.password, 12),
        role: UserRole.MEMBER,
      })),
    );

    await prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          name: organizationName,
          normalizedName,
          description: parsed.data.description || null,
          timezone: parsed.data.timezone,
          shifts: parsed.data.shifts,
          owner: { connect: { id: session.user.id } },
          members: {
            // The administrator belongs to the same organization as the members they create.
            connect: { id: session.user.id },
            create: members,
          },
        },
      });

      // Categories created during onboarding remain manageable from the Resources page.
      const categories = new Map<string, { id: string; name: string }>();
      for (const resource of parsed.data.resources) {
        const normalizedCategory = normalizeCategoryName(resource.type);
        if (categories.has(normalizedCategory)) continue;

        const category = await transaction.resourceCategory.create({
          data: {
            name: resource.type,
            normalizedName: normalizedCategory,
            organizationId: organization.id,
          },
          select: { id: true, name: true },
        });
        categories.set(normalizedCategory, category);
      }

      if (parsed.data.resources.length > 0) {
        await transaction.resource.createMany({
          data: parsed.data.resources.map((resource) => {
            const category = categories.get(normalizeCategoryName(resource.type));
            return {
              ...resource,
              type: category?.name ?? resource.type,
              categoryId: category?.id,
              organizationId: organization.id,
            };
          }),
        });
      }
    });

    return Response.json({ message: "Organization created." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      const message = target.includes("normalizedName")
        ? "An organization with this name already exists."
        : target.includes("ownerId")
          ? "Your organization has already been created."
          : "One or more member usernames are already in use.";

      return Response.json({ message }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2014") {
      return Response.json({ message: "Your organization has already been created." }, { status: 409 });
    }

    console.error("Organization onboarding failed", error);
    return Response.json({ message: "We could not save the organization." }, { status: 500 });
  }
}
