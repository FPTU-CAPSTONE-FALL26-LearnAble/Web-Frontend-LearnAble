const fs = require("fs");
function edit(f, fn) {
  let s = fs.readFileSync(f, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  const rep = (a, b) => { if (!s.includes(a)) throw new Error(f + " missing " + a.slice(0, 70)); s = s.replace(a, () => b); };
  fn(rep, () => s, (v) => { s = v; });
  if (crlf) s = s.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, s);
}
edit("src/features/examiner/routes/QuestionSelectionRoute.tsx", (rep, get, set) => {
  const start = get().indexOf(`          {draft.plannedQuestionCount > 0 || plan.complete ? (`);
  const end = get().indexOf(`          ) : null}\n`, start) + `          ) : null}\n`.length;
  if (start < 0 || end < 20) throw new Error("plan block");
  set(get().slice(0, start) + get().slice(end));
  rep(`import { summarisePlan } from "@/features/examiner/workflow/examPlan";\n`, ``);
  rep(`  const plan = summarisePlan(draft);\n`, ``);
});
edit("src/features/examiner/routes/ExaminerRoutes.test.tsx", (rep) => {
  rep(`    expect(screen.getByText("0 of 4 planned questions · 4 to go")).toBeInTheDocument();\n`, ``);
  rep(`    expect(await screen.findByText("1 of 4 planned questions · 3 to go")).toBeInTheDocument();
    expect(screen.getByText(/2\.5 of 10 planned points/)).toBeInTheDocument();\n`, ``);
  rep(`it("scores selected questions with the planned points and shows progress against the plan"`, `it("scores selected questions with the planned points"`);
});
console.log("ok");
