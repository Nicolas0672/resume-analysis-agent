"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Deterministic constellation dots matching the homepage aesthetic
const CONSTELLATION_DOTS = [
  { top: "10%", left: "14%", size: 2.5, delay: "0s", duration: "6.8s" },
  { top: "18%", left: "82%", size: 2, delay: "1.4s", duration: "7.6s" },
  { top: "32%", left: "20%", size: 2.5, delay: "2.8s", duration: "8.4s" },
  { top: "42%", left: "88%", size: 3, delay: "0.6s", duration: "6.2s" },
  { top: "64%", left: "10%", size: 2, delay: "3.2s", duration: "9.0s" },
  { top: "78%", left: "84%", size: 2.5, delay: "1.9s", duration: "7.1s" },
  { top: "88%", left: "22%", size: 3, delay: "2.5s", duration: "8.7s" },
  { top: "24%", left: "54%", size: 2, delay: "3.5s", duration: "8.9s" },
  { top: "72%", left: "50%", size: 2.5, delay: "1.3s", duration: "7.3s" },
];

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMsg(null);
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setErrorMsg(message);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (isSignUp) {
        const origin = window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // If email confirmation is enabled on Supabase project
        if (data.user && !data.session) {
          setSuccessMsg(
            "Account created! Please check your email inbox to confirm your account before signing in."
          );
        } else {
          // Direct login if confirmation is disabled
          router.push("/app");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/app");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-zinc-900 selection:bg-emerald-100 selection:text-emerald-950 font-sans relative flex flex-col justify-between overflow-x-hidden">
      {/* Fine Ledger Paper Grid Texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-55"
        style={{
          backgroundImage: `
            radial-gradient(#d6d3d1 0.75px, transparent 0.75px),
            linear-gradient(to right, #f5f5f4 1px, transparent 1px),
            linear-gradient(to bottom, #f5f5f4 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px, 140px 140px, 140px 140px",
        }}
      />

      {/* Creeping Polka Dots Constellation */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {CONSTELLATION_DOTS.map((dot, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-emerald-600/40"
            style={{
              top: dot.top,
              left: dot.left,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animation: `creepPulse ${dot.duration} ease-in-out infinite alternate`,
              animationDelay: dot.delay,
            }}
          />
        ))}
      </div>

      {/* Top Bar with Home Back Link */}
      <header className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to ResiAgent</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">
            ResiAgent
          </span>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-stone-300 bg-white p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_16px_40px_-10px_rgba(0,0,0,0.08)]">
            {/* Header info */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-800 border border-emerald-200 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Evidence-Based Workspace
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-1.5 text-xs text-zinc-500">
                {isSignUp
                  ? "Sign up to start tailoring resumes with verifiable evidence."
                  : "Sign in to access your active tailoring session."}
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-stone-50 hover:text-zinc-950 transition-all shadow-2xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Minimal Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                <span className="bg-white px-3 text-zinc-400">or continue with email</span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-9 pr-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-9 pr-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-5 text-center text-xs text-zinc-500">
              {isSignUp ? (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              ) : (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Create account
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 py-6 text-center text-[11px] text-zinc-400">
        ResiAgent Evidence Studio · Secure Supabase Authentication
      </footer>
    </div>
  );
}
