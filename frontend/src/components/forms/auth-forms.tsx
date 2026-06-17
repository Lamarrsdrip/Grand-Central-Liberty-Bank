"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, Input, Label, Select } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";

function Status({ message }: { message: string }) {
  return message ? <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">{message}</p> : null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supportPrompt = params.get("support") === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Secure Sign In</CardTitle>
        <CardDescription>Access personal banking or the admin command center.</CardDescription>
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
              router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
              router.refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Login failed.");
            } finally {
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

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
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
            const form = new FormData(event.currentTarget);
            try {
              await secureFetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(form))
              });
              router.push("/dashboard");
              router.refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Registration failed.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </Field>
            <Field>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" required />
            </Field>
            <Field>
              <Label htmlFor="country">Country</Label>
              <Select id="country" name="country" required defaultValue="United States">
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Nigeria</option>
                <option>France</option>
                <option>Spain</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={12} required />
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
