/**
 * Kiểm tra tương phản WCAG cho các cặp token trong shared/tokens/tokens.css (§8.1).
 * Chữ ≥ 7:1 (AAA), UI phi văn bản ≥ 4.5:1. Chạy trong CI — không kiểm bằng mắt.
 *
 *   node scripts/check-contrast.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../src/shared/tokens/tokens.css"), "utf8");

const tokens = {};
for (const match of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  tokens[match[1]] = match[2];
}

// [foreground, background, mức tối thiểu, mô tả]
const PAIRS = [
  ["--color-text", "--color-bg", 7, "chữ chính / nền"],
  ["--color-text", "--color-surface", 7, "chữ chính / surface"],
  ["--color-text-muted", "--color-bg", 7, "chữ phụ / nền"],
  ["--color-primary", "--color-bg", 7, "link-chữ primary / nền"],
  ["--color-primary-text", "--color-primary", 7, "chữ nút / nền nút primary"],
  ["--color-primary-text", "--color-primary-hover", 7, "chữ nút / nền nút hover"],
  ["--color-error", "--color-bg", 7, "chữ lỗi / nền"],
  ["--color-error-text", "--color-error", 7, "chữ nút lỗi / nền lỗi"],
  ["--color-success", "--color-bg", 7, "chữ thành công / nền"],
  ["--color-warning-text", "--color-warning-bg", 7, "chữ cảnh báo / nền cảnh báo"],
  ["--color-selected-text", "--color-selected-bg", 7, "chữ được chọn / nền được chọn"],
  ["--color-border", "--color-bg", 4.5, "viền (phi văn bản) / nền"],
  ["--color-focus", "--color-bg", 4.5, "focus ring / nền trang"],
  ["--color-focus", "--color-surface", 4.5, "focus ring / surface"],
];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

let failed = false;
for (const [fg, bg, min, label] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`✗ thiếu token: ${fg} hoặc ${bg}`);
    failed = true;
    continue;
  }
  const ratio = contrast(tokens[fg], tokens[bg]);
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${tokens[fg]} trên ${tokens[bg]} = ${ratio.toFixed(2)}:1 (cần ≥ ${min}:1)`,
  );
}

if (failed) {
  console.error("\nCó cặp token không đạt tương phản — sửa tokens.css trước khi merge.");
  process.exit(1);
}
console.log("\nTất cả cặp token đạt yêu cầu tương phản.");
