import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-primary">Back to sign in</Link>
      </div>
    </main>
  );
}
