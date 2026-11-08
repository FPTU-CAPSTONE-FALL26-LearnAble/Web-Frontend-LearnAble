/* eslint-disable jsx-a11y/label-has-associated-control, shadcn/no-restyle -- Selectable rows wrap their named checkbox; route follows the incumbent Card composition. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Clock3 } from "lucide-react";
import { useState } from "react";
import { getLecturerAvailability, getLecturerInvigilationPeriod, getLecturerInvigilationPeriods, updateLecturerAvailability } from "@/api/invigilation";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";

export function InvigilationAvailabilityRoute() {
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState("");
  const [slotIds, setSlotIds] = useState<string[] | null>(null);
  const periods = useQuery({ queryKey: ["lecturer-invigilation-periods"], queryFn: getLecturerInvigilationPeriods });
  const detail = useQuery({ queryKey: ["lecturer-invigilation-period", periodId], queryFn: () => getLecturerInvigilationPeriod(periodId), enabled: Boolean(periodId) });
  const availability = useQuery({ queryKey: ["lecturer-availability", periodId], queryFn: () => getLecturerAvailability(periodId), enabled: Boolean(periodId) });
  const selected = slotIds ?? availability.data?.slotIds ?? [];
  const save = useMutation({
    mutationFn: () => updateLecturerAvailability(periodId, selected, availability.data?.revision),
    onSuccess: async () => {
      setSlotIds(null);
      await queryClient.invalidateQueries({ queryKey: ["lecturer-availability", periodId] });
      toast({ title: "Availability saved", description: "Examiners can now consider these slots when allocating invigilators." });
    },
  });
  return <main className="space-y-6">
    <header className="border-b border-border pb-5"><h1 className="text-3xl font-semibold tracking-tight text-primary">Invigilation availability</h1><p className="mt-2 text-muted-foreground">Register the exam slots you are available to supervise. Final assignments are created by the Examiner.</p></header>
    <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="size-5 text-primary" />Registration period</CardTitle></CardHeader><CardContent><Select value={periodId} onValueChange={(value) => { setPeriodId(value); setSlotIds(null); }}><SelectTrigger aria-label="Invigilation registration period"><SelectValue placeholder="Select a registration period" /></SelectTrigger><SelectContent>{periods.data?.items.map((period) => <SelectItem key={period.periodId} value={period.periodId}>{period.name} · {period.status}</SelectItem>)}</SelectContent></Select></CardContent></Card>
    {detail.data ? <Card className="shadow-none"><CardHeader><CardTitle>{detail.data.period.name}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Choose every slot you can attend. You may update the selection while registration is open.</p><fieldset className="grid gap-3 md:grid-cols-2"><legend className="sr-only">Available invigilation slots</legend>{detail.data.slots.map((slot) => { const checked = selected.includes(slot.slotId); return <label key={slot.slotId} className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"><Checkbox checked={checked} disabled={!availability.data?.canRegister} onCheckedChange={() => setSlotIds(checked ? selected.filter((id) => id !== slot.slotId) : [...selected, slot.slotId])} /><span><strong className="block">{slot.name}</strong><span className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{new Date(slot.startsAt).toLocaleString()} – {new Date(slot.endsAt).toLocaleTimeString()}</span></span></label>; })}</fieldset>{availability.data?.canRegister ? <Button disabled={save.isPending || slotIds === null} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save availability"}</Button> : <p role="status" className="rounded-xl border border-warning bg-warning p-4 text-warning-foreground">Registration is not currently open for this period.</p>}</CardContent></Card> : null}
  </main>;
}
