import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, BookOpenCheck, ClipboardList, Eye, EyeOff, Info, MonitorCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/ui/primitives/alert";
import { Button } from "@/shared/ui/primitives/button";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { ApiFailure } from "@/api/client";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { en } from "@/shared/strings/en";
import { GoogleIcon } from "@/features/auth/components/AuthShell";
import { BrandIdentity } from "@/components/BrandIdentity";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { useLogin } from "@/features/auth/api/useLogin";
import { getRoleDestination } from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, en.auth.errIdentifierRequired),
  password: z.string().min(1, en.auth.errPasswordRequired),
  remember: z.boolean(),
});
type LoginForm = z.infer<typeof loginFormSchema>;

const UNSUPPORTED_ROLE = "This account role is not supported by this web application.";

/** What staff do here, in one line each: no figures, nothing the product does not do. */
const highlights = [
  { icon: BookOpenCheck, title: "Prepare", body: "Question banks, course materials and audio, reused for practice and exams." },
  { icon: ClipboardList, title: "Plan", body: "Exam papers, schedules, rooms and each candidate's accommodations." },
  { icon: MonitorCheck, title: "Run", body: "Live room monitoring on exam day, then grading and result release." },
];

function describeLoginError(error: unknown) {
  if (error instanceof ApiFailure) {
    if (error.serverMessage) return error.serverMessage;
    if (error.detail.kind === "unauthorized") return en.auth.errInvalid;
    if (error.detail.kind === "network") return en.auth.errNetwork;
  }
  return en.auth.errServer;
}

export function getPostLoginDestination(role: string, requestedPath?: string) {
  return getRoleDestination(role, requestedPath);
}

/**
 * The sign-in for lecturers, examiners, staff and administrators: a standard,
 * quiet login for sighted staff. Labels, required fields, spoken errors and the
 * student link stay, so it still works with a keyboard and a screen reader.
 */
export function LoginRoute() {
  useRouteAnnouncer(en.auth.pageTitle, en.auth.title);
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const logout = useAuthStore((state) => state.logout);
  const [showPassword, setShowPassword] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: "", password: "", remember: false },
  });
  const serverError = loginMutation.isError
    ? describeLoginError(loginMutation.error)
    : null;
  const visibleError = roleError ?? serverError;
  const onSubmit = handleSubmit((values) => {
    setRoleError(null);
    loginMutation.mutate(values, {
      onSuccess: (user) => {
        const from = (location.state as { from?: string } | null)?.from;
        const destination = getPostLoginDestination(user.role, from);
        if (!destination) {
          logout();
          // Written on the page as well as spoken, so nobody is left guessing.
          setRoleError(UNSUPPORTED_ROLE);
          announce(UNSUPPORTED_ROLE, { assertive: true });
          return;
        }
        navigate(destination, { replace: true });
      },
      onError: (error) =>
        announce(describeLoginError(error), { assertive: true }),
    });
  });
  const showGoogleDemo = () =>
    announce("Google sign-in will be available when identity integration is enabled.");

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <SkipLink />

      {/* The form comes first in reading and Tab order; the brand panel only sits to its left on wide screens. */}
      <main id="main" className="flex min-h-dvh flex-col px-6 py-6 sm:px-10 lg:col-start-2 lg:row-start-1 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" aria-label="Go to LearnAble home page" className="shrink-0 rounded-md">
            <BrandIdentity />
          </Link>
          <Link
            to="/student/login"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Student? Use the accessible sign-in
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <section aria-labelledby="login-heading" className="flex w-full max-w-sm flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 id="login-heading" className="text-3xl font-semibold tracking-tight outline-none">
                Welcome back
              </h1>
              <p className="text-muted-foreground">Sign in to your LearnAble staff workspace.</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="identifier">{en.auth.identifier}</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder={en.auth.identifierPlaceholder}
                  required
                  aria-invalid={Boolean(errors.identifier)}
                  aria-describedby={errors.identifier ? "identifier-error" : undefined}
                  {...register("identifier")}
                />
                {errors.identifier ? (
                  <p id="identifier-error" role="alert" className="text-sm font-medium text-destructive">
                    {errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">{en.auth.password}</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {en.auth.forgotPassword}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-10"
                    required
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    aria-label={en.auth.showPassword}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-e-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {showPassword ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" role="alert" className="text-sm font-medium text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <Controller
                name="remember"
                control={control}
                render={({ field }) => (
                  <div className="flex min-h-11 items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <Label htmlFor="remember" className="font-normal">
                      {en.auth.remember}
                    </Label>
                  </div>
                )}
              />

              {visibleError ? (
                <Alert variant="destructive">
                  <Info aria-hidden />
                  <AlertTitle>{en.common.error}</AlertTitle>
                  <AlertDescription>{visibleError}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" size="xl" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? en.auth.submitting : en.auth.submit}
              </Button>
            </form>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" size="xl" className="w-full" onClick={showGoogleDemo}>
              <GoogleIcon />
              Continue with university Google account
            </Button>
          </section>
        </div>

        <p className="mx-auto flex max-w-sm gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          Accounts are provided by your university. Contact Student Services or campus IT if you need account support.
        </p>
      </main>

      {/* Ink becomes the fill, so the panel follows every colour theme. Shown on wide screens only. */}
      <aside
        aria-labelledby="login-panel-title"
        className="relative hidden overflow-hidden bg-foreground text-background lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-between lg:p-14"
      >
        {/* Soft brand glow and a faint grid: decoration only. */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-primary/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 size-[28rem] rounded-full bg-primary/20 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:48px_48px]"
        />

        <p className="relative text-sm font-medium tracking-wide text-background/80 uppercase">LearnAble for universities</p>

        <div className="relative flex flex-col gap-10">
          <h2 id="login-panel-title" className="max-w-md text-4xl leading-tight font-semibold tracking-tight">
            Run accessible courses and exams from one workspace.
          </h2>
          <ul className="flex flex-col gap-6">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background/10 ring-1 ring-background/15">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm leading-relaxed text-background/75">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-background/70">
          Built for lecturers, examiners, university staff and administrators.
        </p>
      </aside>
    </div>
  );
}
