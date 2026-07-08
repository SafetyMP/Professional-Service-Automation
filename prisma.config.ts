import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl =
  process.env.DIRECT_URL ??
  "postgresql://postgres:postgres@localhost:5432/psa?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
