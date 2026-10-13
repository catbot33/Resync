import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Migrations need Neon's direct URL instead of the pooled runtime URL.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
