import Link from "next/link";
import { ArrowLeft, Building2, Check } from "lucide-react";
import { RegisterForm } from "@/components/forms/auth-forms";

export default function RegisterPage() {
  return (
    <main className="landing-hero-bg min-h-screen flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left panel */}
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
          <h1 className="text-4xl font-black text-white leading-tight">Open your premium<br/>account in minutes.</h1>
          <p className="text-white/50 mt-4 max-w-md leading-relaxed">
            Join millions banking smarter with Grand Central Liberty Bank.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "No monthly fees · Get paid up to 2 days early",
              "4.60% APY on high-yield savings",
              "200+ cryptocurrencies with bank-grade security",
              "401(k), investments, and cards in one app",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-green/20 flex items-center justify-center shrink-0">
                  <Check className="size-3 text-green" />
                </div>
                <span className="text-sm text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Register form */}
        <div className="w-full max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white mb-6 transition lg:hidden">
            <ArrowLeft className="size-4" /> Back home
          </Link>
          <RegisterForm />
          <p className="mt-5 text-center text-sm font-bold">
            <span className="text-white/40">Already have an account? </span>
            <Link href="/login" className="text-green hover:text-green-dim transition">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
