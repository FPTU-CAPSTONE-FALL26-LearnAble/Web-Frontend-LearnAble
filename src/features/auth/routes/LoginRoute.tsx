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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
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
      heroTitle="Future Forward – Global Ready"
      heroTitleClassName="text-3xl sm:text-4xl"
      heroBody="A clear, accessible learning environment for FPT University students, lecturers, and staff across every campus."
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex justify-center pb-2">
          <AuthBrand />
        </header>

        <Card className="border-border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-medium tracking-tight">
              {en.auth.welcome}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {en.auth.intro}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form onSubmit={onSubmit} noValidate className="grid gap-4">
              <div className="grid gap-2">
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

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    {en.auth.password}{" "}
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                  </Label>
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
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
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

              <div className="flex items-center space-x-2">
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

              <div className="relative my-1 flex items-center justify-center">
                <Separator className="w-full" />
                <span className="absolute bg-card px-2 text-xs uppercase text-muted-foreground">
                  {en.auth.quickSignIn}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={showGoogleDemo}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
              <p>{en.auth.accountNotice}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
