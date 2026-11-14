import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(projectRoot, "src");
const extensions = new Set([".ts", ".tsx"]);
const failures = [];

function files(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

if (existsSync(join(sourceRoot, "components", "ui"))) {
  failures.push("src/components/ui must not exist; use src/shared/ui/primitives");
}

for (const file of files(sourceRoot)) {
  if (!extensions.has(extname(file))) continue;
  const source = readFileSync(file, "utf8");
  const name = relative(projectRoot, file);

  if (/from\s+["']cn["']/.test(source)) {
    failures.push(`${name}: import cn from @/shared/ui/cn`);
  }
  if (/@\/components\/ui/.test(source)) {
    failures.push(`${name}: import primitives from @/shared/ui/primitives`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("✓ UI imports use the canonical shared primitive architecture.");
