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
  {
    // Lecturer and examiner workbenches intentionally expose a denser set of
    // presentation treatments than the base student surfaces. Keep the
    // contract explicit and token-level: existing visual treatments remain
    // valid, while any new restyle still fails lint until it is reviewed here
    // or promoted to a canonical primitive variant.
    files: [
      "src/features/lecturer/**/*.{ts,tsx}",
      "src/features/examiner/**/*.{ts,tsx}",
      "src/features/staff/**/*.{ts,tsx}",
    ],
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            {
              pattern: "^Card$",
              allow: [
                "layout",
                "bg-background",
                "bg-card",
                "border",
                "border-2",
                "border-border",
                "border-success-border",
                "gap-0",
                "gap-6",
                "lecturer-active-exam-card",
                "lecturer-major-card",
                "p-0",
                "py-0",
                "py-6",
                "ring-0",
                "ring-1",
                "ring-border",
                "rounded-none",
                "rounded-xl",
                "shadow-none",
                "studio-editor",
                "studio-pane",
              ],
            },
            {
              pattern: "^CardContent$",
              allow: [
                "layout",
                "bg-card",
                "gap-5",
                "gap-6",
                "p-4",
                "p-5",
                "p-6",
                "px-0",
                "py-14",
                "py-16",
                "ring-1",
                "ring-foreground/10",
                "rounded-xl",
                "shadow-xs",
                "sm:p-6",
                "space-y-3",
                "space-y-4",
                "space-y-5",
                "space-y-6",
                "text-muted-foreground",
              ],
            },
            {
              pattern: "^CardHeader$",
              allow: ["layout", "border-b", "border-border", "pb-3", "px-0"],
            },
            {
              pattern: "^CardTitle$",
              allow: [
                "layout",
                "font-extrabold",
                "gap-2",
                "text-lg",
                "text-primary",
                "text-xl",
              ],
            },
            {
              pattern: "^Button$",
              allow: [
                "layout",
                "bg-accent",
                "bg-primary",
                "border-primary",
                "gap-2",
                "hover:bg-primary",
                "hover:text-primary-foreground",
                "px-3",
                "ring-1",
                "ring-primary",
                "text-primary",
                "text-primary-foreground",
                "text-white",
                "text-xs",
                "truncate",
              ],
            },
            {
              pattern: "^Avatar$",
              allow: ["layout", "after:rounded-md", "rounded-md"],
            },
            {
              pattern: "^AvatarImage$",
              allow: ["layout", "rounded-md"],
            },
            {
              pattern: "^AvatarFallback$",
              allow: [
                "layout",
                "bg-accent",
                "bg-primary",
                "font-bold",
                "font-extrabold",
                "rounded-md",
                "text-2xl",
                "text-primary",
                "text-primary-foreground",
              ],
            },
            { pattern: "^Badge$", allow: ["layout", "px-3"] },
            { pattern: "^Input$", allow: ["layout", "pl-10"] },
            {
              pattern: "^Label$",
              allow: [
                "layout",
                "gap-2",
                "gap-3.5",
                "leading-relaxed",
                "text-base",
              ],
            },
            {
              pattern: "^Progress$",
              allow: [
                "layout",
                "[&_[data-slot=progress-indicator]]:bg-primary",
                "bg-muted",
              ],
            },
            {
              pattern: "^RadioGroup$",
              allow: ["layout", "gap-2", "space-y-3"],
            },
          ],
        },
      ],
    },
  },
  {
    // Authentication uses labels as accessible selectable surfaces in the
    // recovery flow. Keep those reviewed treatments explicit so new visual
    // overrides still require a deliberate contract update.
    files: ["src/features/auth/**/*.{ts,tsx}"],
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            { pattern: "^Button$", allow: ["layout", "gap-2"] },
            { pattern: "^Input$", allow: ["layout", "pr-10"] },
            {
              pattern: "^Label$",
              allow: [
                "layout",
                "bg-background",
                "border",
                "border-input",
                "font-normal",
                "font-semibold",
                "gap-2",
                "has-[:focus-visible]:ring-3",
                "has-[:focus-visible]:ring-ring/40",
                "has-[[data-state=checked]]:bg-primary/10",
                "has-[[data-state=checked]]:border-primary",
                "px-4",
                "rounded-xl",
                "text-muted-foreground",
                "text-sm",
                "text-xs",
                "tracking-wide",
                "uppercase",
              ],
            },
            { pattern: "^RadioGroup$", allow: ["layout", "gap-3"] },
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
