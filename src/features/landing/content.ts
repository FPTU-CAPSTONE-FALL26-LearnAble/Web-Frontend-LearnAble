/**
 * Copy for the public site. It describes the barriers LearnAble is designed
 * around and how the product responds. It deliberately carries no figures:
 * the page states no number it cannot source.
 */

export const publicPages = [
  { to: "/", label: "Home", end: true },
  { to: "/challenges", label: "The challenge" },
  { to: "/solution", label: "Our solution" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/accessibility", label: "Accessibility" },
] as const;

/** The bottom key bar: one number per page, in menu order, and 0 to sign in. */
export const publicKeyActions = [
  ...publicPages.map((page, index) => ({ shortcut: String(index + 1), label: page.label, to: page.to })),
  { shortcut: "0", label: "Sign in", to: "/student/login" },
];

export const site = {
  name: "LearnAble",
  tagline: "Accessible learning and assessment for visually impaired university students.",
  signIn: "Sign in",
  homeLabel: "LearnAble home",
  navLabel: "Site pages",
  next: "Next",
  titleSuffix: " — LearnAble",
};

export const home = {
  title: "Home",
  eyebrow: "For visually impaired university students",
  heading: "Study, practise and take exams on your own terms.",
  intro:
    "LearnAble is a university platform built for students who use screen readers, audio, large text or high contrast. Lecturers prepare accessible questions and materials; examiners plan exams with each student's needs in mind; students learn, practise and sit exams independently.",
  imageAlt:
    "A visually impaired university learner using LearnAble with headphones, a laptop and Braille materials",
  primary: "Sign in to LearnAble",
  exploreTitle: "Find out more",
  exploreIntro: "Each page covers one question. Read them in order, or go straight to the one you need.",
  explore: [
    {
      to: "/challenges",
      title: "The challenge",
      body: "The barriers visually impaired students still meet in course materials, practice and exams.",
    },
    {
      to: "/solution",
      title: "Our solution",
      body: "How LearnAble answers each of those barriers, one by one.",
    },
    {
      to: "/how-it-works",
      title: "How it works",
      body: "What students, lecturers, examiners and university staff each do in LearnAble.",
    },
    {
      to: "/accessibility",
      title: "Accessibility",
      body: "How the platform is built for keyboard, screen reader and low-vision use, and how to adjust it now.",
    },
  ],
  studentTitle: "Already a student here?",
  studentBody:
    "Sign in with the account your university gave you. Your text size and colour theme follow you to every page and to the LearnAble desktop app.",
};

export const challenges = {
  title: "The challenge",
  eyebrow: "The challenge",
  heading: "Getting into university is only the first barrier.",
  intro:
    "A visually impaired student can be admitted, enrolled and welcome in class, and still be shut out by the tools the course runs on. These are the barriers LearnAble is designed around.",
  imageAlt: "A university classroom where a visually impaired student studies alongside classmates",
  items: [
    {
      title: "Course materials that cannot be read",
      what: "Slides are shared as pictures, readings as scanned PDFs, and diagrams with no description.",
      effect: "A screen reader finds nothing to read. The student waits for someone to convert the material, often after the class has moved on.",
    },
    {
      title: "Exams that depend on another person",
      what: "Without an accessible exam system, a helper reads each question aloud and writes down the student's answers.",
      effect: "The student loses privacy and independence, and the result can depend on how the helper reads and records.",
    },
    {
      title: "Practice that is out of reach",
      what: "Online quizzes rely on drag-and-drop, unlabelled buttons and layouts that only make sense by sight.",
      effect: "The student practises less before an exam than classmates do, and meets the exam format for the first time on exam day.",
    },
    {
      title: "Every tool works differently",
      what: "Each course and each office uses its own system, with its own layout and its own keys.",
      effect: "The student has to relearn how to move around every time, which costs time and attention that should go to the subject.",
    },
    {
      title: "Lecturers without the time or tools",
      what: "Making an audio version or an accessible copy of a question set is manual work, done for one student, often at the last minute.",
      effect: "Good intentions do not scale, and accessible versions arrive late or not at all.",
    },
    {
      title: "Accommodations arranged by hand",
      what: "Extra time, a separate room or a screen reader are agreed by email and tracked in spreadsheets.",
      effect: "One missed message on exam day can mean a student sits an exam without the support they were promised.",
    },
  ],
  whatLabel: "What happens",
  effectLabel: "What it means for the student",
  nextTitle: "See how LearnAble responds",
};

export const solution = {
  title: "Our solution",
  eyebrow: "Our solution",
  heading: "One platform that answers each barrier.",
  intro:
    "LearnAble does not add a separate, special system next to the real one. It makes the university's own learning and exam process work with screen readers, audio, keyboard and large text, for every role involved.",
  barrierLabel: "The barrier",
  answerLabel: "What LearnAble does",
  items: [
    {
      barrier: "Course materials that cannot be read",
      answer:
        "Lecturers publish materials in one place and can attach audio generated from the text. Students open them with a screen reader or keyboard, at the text size and colours they chose.",
    },
    {
      barrier: "Exams that depend on another person",
      answer:
        "Students sit exams in the LearnAble desktop app. Questions can be read aloud, every answer is given from the keyboard, and work is saved as the student goes, so no helper has to read or write for them.",
    },
    {
      barrier: "Practice that is out of reach",
      answer:
        "Practice sessions use the same player as real exams: the same layout, the same keys, the same way of moving between questions. Every practice is also a rehearsal for exam day, and the Progress page shows how each one went.",
    },
    {
      barrier: "Every tool works differently",
      answer:
        "Practice, exams, results, schedules and notifications share one consistent interface. A student's text size and colour theme are saved to their account and follow them on the web and on the desktop app.",
    },
    {
      barrier: "Lecturers without the time or tools",
      answer:
        "Lecturers build a question bank once and reuse it for practice and exams. Audio is generated from the question text instead of being recorded by hand for each student.",
    },
    {
      barrier: "Accommodations arranged by hand",
      answer:
        "Examiners record each candidate's accommodations with the exam itself, plan rooms and schedules around them, and follow every room live on exam day.",
    },
  ],
  limitsTitle: "What LearnAble does not replace",
  limitsBody:
    "LearnAble supports a university's disability services, lecturers and exam staff; it does not replace them. People still decide which accommodations a student needs. The platform makes sure those decisions reach the classroom and the exam room.",
  nextTitle: "See who does what",
};

export const howItWorks = {
  title: "How it works",
  eyebrow: "How it works",
  heading: "Every role works from the same information.",
  intro:
    "Each person sees a workspace built for their job. Behind it, preparation, exams and results stay connected, so nothing has to be copied from one system to another.",
  imageAlt: "A visually impaired student taking an accessible exam on a laptop with headphones",
  flowTitle: "From preparation to results",
  flow: [
    { title: "Prepare", body: "Lecturers write questions, prepare and seal exam papers, and publish materials with audio." },
    { title: "Plan", body: "Examiners plan schedules, rooms and candidate lists around each student's accommodations." },
    { title: "Take part", body: "Students practise, then sit their exams independently in the desktop app." },
    { title: "Review", body: "Results are graded and released, and students follow their progress over time." },
  ],
  rolesTitle: "What each role does",
  roles: [
    {
      title: "Students",
      items: [
        "Practise with the same player used in exams",
        "Sit exams with questions read aloud and keyboard answers",
        "See schedules, results and notifications in one place",
        "Keep their own text size and colour theme everywhere",
      ],
    },
    {
      title: "Lecturers",
      items: [
        "Build and reuse question banks for practice and exams",
        "Publish course materials with generated audio",
        "Prepare and seal exam papers",
        "Open practice sessions for their classes",
        "Grade answers that need a person to mark them",
      ],
    },
    {
      title: "Examiners",
      items: [
        "Receive sealed exam papers for each exam",
        "Plan schedules, rooms and candidate lists",
        "Record accommodations for each candidate",
        "Monitor rooms live and release results",
      ],
    },
    {
      title: "University staff",
      items: [
        "Manage accounts, departments, subjects and rooms",
        "Set the default exam policy",
        "Configure voice, shortcuts and gestures for the whole university",
      ],
    },
  ],
  nextTitle: "Read about accessibility",
};

export const accessibility = {
  title: "Accessibility",
  eyebrow: "Accessibility",
  heading: "Built to be used without sight, and with low vision.",
  intro:
    "Accessibility is not a mode you switch on in LearnAble. These rules apply to every page, for every role.",
  principlesTitle: "What we design for",
  principles: [
    {
      title: "Keyboard first",
      body: "Every action can be done from the keyboard, in a logical order, with a focus outline you can always see.",
    },
    {
      title: "Screen readers",
      body: "Pages use real headings, labels and landmarks, and changes such as a saved answer are announced in words.",
    },
    {
      title: "Large text",
      body: "Text can be enlarged to twice its size without the layout breaking or content being cut off.",
    },
    {
      title: "Colour themes",
      body: "Four colour themes, including yellow on black and pure black on white, can be chosen from any page.",
    },
    {
      title: "Never colour alone",
      body: "A state such as passed, saved or flagged is always written in words or shown with an icon, not by colour only.",
    },
    {
      title: "Large targets",
      body: "Buttons and links are big enough to hit easily, and errors are explained in plain text next to the field.",
    },
  ],
  tryTitle: "Adjust this site now",
  tryBody:
    "Change the text size and colours here or from the Accessibility button at the top of every page. If you are not signed in, your choice is kept in this browser. Once you sign in as a student, it is saved to your account.",
  saveFailed: "Your choice is shown here but could not be saved to your account. Try again.",
  feedbackTitle: "Found a barrier?",
  feedbackBody:
    "If part of LearnAble does not work with your assistive technology, tell your university's LearnAble contact or your lecturer, so the project team can fix it.",
};
