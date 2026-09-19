import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Info, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiFailure } from "@/api/client";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { en } from "@/shared/strings/en";
import {
  AuthBrand,
  AuthShell,
  GoogleIcon,
} from "@/features/auth/components/AuthShell";
import { useLogin } from "@/features/auth/api/useLogin";
import { getRoleDestination } from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, en.auth.errIdentifierRequired),
  password: z.string().min(1, en.auth.errPasswordRequired),
  remember: z.boolean(),
});
type LoginForm = z.infer<typeof loginFormSchema>;

function describeLoginError(error: unknown) {
  if (error instanceof ApiFailure) {
    if (error.detail.kind === "unauthorized") return en.auth.errInvalid;
    if (error.detail.kind === "network") return en.auth.errNetwork;
  }
  return en.auth.errServer;
}

export function getPostLoginDestination(role: string, requestedPath?: string) {
  return getRoleDestination(role, requestedPath);
}

export function LoginRoute() {
  useRouteAnnouncer(en.auth.pageTitle, en.auth.title);
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();
  const logout = useAuthStore((state) => state.logout);
  const [showPassword, setShowPassword] = useState(false);
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
  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: (user) => {
        const from = (location.state as { from?: string } | null)?.from;
        const destination = getPostLoginDestination(user.role, from);
        if (!destination) {
          logout();
          announce(
            "This account role is not supported by this web application.",
            {
              assertive: true,
            },
          );
          return;
        }
        navigate(destination, { replace: true });
      },
      onError: (error) =>
        announce(describeLoginError(error), { assertive: true }),
    });
  });
  const showGoogleDemo = () => announce(en.auth.demoMessage);

  return (
    <AuthShell
      campusImage="/assets/auth/campus-statue.jpeg"
      campusImageAlt="Self Made Man statue at FPT University campus"
      campusImageClassName="object-[52%_center]"
      imageOverlayClassName="bg-[image:var(--auth-login-image-overlay)]"
      heroTitle="Future Forward – Global Ready"
      heroTitleClassName="text-[length:var(--text-auth-hero)] sm:text-[length:var(--text-auth-hero)]"
      heroBody="A clear, accessible learning environment for FPT University students, lecturers, and staff across every campus."
    >
      <header className="border-b border-[var(--color-border-subtle)] pb-7">
        <AuthBrand />
      </header>
      <div className="mx-auto mt-8 w-full max-w-2xl">
        <h1
          tabIndex={-1}
          className="text-3xl font-bold tracking-[-0.025em] text-foreground outline-none"
        >
          {en.auth.welcome}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{en.auth.intro}</p>
        <Card className="mt-6 gap-0 rounded-2xl bg-muted/45 py-0 shadow-none ring-[var(--color-border-subtle)]">
          <CardHeader className="px-6 pb-5 pt-6 sm:px-8">
            <CardTitle className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <LogIn aria-hidden className="size-6 text-primary" />
              {en.auth.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="identifier">
                    {en.auth.identifier}{" "}
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                  </Label>
                  <Input
                    id="identifier"
                    autoComplete="username"
                    placeholder={en.auth.identifierPlaceholder}
                    aria-invalid={Boolean(errors.identifier)}
                    aria-describedby={
                      errors.identifier ? "identifier-error" : undefined
                    }
                    {...register("identifier")}
                  />
                  {errors.identifier ? (
                    <p
                      id="identifier-error"
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      {errors.identifier.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {en.auth.password}{" "}
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-12"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword
                          ? en.auth.hidePassword
                          : en.auth.showPassword
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden />
                      ) : (
                        <Eye aria-hidden />
                      )}
                    </button>
                  </div>
                  {errors.password ? (
                    <p
                      id="password-error"
                      role="alert"
                      className="text-sm font-medium text-destructive"
                    >
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
                <Controller
                  name="remember"
                  control={control}
                  render={({ field }) => (
                    <Label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium text-muted-foreground">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      {en.auth.remember}
                    </Label>
                  )}
                />
                <Link
                  to="/forgot-password"
                  className="flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {en.auth.forgotPassword}
                </Link>
              </div>
              {serverError ? (
                <Alert variant="destructive">
                  <Info aria-hidden />
                  <AlertTitle>{en.common.error}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending ? en.auth.submitting : en.auth.submit}
              </Button>
              <div className="flex items-center gap-3" aria-hidden>
                <Separator className="flex-1" />
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {en.auth.quickSignIn}
                </span>
                <Separator className="flex-1" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={showGoogleDemo}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </form>
            <div className="mt-6 flex items-start gap-2 border-t border-[var(--color-border-subtle)] pt-5 text-sm leading-relaxed text-muted-foreground">
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-[var(--color-secondary)]"
              />
              <p>{en.auth.accountNotice}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
