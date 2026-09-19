import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const allowedHex = new Set([
  "#ffffff",
  "#0f172a",
  "#475569",
  "#64748b",
  "#e2e8f0",
  "#f26f21",
  "#176eb4",
  "#16a34a",
  "#dc2626",
  "#eab308",
]);
const colorUtility = /\b(?:bg|text|border|ring|from|via|to)-(?:orange|amber|yellow|emerald|green|sky|blue|red|teal|cyan|lime|rose|indigo|violet|purple|fuchsia|pink)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d+)?\b/g;
const extensions = new Set([".css", ".ts", ".tsx"]);

function files(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const failures = [];
for (const file of files(root)) {
  if (!extensions.has(extname(file))) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    if (!allowedHex.has(match[0].toLowerCase())) failures.push(`${relative(root, file)}: disallowed ${match[0]}`);
  }
  for (const match of source.matchAll(colorUtility)) failures.push(`${relative(root, file)}: use semantic token instead of ${match[0]}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("✓ UI colors use the approved one-code-per-family palette.");
