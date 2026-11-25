import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Check, Info, KeyRound } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/primitives/alert";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { FieldError, ShowPasswordToggle, SignInFrame, signInTextLink } from "@/features/auth/components/SignInFrame";
import { useLogin } from "@/features/auth/api/useLogin";
import { getRoleDestination, normalizeSupportedRole } from "@/features/auth/roleRouting";
import { useAuthStore } from "@/features/auth/store/authStore";

const studentLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your university email or student ID."),
  password: z.string().min(1, "Enter your password."),
});

type StudentLoginForm = z.infer<typeof studentLoginSchema>;

const afterSignIn = [
  "Practise with the same player used in real exams",
  "See your exam schedule, results and notifications",
  "Your text size and colours follow you to the desktop app",
];

function describeLoginError(error: unknown) {
  if (error instanceof ApiFailure) {
    if (error.detail.kind === "unauthorized") {
      return "The university email, student ID, or password is incorrect.";
    }
    if (error.detail.kind === "network") {
      return "We could not reach the server. Check your connection and try again.";
    }
  }
  return "The server could not complete sign-in. Please try again.";
}

export function getStudentPostLoginDestination(requestedPath?: string) {
  return getRoleDestination("student", requestedPath) ?? "/home";
}

/**
 * The student sign-in: two fields and one button, large type, the
 * Accessibility card to set text size and colours before typing, and every
 * other way out (home, staff sign-in, password help) written as plain links.
 */
export function StudentLoginRoute({
  displayControls,
}: {
  /** The Accessibility card; the router passes it in, since features do not import each other. */
  displayControls?: ReactNode;
}) {
  useRouteAnnouncer("Student sign in — LearnAble", "Student sign in");
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const loginMutation = useLogin();
  const [accountError, setAccountError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginForm>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const serverError = loginMutation.isError
    ? describeLoginError(loginMutation.error)
    : null;
  const visibleError = accountError ?? serverError;

  const onSubmit = handleSubmit((values) => {
    setAccountError(null);
    loginMutation.mutate(
      { ...values, remember: false },
      {
        onSuccess: (user) => {
          if (normalizeSupportedRole(user.role) !== "student") {
            logout();
            const message = "This sign-in page is for Student accounts. Use the staff sign-in for your account type.";
            setAccountError(message);
            announce(message, { assertive: true });
            return;
          }
          const from = (location.state as { from?: string } | null)?.from;
          navigate(getStudentPostLoginDestination(from), { replace: true });
        },
        onError: (error) => announce(describeLoginError(error), { assertive: true }),
      },
    );
  });

  return (
    <SignInFrame
      displayControls={displayControls}
      titleId="student-login-title"
      eyebrow="For students"
      title="Student sign in"
      intro={<p>Use the account your university gave you.</p>}
      aside={{
        titleId: "student-login-after",
        title: "After you sign in",
        image: "/assets/landing/inclusive-learning.png",
        children: (
          <>
            <ul className="flex flex-col gap-4">
              {afterSignIn.map((item) => (
                <li key={item} className="flex items-start gap-3 leading-relaxed">
                  <Check aria-hidden className="mt-1 size-6 shrink-0" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-col gap-1 border-t-2 border-background pt-6">
              <p>Lecturer, examiner or university staff?</p>
              <Link to="/login" className={signInTextLink}>
                Use the staff sign-in
              </Link>
            </div>
          </>
        ),
      }}
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-identifier">
            <span className="text-lg font-bold">University email or student ID</span>
          </Label>
          <p id="student-identifier-hint" className="text-base leading-relaxed">
            For example name@fpt.edu.vn, or your student ID.
          </p>
          <Input
            id="student-identifier"
            autoComplete="username"
            required
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={
              errors.identifier ? "student-identifier-error student-identifier-hint" : "student-identifier-hint"
            }
            {...register("identifier")}
          />
          {errors.identifier ? <FieldError id="student-identifier-error">{errors.identifier.message}</FieldError> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="student-password">
            <span className="text-lg font-bold">Password</span>
          </Label>
          <Input
            id="student-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "student-password-error" : undefined}
            {...register("password")}
          />
          {errors.password ? <FieldError id="student-password-error">{errors.password.message}</FieldError> : null}
          {/* After the field, so Tab reaches the password before the toggle. */}
          <ShowPasswordToggle
            controls="student-password"
            shown={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
          />
        </div>

        {visibleError ? (
          <Alert variant="destructive">
            <Info aria-hidden />
            <AlertTitle>Unable to sign in</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="xl" disabled={loginMutation.isPending}>
          <span className="text-lg font-bold">{loginMutation.isPending ? "Signing in…" : "Sign in"}</span>
          {loginMutation.isPending ? null : <ArrowRight aria-hidden />}
        </Button>
      </form>

      <div className="flex gap-3 border-t-2 border-border pt-6">
        <KeyRound aria-hidden className="mt-1 size-6 shrink-0" />
        <p className="leading-relaxed">
          <span className="font-bold">Forgot your password?</span> Contact Student Services or campus IT to reset it.
        </p>
      </div>
    </SignInFrame>
  );
}
