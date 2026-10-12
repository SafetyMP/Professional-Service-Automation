import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

function fromEnvFile(name) {
  if (process.env[name] || !existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`));
    if (!match) continue;
    const raw = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (raw) process.env[name] = raw;
  }
}

fromEnvFile("DIRECT_URL");
fromEnvFile("DATABASE_URL");

const adminUrl = process.env.DIRECT_URL;
const appUrl = process.env.DATABASE_URL;
if (!adminUrl || !appUrl) {
  console.error(
    "DIRECT_URL (postgres superuser) and DATABASE_URL (psa_app) are required. docker compose up -d, copy .env.example to .env, then npm run tenancy.",
  );
  process.exit(1);
}

const orgA = "tenancy-org-a";
const orgB = "tenancy-org-b";
const userA = "tenancy-user-a";
const userB = "tenancy-user-b";
const emailA = "a@tenancy.example";
const emailB = "b@tenancy.example";

const admin = new pg.Client({ connectionString: adminUrl });
const app = new pg.Client({ connectionString: appUrl });

async function hashes(client) {
  const result = await client.query('SELECT email, "passwordHash" FROM "User" ORDER BY email');
  return result.rows;
}

try {
  await admin.connect();
  await admin.query("BEGIN");
  await admin.query(
    `INSERT INTO "Organization" (id, name, slug, "updatedAt")
     VALUES ($1, 'Tenancy A', 'tenancy-a', NOW()), ($2, 'Tenancy B', 'tenancy-b', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [orgA, orgB],
  );
  await admin.query(
    `INSERT INTO "User" (id, email, name, "passwordHash", "updatedAt")
     VALUES ($1, $3, 'A', 'hash-a', NOW()), ($2, $4, 'B', 'hash-b', NOW())
     ON CONFLICT (id) DO NOTHING`,
    [userA, userB, emailA, emailB],
  );
  await admin.query(
    `INSERT INTO "OrganizationMember" (id, "organizationId", "userId")
     VALUES ('tenancy-mem-a', $1, $3), ('tenancy-mem-b', $2, $4)
     ON CONFLICT (id) DO NOTHING`,
    [orgA, orgB, userA, userB],
  );
  await admin.query(
    `INSERT INTO "ResourceProfile"
       (id, "organizationId", "userId", "weeklyCapacityHrs", "costRate", "billRate", skills, "updatedAt")
     VALUES
       ('tenancy-prof-a', $1, $3, 40, 10, 100, '{}', NOW()),
       ('tenancy-prof-b', $2, $3, 40, 20, 200, '{}', NOW())`,
    [orgA, orgB, userA],
  );
  await admin.query("COMMIT");

  await app.connect();
  const none = await hashes(app);
  if (none.length !== 0) {
    throw new Error(`unset session saw ${none.length} users`);
  }

  await app.query("SELECT set_config('app.current_org_id', $1, false)", [orgB]);
  const rates = await app.query('SELECT "billRate"::float8 AS rate FROM "ResourceProfile"');
  if (rates.rows.length !== 1 || rates.rows[0].rate !== 200) {
    throw new Error(`org B saw rates ${JSON.stringify(rates.rows)}`);
  }
  const orgRows = await hashes(app);
  if (orgRows.length !== 1 || orgRows[0].passwordHash !== "hash-b") {
    throw new Error(`org B saw ${JSON.stringify(orgRows)}`);
  }

  await app.end();
  const login = new pg.Client({ connectionString: appUrl });
  await login.connect();
  await login.query("SELECT set_config('app.login_email', $1, false)", [emailA]);
  const loginRows = await hashes(login);
  await login.end();
  if (loginRows.length !== 1 || loginRows[0].passwordHash !== "hash-a") {
    throw new Error(`login email saw ${JSON.stringify(loginRows)}`);
  }

  console.log(
    "tenancy: no session sees 0 hashes; org B sees hash-b and bill rate 200; login email sees hash-a",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await admin
    .query(`DELETE FROM "ResourceProfile" WHERE id IN ('tenancy-prof-a', 'tenancy-prof-b')`)
    .catch(() => {});
  await admin
    .query(`DELETE FROM "OrganizationMember" WHERE id IN ('tenancy-mem-a', 'tenancy-mem-b')`)
    .catch(() => {});
  await admin.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [userA, userB]).catch(() => {});
  await admin.query(`DELETE FROM "Organization" WHERE id IN ($1, $2)`, [orgA, orgB]).catch(() => {});
  await admin.end().catch(() => {});
  await app.end().catch(() => {});
}
