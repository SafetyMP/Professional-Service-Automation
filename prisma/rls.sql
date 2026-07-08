-- Row-Level Security for tenant isolation
-- Apply after Prisma migrations: psql -f prisma/rls.sql

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Client', 'Project', 'Task', 'ProjectMember', 'ResourceProfile',
    'Allocation', 'TimeEntry', 'Invoice', 'InvoiceLine', 'ExpenseEntry', 'AuditLog',
    'Milestone', 'ExpenseCategory'
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO psa_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO psa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO psa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO psa_app;
