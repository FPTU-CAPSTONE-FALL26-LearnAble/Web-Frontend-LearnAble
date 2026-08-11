import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router";
import { Input } from "@/shared/ui/primitives/Input";
import { Button } from "@/shared/ui/primitives/Button";
import { Card } from "@/shared/ui/primitives/Card";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import { ApiFailure } from "@/api/client";
import { useLogin } from "@/features/auth/api/useLogin";

const loginFormSchema = z.object({
  email: z.string().email(vi.auth.errEmailFormat),
  password: z.string().min(1, vi.auth.errPasswordRequired),
});
type LoginForm = z.infer<typeof loginFormSchema>;

/** SCR-01 — FR-01 */
export function LoginRoute() {
  useRouteAnnouncer(vi.auth.pageTitle, vi.auth.title);
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) });

  const serverError = loginMutation.isError
    ? loginMutation.error instanceof ApiFailure && loginMutation.error.detail.kind === "unauthorized"
      ? vi.auth.errInvalid
      : vi.auth.errNetwork
    : null;

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from ?? "/luyen-tap", { replace: true });
      },
      onError: (error) => {
        // Lỗi mutation không đi qua QueryCache — announce tại đây (assertive: chặn thao tác).
        announce(
          error instanceof ApiFailure && error.detail.kind === "unauthorized"
            ? vi.auth.errInvalid
            : vi.auth.errNetwork,
          { assertive: true },
        );
      },
    });
  });

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center p-6">
      <Card>
        <h1 tabIndex={-1} className="text-[length:var(--text-2xl)] font-bold">
          {vi.auth.title}
        </h1>
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <Input
            label={vi.auth.email}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label={vi.auth.password}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          {serverError ? (
            <p role="alert" className="font-medium text-[var(--color-error)]">
              {serverError}
            </p>
          ) : null}
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? vi.auth.submitting : vi.auth.submit}
          </Button>
        </form>
      </Card>
    </main>
  );
}
