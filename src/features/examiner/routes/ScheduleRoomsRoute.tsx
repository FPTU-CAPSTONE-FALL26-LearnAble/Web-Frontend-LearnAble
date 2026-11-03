import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Grid3X3, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { autoAssignSeats } from "@/api/exams";
import { useSchedulePreparationDraft } from "@/features/examiner/workflow/examPreparation";
import { ApiNotice, PreparationHeader, PreparationSteps } from "@/features/examiner/workflow/PreparationShell";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

const steps = ["Shift & room", "Add students & lecturers", "Automatic seating", "Validate & publish"];

export function ScheduleRoomsRoute() {
  const navigate = useNavigate();
  const { draft } = useSchedulePreparationDraft();
  const scheduleIds = draft.scheduleRooms.length ? draft.scheduleRooms.map((item) => item.examScheduleId) : [draft.examScheduleId].filter(Boolean);
  const assign = useMutation({ mutationFn: async () => Promise.all(scheduleIds.map(async (scheduleId) => ({ scheduleId, seats: await autoAssignSeats(scheduleId) }))), onSuccess: (results) => { const count = results.reduce((total, item) => total + item.seats.length, 0); toast({ title: "Seats assigned automatically", description: `${count} candidates across ${results.length} room${results.length === 1 ? "" : "s"} now have assigned seats.` }); navigate("/examiner/schedule/new/readiness"); } });
  if (!draft.examScheduleId) return <ApiNotice tone="error">No draft schedule is available for seating. <Link className="font-semibold underline" to="/examiner/schedule/new/details">Create one first</Link>.</ApiNotice>;
  return <main className="space-y-6"><PreparationHeader title="Automatically allocate seats" description="LearnAble assigns seats for the selected room and enrolled candidates. You do not need to place each student manually." /><PreparationSteps steps={steps} current={2} />
    {assign.error ? <ApiNotice tone="error">Automatic seating failed. Check room capacity, configured seats and candidate enrollments.</ApiNotice> : null}
    <section className="examiner-major mx-auto max-w-3xl p-8 text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Grid3X3 className="size-8" /></div><h2 className="mt-5 text-2xl font-semibold">Let LearnAble allocate every room</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">The Backend allocates seats independently from each room’s enrolled candidates and available seat map.</p><dl className="mx-auto mt-8 grid max-w-xl gap-4 text-left sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><dt className="text-sm text-muted-foreground">Room schedules</dt><dd className="mt-1 text-2xl font-semibold">{scheduleIds.length}</dd></div><div className="rounded-xl border border-border p-4"><dt className="text-sm text-muted-foreground">Assignment mode</dt><dd className="mt-1 font-semibold">Automatic per room</dd></div></dl><Button className="mt-8" size="lg" disabled={assign.isPending} onClick={() => assign.mutate()}><Sparkles />{assign.isPending ? "Allocating seats…" : "Auto-assign seats for all rooms"}<ArrowRight /></Button></section>
    <div><Button variant="outline" asChild><Link to="/examiner/schedule/new/candidates"><ArrowLeft />Back to assignments</Link></Button></div>
  </main>;
}
