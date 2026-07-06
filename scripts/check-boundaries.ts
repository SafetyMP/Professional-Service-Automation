import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const forbidden: Array<[string, RegExp]> = [
  ["lib/time", /from ["']@\/lib\/billing\/(?!index)/],
  ["lib/clients", /from ["']@\/lib\/billing/],
  ["lib/projects", /from ["']@\/lib\/billing/],
  ["lib/resources", /from ["']@\/lib\/billing/],
  ["lib/expenses", /from ["']@\/lib\/billing/],
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) return [full];
    return [];
  });
}

let failed = false;

for (const [module, pattern] of forbidden) {
  const moduleDir = path.join(ROOT, module);
  if (!fs.existsSync(moduleDir)) continue;
  for (const file of walk(moduleDir)) {
    const content = fs.readFileSync(file, "utf8");
    if (pattern.test(content)) {
      console.error(`Boundary violation: ${file} imports forbidden module`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Module boundaries: ok");
