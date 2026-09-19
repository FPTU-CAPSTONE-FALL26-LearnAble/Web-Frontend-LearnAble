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
  ["--color-action-text", "--color-action", 4.5, "orange action label / action"],
  ["--color-secondary", "--color-surface", 4.5, "secondary / surface"],
  ["--color-text", "--color-bg", 4.5, "success status label", 0.14, "--color-success"],
  ["--color-text", "--color-bg", 4.5, "danger status label", 0.14, "--color-error"],
  ["--color-secondary", "--color-bg", 4.5, "info status", 0.1],
  ["--color-text", "--color-bg", 7, "chữ chính / nền"],
  ["--color-text", "--color-surface", 7, "chữ chính / surface"],
  ["--color-text-muted", "--color-bg", 7, "chữ phụ / nền"],
  ["--color-primary", "--color-bg", 7, "link-chữ primary / nền"],
  ["--color-primary-text", "--color-primary", 7, "chữ nút / nền nút primary"],
  ["--color-primary-text", "--color-primary", 7, "chữ nút / nền nút hover"],
  ["--color-error", "--color-bg", 4.5, "chữ lỗi / nền"],
  ["--color-error-text", "--color-error", 4.5, "chữ nút lỗi / nền lỗi"],
  ["--color-text", "--color-bg", 4.5, "success status text", 0.14, "--color-success"],
  ["--color-text", "--color-bg", 4.5, "warning status text", 0.14, "--color-warning"],
  ["--color-selected-text", "--color-bg", 7, "chữ được chọn / nền được chọn", 0.1, "--color-action"],
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

function mix(over, under, alpha) {
  const channels = [1, 3, 5].map((index) =>
    Math.round(parseInt(over.slice(index, index + 2), 16) * alpha + parseInt(under.slice(index, index + 2), 16) * (1 - alpha)),
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

let failed = false;
for (const [fg, bg, min, label, alpha, mixToken] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`✗ thiếu token: ${fg} hoặc ${bg}`);
    failed = true;
    continue;
  }
  const background = alpha ? mix(tokens[mixToken ?? fg], tokens[bg], alpha) : tokens[bg];
  const ratio = contrast(tokens[fg], background);
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${tokens[fg]} trên ${background} = ${ratio.toFixed(2)}:1 (cần ≥ ${min}:1)`,
  );
}

if (failed) {
  console.error("\nCó cặp token không đạt tương phản — sửa tokens.css trước khi merge.");
  process.exit(1);
}
console.log("\nTất cả cặp token đạt yêu cầu tương phản.");
