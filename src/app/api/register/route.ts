import { hash } from "bcryptjs";

import { Prisma, UserRole } from "@/generated/prisma/client";
import { registrationSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        message: "Please correct the highlighted account details.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    // Only a one-way hash is stored; the original password never reaches the database.
    const passwordHash = await hash(parsed.data.password, 12);

    await prisma.user.create({
      data: {
        name: parsed.data.username,
        username: parsed.data.username,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    return Response.json({ message: "Account created." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "That username is already in use." }, { status: 409 });
    }

    console.error("Administrator registration failed", error);
    return Response.json({ message: "We could not create the account." }, { status: 500 });
  }
}
