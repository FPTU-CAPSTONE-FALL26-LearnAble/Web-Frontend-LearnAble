import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Info } from "lucide-react";
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
import { Separator } from "@/shared/ui/primitives/separator";
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
    if (error.serverMessage) return error.serverMessage;
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
  const showGoogleDemo = () =>
    announce("Google sign-in will be available when identity integration is enabled.");

  return (
    <AuthShell
      campusImage="/assets/landing/inclusive-learning.png"
      campusImageAlt="A visually impaired university learner using LearnAble with headphones and Braille materials"
      campusImageClassName="object-[center_42%]"
      eyebrow="Accessible learning • Inclusive assessment"
      heroTitle="Learning without digital barriers"
      heroTitleClassName="text-[28px] lg:text-[28px]"
      heroBody="LearnAble brings accessible learning materials, question authoring and inclusive exam operations into one university platform."
      highlights={[
        { value: "Learn", label: "Accessible course materials" },
        { value: "Prepare", label: "Inclusive question workflows" },
        { value: "Assess", label: "Supported exam delivery" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex justify-start border-b border-border pb-6">
          <Link
            to="/"
            aria-label="Go to LearnAble home page"
            className="rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <AuthBrand prominent />
          </Link>
        </header>

        <section className="grid gap-5" aria-labelledby="login-heading">
          <header className="space-y-2">
            <h1
              id="login-heading"
              className="text-3xl font-semibold tracking-tight text-foreground outline-none"
            >
              Welcome to <span className="text-primary">LearnAble</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with the university account issued to you.
            </p>
          </header>
          <div className="grid gap-5">
            <form onSubmit={onSubmit} noValidate className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label
                  htmlFor="identifier"
                  className="text-xs font-semibold uppercase tracking-wide"
                >
                  Email{" "}
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                </Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="name@university.edu.vn"
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

              <div className="grid gap-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wide"
                  >
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
                    className="pr-10"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      showPassword ? en.auth.hidePassword : en.auth.showPassword
                    }
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
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

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Controller
                  name="remember"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <Label
                        htmlFor="remember"
                        className="cursor-pointer text-sm font-normal text-muted-foreground"
                      >
                        {en.auth.remember}
                      </Label>
                    </div>
                  )}
                />
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
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
                disabled={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending ? en.auth.submitting : en.auth.submit}
              </Button>

              <div className="my-2 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="shrink-0 text-xs uppercase text-muted-foreground">
                  Or sign in quickly
                </span>
                <Separator className="flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={showGoogleDemo}
              >
                <GoogleIcon />
                Continue with university Google account
              </Button>
            </form>

            <div className="mt-2 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <Info
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
              <p>
                Accounts are provided by your university. Contact Student
                Services or campus IT if you need account support.
              </p>
            </div>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/student/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Student accessible sign-in
                </Link>
              </p>
          </div>
        </section>
      </div>
    </AuthShell>
  );
}
