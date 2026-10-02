"use client";

import { useState, useEffect, useRef } from "react";
import { AppPhase, JobDetails } from "@/lib/types";
import { ResiLogo } from "@/components/logo";
import { CompanyLogo } from "@/components/company-logo";
import {
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Wand2,
  ArrowRight,
  LogOut,
  User,
  ChevronDown,
  Layers,
  Home,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  phase: AppPhase;
  sessionId: string | null;
  jobDetails: JobDetails | null;
  onResetSession: () => void;
}

const PHASES: Array<{ id: AppPhase; label: string; icon: typeof CheckCircle2 }> = [
  { id: "verification", label: "Fit Audit", icon: CheckCircle2 },
  { id: "interview", label: "Interview", icon: MessageSquare },
  { id: "tailor", label: "Tailor", icon: Wand2 },
  { id: "compare", label: "Export", icon: ArrowRight },
];

export function Header({ phase, sessionId, jobDetails, onResetSession }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isInFlight = phase !== "setup" && Boolean(sessionId);
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === phase);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then((res: any) => {
        if (res?.data?.user?.email) {
          setUserEmail(res.data.user.email);
        }
      });
    } catch {
      // Supabase envs might be unset during initial config
    }
  }, []);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/90 bg-[#faf9f6]/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Telemetry Status */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group transition-opacity hover:opacity-90">
            <ResiLogo size={19} className="h-8.5 w-8.5 group-hover:border-emerald-500/50" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-900">
                ResiAgent
              </span>
            </div>
          </Link>

          <span className="text-stone-300">/</span>

          {/* Dynamic Telemetry Status Chip */}
          <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-mono font-medium text-stone-700 border border-stone-200/90 shadow-2xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isInFlight ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
              }`}
            />
            <span className="text-stone-500">AGENT:</span>
            <span className={isInFlight ? "text-emerald-700 font-semibold" : "text-stone-800 font-medium"}>
              {isInFlight ? "MISSION ACTIVE" : "IDLE · READY"}
            </span>
          </div>
        </div>

        {/* Center: Contextual Minimalist Breadcrumb / In-Flight Phase Indicator */}
        <div className="hidden md:flex items-center justify-center">
          {!isInFlight ? (
            <div className="flex items-center gap-2 text-xs font-mono text-stone-600 bg-stone-100/60 px-3 py-1 rounded-full border border-stone-200/60">
              <Layers className="h-3.5 w-3.5 text-stone-600" />
              <span>Workspace</span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-900 font-semibold">Intake & Dossiers</span>
            </div>
          ) : (
            /* Floating Phase Stepper only when mission is in-flight */
            <nav aria-label="Progress" className="flex items-center gap-1 bg-white/80 p-1 rounded-full border border-stone-200 shadow-2xs">
              {PHASES.map((step, idx) => {
                const isCompleted = idx < currentPhaseIndex;
                const isCurrent = step.id === phase;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                        isCurrent
                          ? "bg-zinc-900 text-white shadow-xs font-semibold"
                          : isCompleted
                          ? "text-emerald-700 bg-emerald-50/70"
                          : "text-stone-400"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{step.label}</span>
                    </div>
                    {idx < PHASES.length - 1 && (
                      <span className="mx-0.5 text-[10px] text-stone-300">›</span>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Active Target Chip + Reset + User Profile Menu */}
        <div className="flex items-center gap-2.5">
          {/* Active Job Target Chip */}
          {jobDetails && isInFlight && (
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-zinc-800 shadow-2xs">
              <CompanyLogo company={jobDetails.job_company} size={14} />
              <span className="font-medium truncate max-w-[140px]">{jobDetails.job_title}</span>
              <span className="text-stone-400">@</span>
              <span className="text-stone-600 truncate max-w-[100px]">{jobDetails.job_company}</span>
            </div>
          )}

          {/* New Session Button */}
          {sessionId && (
            <button
              onClick={onResetSession}
              title="Clear active session and start a new mission"
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-stone-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-all shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-stone-400" />
              <span className="hidden sm:inline">New Mission</span>
            </button>
          )}

          {/* User Profile Popover / Dropdown */}
          {userEmail && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="cursor-pointer flex items-center gap-1.5 rounded-full border border-stone-200 bg-white pl-2 pr-2.5 py-1 text-xs text-stone-700 hover:border-stone-300 transition-colors shadow-2xs"
              >
                <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-stone-900 text-[10px] font-medium text-white">
                  {userEmail[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-[11px] font-mono max-w-[130px] truncate">
                  {userEmail.split("@")[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-stone-400" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-[#faf9f6] p-1.5 text-xs shadow-lg ring-1 ring-black/5 z-50">
                  <div className="px-3 py-2 border-b border-stone-200/70 mb-1">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-stone-600">Authenticated as</p>
                    <p className="text-xs font-medium text-stone-900 truncate mt-0.5" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>

                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                  >
                    <Home className="h-3.5 w-3.5 text-stone-500" />
                    <span>ResiAgent Homepage</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleSignOut();
                    }}
                    className="cursor-pointer w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-stone-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5 text-stone-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
