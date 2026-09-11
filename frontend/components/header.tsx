"use client";

import { AppPhase, JobDetails } from "@/lib/types";
import { Sparkles, RotateCcw, FileText, CheckCircle2, MessageSquare, Wand2, ArrowRight } from "lucide-react";

interface HeaderProps {
  phase: AppPhase;
  sessionId: string | null;
  jobDetails: JobDetails | null;
  onResetSession: () => void;
}

const PHASES: Array<{ id: AppPhase; label: string; icon: typeof FileText }> = [
  { id: "setup", label: "Ingest", icon: FileText },
  { id: "verification", label: "Fit Audit", icon: CheckCircle2 },
  { id: "interview", label: "Interview", icon: MessageSquare },
  { id: "tailor", label: "Tailor", icon: Wand2 },
  { id: "compare", label: "Export", icon: ArrowRight },
];

export function Header({ phase, sessionId, jobDetails, onResetSession }: HeaderProps) {
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === phase);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Resume Co-Pilot
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Evidence-Based
              </span>
            </div>
          </div>
        </div>

        {/* Phase Stepper Breadcrumb */}
        <nav aria-label="Progress" className="hidden md:flex items-center gap-1.5">
          {PHASES.map((step, idx) => {
            const isCompleted = idx < currentPhaseIndex;
            const isCurrent = step.id === phase;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isCurrent
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                      : isCompleted
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{step.label}</span>
                </div>
                {idx < PHASES.length - 1 && (
                  <span className="mx-1 text-xs text-zinc-300 dark:text-zinc-700">/</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Target Job & Session Actions */}
        <div className="flex items-center gap-3">
          {jobDetails && (
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium truncate max-w-[200px]">
                {jobDetails.job_title}
              </span>
              <span className="text-zinc-400">@</span>
              <span className="text-zinc-500 truncate max-w-[120px]">
                {jobDetails.job_company}
              </span>
            </div>
          )}

          {sessionId && (
            <button
              onClick={onResetSession}
              title="Clear session and start a new resume analysis"
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
