import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: [
      { find: "@/generated/prisma/client", replacement: path.resolve(__dirname, "./generated/prisma/client") },
      { find: "@/lib", replacement: path.resolve(__dirname, "./lib") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
