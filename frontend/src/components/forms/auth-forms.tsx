"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, Input, Label, Select } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { COUNTRIES } from "@/lib/countries";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/locales";
import { SUPPORTED_CURRENCIES } from "@/components/layout/currency-switcher";

function Status({ message }: { message: string }) {
  return message ? <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">{message}</p> : null;
}

export function LoginForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supportPrompt = params.get("support") === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure Sign In</CardTitle>
        <CardDescription>Access your secure digital banking account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              const data = await secureFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                  email: form.get("email"),
                  password: form.get("password"),
                  twoFactorToken: form.get("twoFactorToken") || undefined
                })
              });
              // Hard redirect instead of router.push(): Next.js App Router's
              // startTransition keeps the current page mounted (and loading=true)
              // while the target server component loads. On a slow or cold
              // database the admin page can take several seconds, leaving the
              // button stuck on "Signing in…" indefinitely. window.location.href
              // performs a full navigation that unmounts this page immediately,
              // the session cookie is already set so the next request is authed.
              window.location.href = data.user.role === "ADMIN" ? "/admin" : "/dashboard";
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Login failed.");
              setLoading(false);
            }
          }}
        >
          {supportPrompt ? (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
              Sign in or create an account to open a secure live support chat.
            </p>
          ) : null}
          <Status message={message} />
          <FieldGroup>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field>
              <Label htmlFor="twoFactorToken">2FA code</Label>
              <Input id="twoFactorToken" name="twoFactorToken" inputMode="numeric" placeholder="Required only when enabled" />
            </Field>
          </FieldGroup>
          <Button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

type FieldErrors = Record<string, string>;

function FieldError({ errors, field }: { errors: FieldErrors; field: string }) {
  return errors[field] ? (
    <p className="mt-1 text-xs font-semibold text-red-400">{errors[field]}</p>
  ) : null;
}

function parseFieldErrors(error: unknown): FieldErrors {
  const issues = (error as { issues?: Array<{ path: string[]; message: string }> })?.issues;
  if (!Array.isArray(issues)) return {};
  const errs: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path?.[0] ?? "_";
    errs[key] = issue.message;
  }
  return errs;
}

export function RegisterForm() {
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Open your Grand Central Liberty Bank digital profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setMessage("");
            setFieldErrors({});
            const form = new FormData(event.currentTarget);
            try {
              await secureFetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(form))
              });
              window.location.href = "/dashboard";
            } catch (error) {
              const parsed = parseFieldErrors(error);
              if (Object.keys(parsed).length > 0) {
                setFieldErrors(parsed);
              } else {
                setMessage(error instanceof Error ? error.message : "Registration failed.");
              }
              setLoading(false);
            }
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" autoComplete="given-name" required />
              <FieldError errors={fieldErrors} field="firstName" />
            </Field>
            <Field>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" autoComplete="family-name" required />
              <FieldError errors={fieldErrors} field="lastName" />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              <FieldError errors={fieldErrors} field="email" />
            </Field>
            <Field>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+1 555 000 0000" required />
              <FieldError errors={fieldErrors} field="phone" />
            </Field>
            <Field>
              <Label htmlFor="country">Country</Label>
              <Select id="country" name="country" required defaultValue="United States">
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <FieldError errors={fieldErrors} field="country" />
            </Field>
            <Field>
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" autoComplete="bday" required />
              <FieldError errors={fieldErrors} field="dateOfBirth" />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" autoComplete="street-address" placeholder="123 Main St, City, State" required />
              <FieldError errors={fieldErrors} field="address" />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="password">Password <span className="text-white/30 font-normal">(min 8 characters)</span></Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
              <FieldError errors={fieldErrors} field="password" />
            </Field>
            <Field>
              <Label htmlFor="preferredLocale">Preferred language</Label>
              <Select id="preferredLocale" name="preferredLocale" defaultValue="en">
                {SUPPORTED_LOCALES.map((code) => (
                  <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="preferredCurrency">Preferred currency</Label>
              <Select id="preferredCurrency" name="preferredCurrency" defaultValue="USD">
                {SUPPORTED_CURRENCIES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Button disabled={loading}>{loading ? "Creating account..." : "Create secure account"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Receive a secure reset link by email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              const data = await secureFetch("/api/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email: form.get("email") })
              });
              setMessage(data.message ?? "If that account exists, a password reset email has been sent.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Request failed. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Status message={message} />
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Button disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Use the token from your secure reset email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              await secureFetch("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token: form.get("token"), password: form.get("password") })
              });
              setMessage("Password updated. You can sign in with the new password.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Password reset failed. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Status message={message} />
          <Field>
            <Label htmlFor="token">Reset token</Label>
            <Input id="token" name="token" defaultValue={params.get("token") ?? ""} required />
          </Field>
          <Field>
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" minLength={12} required />
          </Field>
          <Button disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function VerifyEmailForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
        <CardDescription>Confirm your email address to unlock full account services.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setMessage("");
            const form = new FormData(event.currentTarget);
            try {
              await secureFetch("/api/auth/verify-email", {
                method: "POST",
                body: JSON.stringify({ token: form.get("token") })
              });
              setMessage("Email verified.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Verification failed. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Status message={message} />
          <Field>
            <Label htmlFor="token">Verification token</Label>
            <Input id="token" name="token" defaultValue={params.get("token") ?? ""} required />
          </Field>
          <Button disabled={loading}>{loading ? "Verifying..." : "Verify email"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
