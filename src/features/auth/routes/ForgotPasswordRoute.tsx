import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, BriefcaseBusiness, GraduationCap, Headphones, Info, KeyRound, Send } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { en } from "@/shared/strings/en";
import { AuthBrand, AuthShell, GoogleIcon } from "@/features/auth/components/AuthShell";

const recoverySchema = z.object({ email: z.string().trim().email(en.forgotPassword.emailInvalid).refine((value) => /@(fpt|fe)\.edu\.vn$/i.test(value), en.forgotPassword.emailInvalid) });
type RecoveryForm = z.infer<typeof recoverySchema>;

export function ForgotPasswordRoute() {
  useRouteAnnouncer(en.forgotPassword.pageTitle, en.forgotPassword.title);
  const [role, setRole] = useState("lecturer");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showDemoNotice, setShowDemoNotice] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RecoveryForm>({ resolver: zodResolver(recoverySchema) });
  const onSubmit = handleSubmit(() => { setShowUnavailable(true); setShowDemoNotice(false); announce(en.forgotPassword.unavailableMessage, { assertive: true }); });
  const showGoogleDemo = () => { setShowDemoNotice(true); setShowUnavailable(false); announce(en.auth.demoMessage); };

  return (
    <AuthShell campusImage="/assets/auth/campus-recovery-enhanced.png" imageOverlayClassName="bg-[image:var(--auth-login-image-overlay)]" heroTitle="Recover access to your learning account safely." heroBody="Protecting access to exam results, course materials, and accessibility tools across FPT University.">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-7"><AuthBrand /><Link to="/login" className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground hover:text-primary"><ArrowLeft aria-hidden className="size-4" /> {en.forgotPassword.backToLogin}</Link></header>
      <div className="mx-auto my-auto w-full max-w-2xl py-8">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-selected-bg)] text-primary"><KeyRound aria-hidden className="size-5" /></span><h1 tabIndex={-1} className="text-3xl font-bold tracking-[-0.025em] text-foreground outline-none">{en.forgotPassword.title}</h1></div>
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
          <fieldset className="space-y-3"><legend className="text-sm font-bold uppercase tracking-wide text-foreground">{en.forgotPassword.roleLabel} <span aria-hidden className="text-destructive">*</span></legend><RadioGroup value={role} onValueChange={setRole} className="grid gap-3 sm:grid-cols-2"><Label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-[var(--color-selected-bg)]"><RadioGroupItem value="lecturer" className="sr-only" /><GraduationCap aria-hidden className="size-5" /> {en.forgotPassword.lecturer}</Label><Label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-[var(--color-selected-bg)]"><RadioGroupItem value="staff" className="sr-only" /><BriefcaseBusiness aria-hidden className="size-5" /> {en.forgotPassword.staff}</Label></RadioGroup></fieldset>
          <div className="space-y-2"><Label htmlFor="recovery-email">{en.forgotPassword.email} <span aria-hidden className="text-destructive">*</span></Label><Input id="recovery-email" type="email" autoComplete="email" placeholder={en.forgotPassword.emailPlaceholder} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "recovery-email-error" : "recovery-email-hint"} {...register("email")} />{errors.email ? <p id="recovery-email-error" role="alert" className="text-sm font-medium text-destructive">{errors.email.message}</p> : <p id="recovery-email-hint" className="flex items-center gap-2 text-sm text-muted-foreground"><Info aria-hidden className="size-4 text-[var(--color-secondary)]" />{en.forgotPassword.emailHint}</p>}</div>
          <Button type="submit" size="lg" className="w-full"><Send aria-hidden />{en.forgotPassword.submit}</Button>
          {showUnavailable ? <Alert><Info aria-hidden /><AlertTitle>{en.forgotPassword.unavailableTitle}</AlertTitle><AlertDescription>{en.forgotPassword.unavailableMessage}</AlertDescription></Alert> : null}
          <div className="flex items-center gap-3" aria-hidden><Separator className="flex-1" /><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{en.auth.quickSignIn}</span><Separator className="flex-1" /></div>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={showGoogleDemo}><GoogleIcon /> {en.auth.google}</Button>
          {showDemoNotice ? <Alert><Info aria-hidden /><AlertTitle>{en.auth.demoTitle}</AlertTitle><AlertDescription>{en.auth.demoMessage}</AlertDescription></Alert> : null}
        </form>
        <aside className="mt-7 flex gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-sm text-foreground"><Headphones aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-bold">{en.forgotPassword.supportTitle}</h3><p className="mt-1 leading-relaxed text-muted-foreground">{en.forgotPassword.supportMessage}</p></div></aside>
      </div>
    </AuthShell>
  );
}
