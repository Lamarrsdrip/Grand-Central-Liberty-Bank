import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { LoginForm } from "@/components/forms/auth-forms";
import { CardMockup } from "@/components/banking/premium-ui";

export default function LoginPage() {
  return (
    <main className="landing-hero-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left brand panel */}
        <div className="hidden lg:block">
          <Link href="/" className="flex items-center gap-3 mb-10">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Building2 className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-wide">GRAND CENTRAL</p>
              <p className="text-[0.6rem] font-bold text-white/40 tracking-[0.22em] uppercase">Liberty Bank</p>
            </div>
          </Link>
          <h1 className="text-4xl font-black text-white leading-tight">Welcome back to<br/>private digital banking.</h1>
          <p className="text-white/50 mt-4 max-w-md leading-relaxed">
            Secure access to cash, cards, crypto, transfers, 401(k), and live support — all in one premium app.
          </p>
          <div className="mt-8 hero-card-glow w-fit">
            <CardMockup />
          </div>
        </div>

        {/* Login form */}
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white mb-6 transition lg:hidden">
            <ArrowLeft className="size-4" /> Back home
          </Link>
          <LoginForm />
          <div className="mt-5 flex justify-between text-sm font-bold px-1">
            <Link href="/register" className="text-green hover:text-green-dim transition">Create account</Link>
            <Link href="/forgot-password" className="text-white/40 hover:text-white/70 transition">Forgot password?</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
