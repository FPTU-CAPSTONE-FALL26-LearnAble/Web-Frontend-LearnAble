import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { plugin as shadcn } from "@shadcn/lint";

const FEATURES = [
  "auth",
  "accessibility",
  "practice",
  "assistant",
  "progress",
  "results",
];

export default tseslint.config(
  { ignores: ["dist", "public", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      shadcn,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // §8.2: jsx-a11y ở mức error, không dung thứ warning
      ...Object.fromEntries(
        Object.entries(jsxA11y.configs.recommended.rules).map(([rule]) => [
          rule,
          "error",
        ]),
      ),
      // label-has-for đã deprecated (đòi nesting VÀ id cùng lúc) — dùng rule kế nhiệm,
      // chấp nhận label lồng control HOẶC htmlFor.
      "jsx-a11y/label-has-for": "off",
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either" }],
      // Rule này không lần được liên kết htmlFor → label từ phía control (false positive
      // với textarea có label ngoài); label-has-associated-control đã phủ chiều ngược lại.
      "jsx-a11y/control-has-associated-label": "off",
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
        },
      ],
    },
  },
  {
    // §5 quy tắc 4: cây sync phải tự chứa — không import gì ngoài chính nó
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/api/*",
                "@/app/*",
                "@/features/*",
                "@/lib/*",
                "@/mocks/*",
                "@/styles/*",
              ],
              message:
                "Cây sync (src/shared) không được import ra ngoài chính nó — nếu cần, chuyển code vào shared hoặc truyền qua props.",
            },
          ],
        },
      ],
    },
  },
  // §6: feature không import feature anh em — code chung thì đưa lên shared/lib
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: FEATURES.filter((f) => f !== feature).map(
                (f) => `@/features/${f}/*`,
              ),
              message: `Feature "${feature}" không được import từ feature khác — code chung chuyển lên src/shared hoặc src/lib.`,
            },
          ],
        },
      ],
    },
  })),
);
