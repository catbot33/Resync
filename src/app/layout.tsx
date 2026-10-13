import type { Metadata } from "next";
import "@fontsource-variable/inter";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in | Resync",
  description: "Sign in to reserve your organization's shared resources.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
