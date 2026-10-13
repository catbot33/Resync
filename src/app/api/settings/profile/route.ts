import { Prisma } from "@/generated/prisma/client";
import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { adminProfileSchema } from "@/lib/settings/validation";

export async function PATCH(request: Request) {
  const context = await getAdminOrganization();
  if (!context.ok) return Response.json({ message: context.error }, { status: context.status });

  const parsed = adminProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the account details." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: context.userId },
      data: parsed.data,
      select: { id: true, name: true, username: true, email: true },
    });
    return Response.json({ message: "Account details saved.", user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "That username is already in use." }, { status: 409 });
    }

    console.error("Administrator profile update failed", error);
    return Response.json({ message: "We could not save the account details." }, { status: 500 });
  }
}
