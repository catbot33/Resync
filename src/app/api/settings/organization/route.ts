import { Prisma } from "@/generated/prisma/client";
import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { organizationSettingsSchema } from "@/lib/settings/validation";

export async function PATCH(request: Request) {
  const context = await getAdminOrganization();
  if (!context.ok) return Response.json({ message: context.error }, { status: context.status });

  const parsed = organizationSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the organization settings." }, { status: 400 });
  }

  try {
    const organization = await prisma.organization.update({
      where: { id: context.organizationId },
      data: {
        name: parsed.data.name,
        normalizedName: parsed.data.name.toLocaleLowerCase("en-US"),
        description: parsed.data.description || null,
        logoUrl: parsed.data.logoUrl || null,
        timezone: parsed.data.timezone,
        shifts: parsed.data.shifts,
      },
      select: { id: true, name: true, description: true, logoUrl: true, timezone: true, shifts: true },
    });

    return Response.json({ message: "Organization settings saved.", organization });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "An organization with this name already exists." }, { status: 409 });
    }

    console.error("Organization settings update failed", error);
    return Response.json({ message: "We could not save the organization settings." }, { status: 500 });
  }
}
