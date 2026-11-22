/* eslint-disable jsx-a11y/label-has-associated-control, shadcn/no-restyle -- Native wrapped labels remain associated; status rows follow existing table surfaces. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BellRing, Eye, Pencil, Search, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { archiveManagedNotification, createManagedNotification, deleteManagedNotification, getManagedNotifications, getNotificationRecipientCandidates, getNotificationRecipients, publishManagedNotification, updateManagedNotification, type ManagedNotification, type NotificationWriteInput } from "@/api/notifications";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/primitives/alert-dialog";
import { Checkbox } from "@/shared/ui/primitives/checkbox";

const initialForm: NotificationWriteInput = {
  title: "", content: "", notificationType: "GeneralAnnouncement", actionUrl: null, expiresAt: null,
  audience: { type: "University", userIds: [], roles: [] },
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Review the notification and try again.";

export function NotificationManagementRoute() {
  const client = useQueryClient();
  const [form, setForm] = useState<NotificationWriteInput>(initialForm);
  const [role, setRole] = useState("Student");
  const [editing, setEditing] = useState<ManagedNotification | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [recipientTarget, setRecipientTarget] = useState<ManagedNotification | null>(null);
  const [destructiveTarget, setDestructiveTarget] = useState<{ action: "delete" | "archive"; notification: ManagedNotification } | null>(null);
  const notifications = useQuery({ queryKey: ["managed-notifications"], queryFn: getManagedNotifications });
  const candidates = useQuery({ queryKey: ["notification-recipient-candidates", candidateSearch, candidateRole], queryFn: () => getNotificationRecipientCandidates(candidateSearch, candidateRole || undefined), enabled: form.audience.type === "Users" });
  const refresh = () => client.invalidateQueries({ queryKey: ["managed-notifications"] });
  const payload = (): NotificationWriteInput => ({
    ...form,
    title: form.title.trim(),
    content: form.content.trim(),
    actionUrl: form.actionUrl?.trim() || null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    audience: form.audience.type === "Users"
      ? { type: "Users", userIds: form.audience.userIds, roles: [] }
      : form.audience.type === "Roles"
        ? { type: "Roles", userIds: [], roles: [role] }
        : { type: "University", userIds: [], roles: [] },
  });
  const create = useMutation({
    mutationFn: () => createManagedNotification(payload()),
    onSuccess: async () => { setForm(initialForm); await refresh(); toast({ title: "Notification draft created", description: "Review the draft below before publishing it." }); },
    onError: (error) => toast({ title: "Draft could not be created", description: errorMessage(error) }),
  });
  const update = useMutation({
    mutationFn: () => updateManagedNotification(editing!.notificationId, editing!.revision, payload()),
    onSuccess: async () => { setEditing(null); setForm(initialForm); await refresh(); toast({ title: "Notification draft updated", description: "The latest content and audience have been saved." }); },
    onError: (error) => toast({ title: "Draft could not be updated", description: errorMessage(error) }),
  });
  const publish = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: string }) => publishManagedNotification(id, revision),
    onSuccess: async (result) => { await refresh(); toast({ title: "Notification published", description: `Delivered to ${result.recipientCount} recipients.` }); },
    onError: (error) => toast({ title: "Notification could not be published", description: errorMessage(error) }),
  });
  const recipients = useQuery({ queryKey: ["notification-recipients", recipientTarget?.notificationId, recipientTarget?.status], queryFn: () => getNotificationRecipients(recipientTarget!.notificationId, recipientTarget!.status === "Draft"), enabled: Boolean(recipientTarget) });
  const destructive = useMutation({ mutationFn: async () => { if (!destructiveTarget) return; const { notification, action } = destructiveTarget; if (action === "delete") await deleteManagedNotification(notification.notificationId, notification.revision); else await archiveManagedNotification(notification.notificationId, notification.revision); }, onSuccess: async () => { const action = destructiveTarget?.action; setDestructiveTarget(null); await refresh(); toast({ title: action === "delete" ? "Notification draft deleted" : "Notification archived" }); }, onError: (error) => toast({ title: "Notification could not be changed", description: errorMessage(error) }) });
  const canCreate = form.title.trim().length > 0 && form.content.trim().length > 0 && (form.audience.type !== "Users" || form.audience.userIds.length > 0);
  const beginEdit = (item: ManagedNotification) => {
    setEditing(item);
    setRole(item.audience.roles[0] ?? "Student");
    setForm({
      title: item.title,
      content: item.content,
      notificationType: item.notificationType as NotificationWriteInput["notificationType"],
      actionUrl: item.actionUrl,
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : null,
      audience: { type: item.audience.type as NotificationWriteInput["audience"]["type"], userIds: item.audience.userIds, roles: item.audience.roles },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return <main className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-semibold tracking-tight text-primary">Send notifications</h1><p className="mt-2 max-w-3xl text-muted-foreground">Create a draft announcement for your university or a selected role, then publish it when the content is ready.</p></header>
    <Card className="shadow-none">
      <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="size-5 text-primary" aria-hidden />{editing ? "Edit notification draft" : "New notification draft"}</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (editing) update.mutate(); else create.mutate(); }}>
          <label className="text-sm font-semibold lg:col-span-2">Title<Input className="mt-2" value={form.title} maxLength={250} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label>
          <label className="text-sm font-semibold lg:col-span-2">Message<Textarea className="mt-2 min-h-32" value={form.content} maxLength={20000} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} /></label>
          <label className="text-sm font-semibold">Type<Select value={form.notificationType} onValueChange={(notificationType) => setForm((value) => ({ ...value, notificationType: notificationType as NotificationWriteInput["notificationType"] }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GeneralAnnouncement">General announcement</SelectItem><SelectItem value="SystemMaintenance">System maintenance</SelectItem></SelectContent></Select></label>
          <label className="text-sm font-semibold">Audience<Select value={form.audience.type} onValueChange={(type) => setForm((value) => ({ ...value, audience: { type: type as NotificationWriteInput["audience"]["type"], userIds: [], roles: [] } }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="University">Everyone at the university</SelectItem><SelectItem value="Roles">One role</SelectItem><SelectItem value="Users">Selected people</SelectItem></SelectContent></Select></label>
          {form.audience.type === "Roles" ? <label className="text-sm font-semibold">Role<Select value={role} onValueChange={setRole}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Student">Students</SelectItem><SelectItem value="Lecturer">Lecturers</SelectItem><SelectItem value="Examiner">Examiners</SelectItem><SelectItem value="Staff">Staff</SelectItem></SelectContent></Select></label> : null}
          <label className="text-sm font-semibold">Expires at (optional)<Input className="mt-2" type="datetime-local" value={form.expiresAt ?? ""} onChange={(event) => setForm((value) => ({ ...value, expiresAt: event.target.value || null }))} /></label>
          {form.audience.type === "Users" ? <section className="space-y-3 rounded-xl border border-border p-4 lg:col-span-2" aria-label="Select notification recipients"><div className="flex flex-wrap items-end gap-3"><label className="min-w-56 flex-1 text-sm font-semibold">Find people<div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input className="pl-10" value={candidateSearch} placeholder="Search name, code or email" onChange={(event) => setCandidateSearch(event.target.value)} /></div></label><label className="w-48 text-sm font-semibold">Role filter<Select value={candidateRole || "all"} onValueChange={(value) => setCandidateRole(value === "all" ? "" : value)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="Student">Students</SelectItem><SelectItem value="Lecturer">Lecturers</SelectItem><SelectItem value="Examiner">Examiners</SelectItem><SelectItem value="Staff">Staff</SelectItem></SelectContent></Select></label></div><p className="text-sm text-muted-foreground">{form.audience.userIds.length} selected</p>{candidates.isPending ? <p role="status" className="py-5 text-center text-muted-foreground">Loading people…</p> : candidates.isError ? <p role="alert" className="text-destructive">People could not be loaded.</p> : <div className="max-h-72 overflow-y-auto rounded-lg border border-border">{candidates.data?.items.map((candidate) => { const checked = form.audience.userIds.includes(candidate.userId); return <label key={candidate.userId} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"><Checkbox checked={checked} onCheckedChange={(value) => setForm((current) => ({ ...current, audience: { ...current.audience, userIds: value === true ? [...current.audience.userIds, candidate.userId] : current.audience.userIds.filter((id) => id !== candidate.userId) } }))} /><span className="min-w-0 flex-1"><span className="block font-semibold">{candidate.name}</span><span className="block truncate text-xs text-muted-foreground">{candidate.userCode} · {candidate.role} · {candidate.email}</span></span></label>; })}</div>}</section> : null}
          <label className="text-sm font-semibold lg:col-span-2">Action URL (optional)<Input className="mt-2" value={form.actionUrl ?? ""} placeholder="/examiner/schedule" onChange={(event) => setForm((value) => ({ ...value, actionUrl: event.target.value }))} /></label>
          <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">{editing ? <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(initialForm); }}>Cancel editing</Button> : null}<Button disabled={!canCreate || create.isPending || update.isPending}>{editing ? update.isPending ? "Saving changes…" : "Save draft changes" : create.isPending ? "Creating draft…" : "Create notification draft"}</Button></div>
        </form>
      </CardContent>
    </Card>
    <Card className="shadow-none"><CardHeader><CardTitle>Notification drafts and history</CardTitle></CardHeader><CardContent>{notifications.isPending ? <p role="status" className="py-10 text-center text-muted-foreground">Loading notifications…</p> : notifications.isError ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">Notification history could not be loaded. <Button className="ml-2" variant="outline" onClick={() => notifications.refetch()}>Try again</Button></div> : notifications.data?.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Title</th><th className="p-3">Audience</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead><tbody>{notifications.data.items.map((item) => <tr key={item.notificationId} className="border-t border-border"><td className="p-3 font-semibold">{item.title}</td><td className="p-3">{item.audience.type === "Roles" ? item.audience.roles.join(", ") : item.audience.type === "Users" ? `${item.audience.userIds.length} selected people` : "University"}</td><td className="p-3">{item.notificationType}</td><td className="p-3">{item.status}</td><td className="p-3">{new Date(item.updatedAt).toLocaleString()}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setRecipientTarget(item)}><Eye aria-hidden />{item.status === "Draft" ? "Preview recipients" : "Recipients"}</Button>{item.status === "Draft" ? <><Button size="sm" variant="outline" onClick={() => beginEdit(item)}><Pencil aria-hidden />Edit</Button><Button size="sm" variant="outline" disabled={publish.isPending} onClick={() => publish.mutate({ id: item.notificationId, revision: item.revision })}><Send aria-hidden />Publish</Button><Button size="sm" variant="destructive" onClick={() => setDestructiveTarget({ action: "delete", notification: item })}><Trash2 aria-hidden />Delete</Button></> : item.status === "Published" ? <Button size="sm" variant="outline" onClick={() => setDestructiveTarget({ action: "archive", notification: item })}><Archive aria-hidden />Archive</Button> : null}</div></td></tr>)}</tbody></table></div> : <p className="py-10 text-center text-muted-foreground">No notification drafts have been created.</p>}</CardContent></Card>
    <Dialog open={Boolean(recipientTarget)} onOpenChange={(open) => { if (!open) setRecipientTarget(null); }}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{recipientTarget?.status === "Draft" ? "Recipient preview" : "Notification recipients"}</DialogTitle><DialogDescription>{recipientTarget?.title}. Draft previews are calculated by the Backend and do not send the notification.</DialogDescription></DialogHeader>{recipients.isPending ? <p role="status" className="py-8 text-center text-muted-foreground">Loading recipients…</p> : recipients.isError ? <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-destructive">Recipients could not be loaded.</div> : recipients.data?.items.length ? <div className="max-h-[60vh] overflow-auto rounded-xl border border-border"><table className="w-full min-w-[620px] text-sm"><thead className="sticky top-0 bg-muted text-left"><tr><th className="p-3">Recipient</th><th className="p-3">Code</th><th className="p-3">Role</th><th className="p-3">Delivery</th></tr></thead><tbody>{recipients.data.items.map((item) => <tr key={item.userId} className="border-t border-border"><td className="p-3"><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.email}</p></td><td className="p-3">{item.userCode}</td><td className="p-3">{item.role}</td><td className="p-3">{recipientTarget?.status === "Draft" ? "Will receive" : item.readAt ? "Read" : item.receivedAt ? "Delivered" : "Pending"}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-muted-foreground">No recipients match this notification audience.</p>}</DialogContent></Dialog>
    <AlertDialog open={Boolean(destructiveTarget)} onOpenChange={(open) => { if (!open) setDestructiveTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{destructiveTarget?.action === "delete" ? "Delete this notification draft?" : "Archive this published notification?"}</AlertDialogTitle><AlertDialogDescription>{destructiveTarget?.action === "delete" ? "The draft will be permanently removed without sending it." : "The notification remains in delivery history but will no longer be active."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep notification</AlertDialogCancel><AlertDialogAction variant={destructiveTarget?.action === "delete" ? "destructive" : "default"} disabled={destructive.isPending} onClick={() => destructive.mutate()}>{destructive.isPending ? "Updating…" : destructiveTarget?.action === "delete" ? "Delete draft" : "Archive notification"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}
