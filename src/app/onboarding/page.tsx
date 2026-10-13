import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Set up your workspace | Resync",
  description: "Set up your company, employees, and reservable resources.",
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (!currentUser) {
    redirect("/");
  }

  // Onboarding is a one-time flow; existing administrators return to their workspace.
  if (currentUser.organizationId) {
    redirect("/dashboard");
  }

  return <OnboardingWizard userName={session.user.name ?? "Administrator"} />;
}
