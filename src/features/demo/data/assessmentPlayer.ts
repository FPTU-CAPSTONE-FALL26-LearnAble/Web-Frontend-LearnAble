import type {
  MatchTarget,
} from "@/shared/ui/patterns/exam/MatchingQuestion";
import type { PlayerQuestion } from "@/shared/ui/patterns/exam/assessment-player-types";

function matchTargets(labels: string[]): MatchTarget[] {
  return labels.map((label, index) => ({
    id: `target-${index}`,
    label,
    x: 8 + index * 29,
    y: 20 + (index % 2) * 42,
  }));
}

export const assessmentPlayerTitle = "HE MC, MR, T/F, Inline";

export const assessmentPlayerCandidate = {
  id: "[CANDIDATE ID]",
  name: "[CANDIDATE NAME]",
};

const featuredQuestions: PlayerQuestion[] = [
  {
    id: "architecture",
    kind: "single",
    title: "Multiple choice",
    prompt:
      "Which component provides a single entry point for routing requests to multiple backend services?",
    options: ["API Gateway", "Database index", "Feature flag", "Load test"],
  },
  {
    id: "security",
    kind: "multi",
    title: "Multiple response",
    prompt: "What is special about the year 1776?",
    options: [
      "Adam Smith published The Wealth of Nations in 1776.",
      "Social economics became a separate subject at the University.",
      "Economics was considered to be a separate subject area.",
      "Adam Smith became the first professor of women.",
    ],
    image: {
      src: "/assets/exam/economist-portrait.png",
      alt: "An 18th-century economist portrait",
    },
  },
  {
    id: "delivery",
    kind: "inline",
    title: "Inline choice",
    prompt: "Fill out the blanks.",
    segments: [
      { slotId: "subject" },
      " are actors that work together to maximize total value creation in a market.",
      "The point of a resource analysis is to ",
      { slotId: "purpose" },
      ".",
    ],
    slots: [
      {
        id: "subject",
        label: "First inline answer",
        placeholder: "Select alternative",
        options: [
          { value: "Companies", label: "Companies" },
          { value: "Suppliers", label: "Suppliers" },
          { value: "Competitors", label: "Competitors" },
        ],
      },
      {
        id: "purpose",
        label: "Second inline answer",
        placeholder: "Select alternative",
        options: [
          { value: "identify strengths", label: "identify strengths" },
          { value: "set prices", label: "set prices" },
          { value: "hire employees", label: "hire employees" },
        ],
      },
    ],
  },
  {
    id: "testing",
    kind: "boolean",
    title: "True / false",
    prompt: "A unit test should normally isolate one small piece of behaviour.",
  },
  {
    id: "data",
    kind: "single",
    title: "Multiple choice",
    prompt:
      "Which ACID property means a transaction happens completely or not at all?",
    options: ["Atomicity", "Consistency", "Isolation", "Durability"],
  },
  {
    id: "text-entry",
    kind: "text",
    title: "Text entry",
    prompt: "Name the HTTP status code commonly used for a successful request.",
  },
  {
    id: "numeric-entry",
    kind: "numeric",
    title: "Numeric entry",
    prompt: "How many bits are in one byte?",
    suffix: "bits",
  },
  {
    id: "drag-drop",
    kind: "drag",
    title: "Drag and drop",
    prompt: "Match each testing activity to its purpose.",
    options: ["Verify a small unit", "Verify components together"],
    targets: matchTargets(["Unit testing", "Integration testing"]),
  },
  {
    id: "graphic-gap",
    kind: "graphic-gap",
    title: "Graphic gap match",
    prompt: "Match each label to the appropriate area of this system diagram.",
    options: ["Client", "API", "Database"],
    targets: matchTargets(["Left area", "Centre area", "Right area"]),
  },
  {
    id: "inline-gap",
    kind: "inline-gap",
    title: "Inline gap match",
    prompt: "Match the development lifecycle activities to their descriptions.",
    options: ["Plan", "Build", "Evaluate"],
    targets: matchTargets(["First activity", "Second activity", "Third activity"]),
  },
  {
    id: "hotspot",
    kind: "hotspot",
    title: "Hotspot",
    prompt: "Select the region representing the application boundary.",
    hotspots: [
      { id: "A", label: "Application boundary", x: 28, y: 35 },
      { id: "B", label: "External service", x: 68, y: 25 },
      { id: "C", label: "Data store", x: 56, y: 72 },
    ],
  },
  {
    id: "graphic-text",
    kind: "graphic-text",
    title: "Graphic text entry",
    prompt: "Label the two marked components in the architecture diagram.",
    fields: [
      { id: "service", label: "Service", x: 10, y: 20 },
      { id: "store", label: "Data store", x: 56, y: 58 },
    ],
  },
  {
    id: "tf-mqr",
    kind: "composite",
    title: "True / false & multiple response",
    prompt: "Respond to both parts of this security scenario.",
    composite: {
      variant: "true-false-multiple-response",
      partOneLabel: "Part one: true or false",
      partTwoLabel: "Part two: select all appropriate controls",
      choices: [
        "Least privilege",
        "Multi-factor authentication",
        "Password sharing",
      ],
    },
  },
  {
    id: "numeric-mcq",
    kind: "composite",
    title: "Numeric entry & multiple choice",
    prompt: "Calculate the value, then choose the best interpretation.",
    composite: {
      variant: "numeric-multiple-choice",
      partOneLabel: "Part one: calculate the value",
      partTwoLabel: "Part two: choose an interpretation",
      choices: ["Valid result", "Insufficient evidence", "Calculation error"],
    },
  },
  {
    id: "inline-text",
    kind: "composite",
    title: "Inline choice & text entry",
    prompt: "Complete the statement and justify the choice.",
    composite: {
      variant: "inline-choice-text-entry",
      partOneLabel: "Part one: complete the statement",
      partTwoLabel: "Part two: explain your choice",
      choices: ["Accessible", "Secure", "Maintainable"],
    },
  },
  {
    id: "essay",
    kind: "essay",
    title: "Essay",
    prompt:
      "Evaluate the trade-offs between a monolith and microservices architecture for a small university team.",
  },
  {
    id: "text-area",
    kind: "textarea",
    title: "Text area",
    prompt:
      "Briefly reflect on the most important accessibility consideration in this assessment.",
  },
  {
    id: "upload",
    kind: "upload",
    title: "Upload assignment",
    prompt: "Upload your final design report or source archive.",
  },
];

type Practice = [prompt: string, options?: string[]];

/** Extra multiple-choice and true/false items so the demo runs at 50 questions. */
const practice: Practice[] = [
  ["Which keyword lets a Java class inherit from another class?", ["extends", "implements", "inherits", "super"]],
  ["An interface in Java can declare instance fields that change per object."],
  ["Which principle hides an object's internal state behind methods?", ["Encapsulation", "Inheritance", "Polymorphism", "Abstraction"]],
  ["Which collection keeps keys unique and maps each one to a value?", ["Map", "List", "Queue", "Stack"]],
  ["A constructor can have a return type in Java."],
  ["Which access modifier limits a member to its own class?", ["private", "protected", "public", "default"]],
  ["Which HTTP method is meant to be safe and idempotent?", ["GET", "POST", "PATCH", "CONNECT"]],
  ["Method overloading is resolved at compile time."],
  ["Which SQL clause filters rows after grouping?", ["HAVING", "WHERE", "ORDER BY", "LIMIT"]],
  ["Which data structure works first in, first out?", ["Queue", "Stack", "Tree", "Set"]],
  ["A static method can use the this keyword."],
  ["Which Git command records staged changes?", ["git commit", "git add", "git push", "git fetch"]],
  ["Which design pattern guarantees a class has one instance?", ["Singleton", "Factory", "Observer", "Adapter"]],
  ["An abstract class can have a constructor."],
  ["What is the time complexity of binary search on a sorted array?", ["O(log n)", "O(n)", "O(n log n)", "O(1)"]],
  ["Which exception type must be declared or handled in Java?", ["Checked exception", "Runtime exception", "Error", "Assertion"]],
  ["The finally block runs even when the try block returns."],
  ["Which normal form removes repeating groups from a table?", ["First normal form", "Second normal form", "Third normal form", "Boyce–Codd normal form"]],
  ["Which keyword prevents a method from being overridden?", ["final", "static", "const", "sealed"]],
  ["A Java String can be changed in place after it is created."],
  ["Which layer of an app usually holds business rules?", ["Service layer", "View layer", "Database driver", "Build script"]],
  ["Which status code means a resource was not found?", ["404", "200", "301", "500"]],
  ["Unit tests should depend on a live database to be reliable."],
  ["Which UML diagram shows classes and their relationships?", ["Class diagram", "Sequence diagram", "Use case diagram", "Activity diagram"]],
  ["Which keyword creates a new object in Java?", ["new", "create", "make", "init"]],
  ["Polymorphism lets one interface stand for many implementations."],
  ["Which sorting algorithm is stable and runs in O(n log n) in the worst case?", ["Merge sort", "Quick sort", "Selection sort", "Heap sort"]],
  ["Which principle says a class should have one reason to change?", ["Single responsibility", "Open/closed", "Liskov substitution", "Dependency inversion"]],
  ["Two objects that are equal must return the same hashCode."],
  ["Which tool builds and manages Java project dependencies?", ["Maven", "Postman", "Figma", "Docker Hub"]],
  ["Which loop always runs its body at least once?", ["do-while", "for", "while", "for-each"]],
  ["An ArrayList grows automatically when it runs out of space."],
];

const practiceQuestions: PlayerQuestion[] = practice.map(([prompt, options], i) =>
  options
    ? { id: `practice-${i + 1}`, kind: "single", title: "Multiple choice", prompt, options }
    : { id: `practice-${i + 1}`, kind: "boolean", title: "True / false", prompt },
);

/** 50 questions: the featured types, then practice items, ending on the upload task. */
export const assessmentPlayerQuestions: PlayerQuestion[] = [
  ...featuredQuestions.slice(0, -1),
  ...practiceQuestions,
  ...featuredQuestions.slice(-1),
];
