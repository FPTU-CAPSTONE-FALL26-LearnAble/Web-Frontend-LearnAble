import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Avatar, AvatarFallback } from "@/shared/ui/primitives/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { PageHeading } from "@/features/lecturer/shared/components/Workbench";

export function LecturerProfileRoute() {
  useRouteAnnouncer("Lecturer profile", "Lecturer profile");
  const user = useAuthStore((state) => state.user)!;
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
  return <div className="space-y-6"><PageHeading title="My profile" description="Your LearnAble account information." /><Card className="overflow-hidden border-border p-0 shadow-none"><div className="h-3 bg-primary" /><CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center"><Avatar className="size-24"><AvatarFallback className="bg-accent text-2xl font-extrabold text-primary">{initials || "L"}</AvatarFallback></Avatar><div><h1 className="text-3xl font-extrabold">{user.fullName}</h1><p className="mt-2 text-primary">{user.role}</p></div></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle>Account information</CardTitle></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" />Institutional email</dt><dd className="mt-2 font-bold">{user.email}</dd></div><div className="rounded-xl border border-border p-4"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4" />University ID</dt><dd className="mt-2 break-all font-bold">{user.universityId}</dd></div><div className="rounded-xl border border-border p-4"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4" />Role</dt><dd className="mt-2 font-bold">{user.role}</dd></div></dl><p className="mt-5 text-sm text-muted-foreground">Additional academic profile details are not available for this account.</p></CardContent></Card></div>;
}
