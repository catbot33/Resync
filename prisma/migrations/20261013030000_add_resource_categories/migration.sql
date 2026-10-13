-- Create organization-scoped categories without discarding the existing resource type label.
CREATE TABLE "ResourceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Resource" ADD COLUMN "categoryId" TEXT;

-- Backfill one category per existing organization/type pair.
INSERT INTO "ResourceCategory" ("id", "name", "normalizedName", "organizationId", "createdAt", "updatedAt")
SELECT
    'cat_' || md5("organizationId" || ':' || lower(trim("type"))),
    min(trim("type")),
    lower(trim("type")),
    "organizationId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Resource"
GROUP BY "organizationId", lower(trim("type"));

UPDATE "Resource" AS resource
SET "categoryId" = category."id"
FROM "ResourceCategory" AS category
WHERE category."organizationId" = resource."organizationId"
  AND category."normalizedName" = lower(trim(resource."type"));

CREATE INDEX "Resource_categoryId_idx" ON "Resource"("categoryId");
CREATE INDEX "ResourceCategory_organizationId_idx" ON "ResourceCategory"("organizationId");
CREATE UNIQUE INDEX "ResourceCategory_organizationId_normalizedName_key" ON "ResourceCategory"("organizationId", "normalizedName");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ResourceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceCategory" ADD CONSTRAINT "ResourceCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
