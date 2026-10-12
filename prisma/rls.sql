-- Row-Level Security for tenant isolation
-- Apply after Prisma migrations: psql -f prisma/rls.sql

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Client', 'Project', 'Task', 'ProjectMember', 'ResourceProfile',
    'Allocation', 'TimeEntry', 'Invoice', 'InvoiceLine', 'ExpenseEntry', 'AuditLog',
    'Milestone', 'ExpenseCategory', 'AccountingConnection',
    'OrganizationMember'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING ("organizationId" = current_setting(''app.current_org_id'', true))
       WITH CHECK ("organizationId" = current_setting(''app.current_org_id'', true))',
      tbl
    );
  END LOOP;
END $$;

-- Identity is not in the organizationId loop.
-- Organization is the tenant row. User is global, so a session may see a user
-- only as a member of the current org, or as the single email presented at login.
-- Unset GUCs match nothing (PostgreSQL RLS default-deny when no policy passes).
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_current ON "Organization";
CREATE POLICY org_current ON "Organization"
  USING (id = current_setting('app.current_org_id', true));
DROP POLICY IF EXISTS org_login ON "Organization";
CREATE POLICY org_login ON "Organization"
  USING (
    current_setting('app.login_org_slug', true) IS NOT NULL
    AND slug = current_setting('app.login_org_slug', true)
  );

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_org_member ON "User";
CREATE POLICY user_org_member ON "User"
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."userId" = "User".id
        AND m."organizationId" = current_setting('app.current_org_id', true)
    )
  );
DROP POLICY IF EXISTS user_login ON "User";
CREATE POLICY user_login ON "User"
  USING (
    current_setting('app.login_email', true) IS NOT NULL
    AND email = current_setting('app.login_email', true)
  );

GRANT ALL ON ALL TABLES IN SCHEMA public TO psa_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO psa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO psa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO psa_app;
