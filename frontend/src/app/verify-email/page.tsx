import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/forms/auth-forms";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
