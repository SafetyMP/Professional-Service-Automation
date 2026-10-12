-- A person can carry a rate card in each firm. The old userId unique
-- index let the first organization block every other one.
DROP INDEX "ResourceProfile_userId_key";

CREATE UNIQUE INDEX "ResourceProfile_organizationId_userId_key"
  ON "ResourceProfile"("organizationId", "userId");
