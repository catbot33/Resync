import { compare, hash } from "bcryptjs";

import { getAdminOrganization } from "@/lib/auth/admin-organization";
import { prisma } from "@/lib/prisma";
import { adminPasswordSchema } from "@/lib/settings/validation";

export async function PATCH(request: Request) {
  const context = await getAdminOrganization();
  if (!context.ok) return Response.json({ message: context.error }, { status: context.status });

  const parsed = adminPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ message: parsed.error.issues[0]?.message ?? "Check the password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { passwordHash: true, username: true },
  });
  if (!user) return Response.json({ message: "Your account could not be found." }, { status: 404 });
  if (!user.username) return Response.json({ message: "Save a username before adding a password." }, { status: 409 });

  if (user.passwordHash) {
    if (!parsed.data.currentPassword || !(await compare(parsed.data.currentPassword, user.passwordHash))) {
      return Response.json({ message: "The current password is incorrect." }, { status: 400 });
    }
  }

  // OAuth-only administrators can create a password after choosing a username.
  await prisma.user.update({
    where: { id: context.userId },
    data: { passwordHash: await hash(parsed.data.newPassword, 12) },
  });

  return Response.json({ message: user.passwordHash ? "Password updated." : "Password created." });
}
