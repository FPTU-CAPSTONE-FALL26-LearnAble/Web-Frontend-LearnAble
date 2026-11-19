import type {
  CodeRunResult,
  PlayerQuestion,
} from "@/shared/ui/patterns/exam/assessment-player-types";

export const codingWorkspaceTitle = "PRO192 practice: C programming";

const sumEven: PlayerQuestion = {
  id: "coding-sum-even",
  kind: "coding",
  title: "Coding (C)",
  prompt: [
    "Read a whole number `n`, then `n` integers. Print the sum of the integers that are **even**.",
    "",
    "Negative numbers and 0 count too: an integer is even when it divides by 2 with no remainder.",
    "",
    "- The first line holds `n` (1 ≤ n ≤ 1000).",
    "- The second line holds `n` integers between −1,000,000 and 1,000,000, separated by spaces.",
    "- Print one line with the sum.",
  ].join("\n"),
  coding: {
    language: "c",
    title: "Sum of even numbers",
    samples: [
      { input: "5\n1 2 3 4 5", output: "6" },
      { input: "3\n7 9 11", output: "0" },
      { input: "4\n-2 4 0 3", output: "2" },
    ],
    starterCode: [
      "#include <stdio.h>",
      "",
      "int main(void) {",
      "    int n;",
      '    scanf("%d", &n);',
      "    // Read n integers and print the sum of the even ones.",
      "",
      "    return 0;",
      "}",
      "",
    ].join("\n"),
  },
};

const countVowels: PlayerQuestion = {
  id: "coding-count-vowels",
  kind: "coding",
  title: "Coding (C)",
  prompt: [
    "Read one line of text and print how many vowels it contains.",
    "",
    "The vowels are *a, e, i, o, u*, in lower or upper case. Every other character, including `y`, is not a vowel.",
    "",
    "```",
    "Input:  Hello World",
    "Output: 3",
    "```",
  ].join("\n"),
  coding: {
    language: "c",
    title: "Count the vowels",
    samples: [
      { input: "hello world", output: "3" },
      { input: "AEIOU xyz", output: "5" },
      { input: "rhythm", output: "0" },
    ],
    starterCode: [
      "#include <stdio.h>",
      "",
      "int main(void) {",
      "    char line[256];",
      "    fgets(line, sizeof line, stdin);",
      "    // Count the vowels in line and print the count.",
      "",
      "    return 0;",
      "}",
      "",
    ].join("\n"),
  },
};

const reverseDigits: PlayerQuestion = {
  id: "coding-reverse-digits",
  kind: "coding",
  title: "Coding (C)",
  prompt: [
    "Read a non-negative whole number `n` and print its digits in reverse order.",
    "",
    "Leading zeros in the result are dropped, so `120` becomes `21`.",
    "",
    "- The only line holds `n` (0 ≤ n ≤ 2,000,000,000).",
    "- Print one line with the reversed number.",
  ].join("\n"),
  coding: {
    language: "c",
    title: "Reverse the digits",
    samples: [
      { input: "1234", output: "4321" },
      { input: "120", output: "21" },
      { input: "0", output: "0" },
    ],
    starterCode: [
      "#include <stdio.h>",
      "",
      "int main(void) {",
      "    long n;",
      '    scanf("%ld", &n);',
      "    // Print the digits of n in reverse order.",
      "",
      "    return 0;",
      "}",
      "",
    ].join("\n"),
  },
};

const largestOfThree: PlayerQuestion = {
  id: "coding-largest-of-three",
  kind: "coding",
  title: "Coding (C)",
  prompt: [
    "Read three integers and print the largest one.",
    "",
    "- The only line holds three integers between −1,000,000 and 1,000,000, separated by spaces.",
    "- Print one line with the largest value.",
  ].join("\n"),
  coding: {
    language: "c",
    title: "Largest of three",
    samples: [
      { input: "3 9 4", output: "9" },
      { input: "-5 -2 -8", output: "-2" },
      { input: "7 7 1", output: "7" },
    ],
    starterCode: [
      "#include <stdio.h>",
      "",
      "int main(void) {",
      "    int a, b, c;",
      '    scanf("%d %d %d", &a, &b, &c);',
      "    // Print the largest of a, b and c.",
      "",
      "    return 0;",
      "}",
      "",
    ].join("\n"),
  },
};

/** A coding-only exam: the coding workspace is used for coding assessments. */
export const codingWorkspaceQuestions: PlayerQuestion[] = [
  sumEven,
  countVowels,
  reverseDigits,
  largestOfThree,
];

export const firstCodingQuestionId = sumEven.id;

/** Outputs the demo "sandbox" pretends the code printed, per sample. */
const judges: Record<string, (code: string) => string[]> = {
  [sumEven.id]: (code) => {
    if (!/%\s*2/.test(code) || !/printf/.test(code)) return ["", "", ""];
    // A common mistake: skipping negative even numbers.
    if (/>\s*0/.test(code)) return ["6", "0", "4"];
    return ["6", "0", "2"];
  },
  [countVowels.id]: (code) => {
    if (
      !/printf/.test(code) ||
      !/['"]?[aeiou]/i.test(code.replace(/printf[^;]*;/g, ""))
    ) {
      return ["", "", ""];
    }
    // Only lower-case checks miss "AEIOU".
    if (!/'[AEIOU]'|toupper|tolower|[A-Z]{5}/.test(code))
      return ["3", "0", "0"];
    return ["3", "5", "0"];
  },
  [reverseDigits.id]: (code) => {
    if (!/%\s*10/.test(code) || !/printf/.test(code)) return ["", "", ""];
    // Stopping the loop at n > 0 before printing prints nothing for 0.
    if (!/do\s*{|==\s*0/.test(code)) return ["4321", "21", ""];
    return ["4321", "21", "0"];
  },
  [largestOfThree.id]: (code) => {
    if (!/printf/.test(code) || !/>/.test(code)) return ["", "", ""];
    // Starting the maximum at 0 fails when every value is negative.
    if (/max\s*=\s*0\b/.test(code)) return ["9", "0", "7"];
    return ["9", "-2", "7"];
  },
};

const STATEMENT_START =
  /^(?:[A-Za-z_][\w.[\]]*\s*(?:\+\+|--|[+\-*/%]?=)|return\b|printf\b|scanf\b|fgets\b|int\b|char\b|long\b|double\b)/;

/** Demo-only checks standing in for gcc: `#error`, a missing `;`, unbalanced braces. */
function compileErrors(code: string) {
  const errors: { line: number; column?: number; message: string }[] = [];
  const lines = code.split("\n");
  lines.forEach((raw, index) => {
    const line = raw.replace(/\/\/.*$/, "").trimEnd();
    const trimmed = line.trim();
    const directive = /^#error\s*(.*)$/.exec(trimmed);
    if (directive) {
      errors.push({
        line: index + 1,
        message: `#error ${directive[1]}`.trim(),
      });
      return;
    }
    if (
      STATEMENT_START.test(trimmed) &&
      !/[;{},]$/.test(trimmed) &&
      !/^(?:for|if|while|else|switch)\b/.test(trimmed)
    ) {
      errors.push({
        line: index + 1,
        column: line.length + 1,
        message: "expected ';' at end of statement",
      });
    }
  });
  const opens = (code.match(/{/g) ?? []).length;
  const closes = (code.match(/}/g) ?? []).length;
  if (opens > closes) {
    errors.push({
      line: lines.length,
      message: "expected '}' at end of input",
    });
  }
  return errors;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stand-in for the backend sandbox (spec §3.2). Type `// fail-run` anywhere in
 * the code to see the "couldn't run" path.
 */
export async function runDemoCode(
  questionId: string,
  code: string,
): Promise<CodeRunResult> {
  await delay(900);
  if (/\/\/\s*fail-run/.test(code)) throw new Error("Sandbox unavailable");
  const question = codingWorkspaceQuestions.find(
    (item) => item.id === questionId,
  );
  const samples = question?.coding?.samples ?? [];
  const errors = compileErrors(code);
  if (errors.length) return { status: "compileError", errors };
  const outputs = judges[questionId]?.(code) ?? samples.map(() => "");
  return {
    status: "compiled",
    tests: samples.map((sample, index) => ({
      index: index + 1,
      outcome: outputs[index] === sample.output ? "passed" : "failed",
      input: sample.input,
      expectedOutput: sample.output,
      actualOutput: outputs[index] ?? "",
    })),
  };
}
