"use client";

import { useState } from "react";
import { CandidateAnalysis, JobDetails } from "@/lib/types";
import { CheckCircle2, AlertTriangle, Briefcase, MapPin, Building2, ArrowRight, Wand2, Check, Loader2 } from "lucide-react";

interface SplitVerificationProps {
  jobDetails: JobDetails | null;
  candidateAnalysis: CandidateAnalysis | null;
  isLoading: boolean;
  onSelectAction: (action: "need_more_info" | "tailor" | "done") => void;
}

export function SplitVerification({
  jobDetails,
  candidateAnalysis,
  isLoading,
  onSelectAction,
}: SplitVerificationProps) {
  const [pendingAction, setPendingAction] = useState<"need_more_info" | "tailor" | "done" | null>(null);

  const gapsCount = candidateAnalysis?.gaps?.length || 0;
  const strengthsCount = candidateAnalysis?.strengths?.length || 0;

  const scoreBadgeColor = () => {
    switch (candidateAnalysis?.score) {
      case "strong match":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "good match":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Initial Fit Diagnostic
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            Verification & Evidence Strategy
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Review the extracted target job details against your verified baseline qualifications before initiating interview probes.
          </p>
        </div>

        {candidateAnalysis && (
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide ${scoreBadgeColor()}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              <span>{candidateAnalysis.score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Target Job Card */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <Briefcase className="h-4 w-4 text-zinc-500" />
              <span>Target Role Details</span>
            </div>
            <span className="text-xs text-zinc-400">Validated via LLM</span>
          </div>

          {jobDetails ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {jobDetails.job_title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{jobDetails.job_company}</span>
                  </div>
                  {jobDetails.job_location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{jobDetails.job_location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Key Requirements ({(jobDetails.job_requirements || []).length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(jobDetails.job_requirements || []).map((req, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              {(jobDetails.job_responsibilities || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                    Core Responsibilities
                  </h4>
                  <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside max-h-36 overflow-y-auto">
                    {(jobDetails.job_responsibilities || []).slice(0, 5).map((resp, idx) => (
                      <li key={idx} className="truncate" title={resp}>
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              No target job details loaded yet.
            </div>
          )}
        </div>

        {/* Right Column: Candidate Fit Assessment */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Candidate Alignment Audit</span>
            </div>
            <span className="text-xs text-zinc-400">Deterministic Match</span>
          </div>

          {candidateAnalysis ? (
            <div className="space-y-4 flex-1">
              {/* Executive Message */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 leading-relaxed">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                  AI Alignment Summary:
                </span>
                {candidateAnalysis.user_message}
              </div>

              {/* Verified Strengths */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    <span>Verified Strengths ({strengthsCount})</span>
                  </h4>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {candidateAnalysis.strengths?.map((str, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-md p-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flagged Gaps to Target */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Evidence Gaps to Investigate ({gapsCount})</span>
                  </h4>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {candidateAnalysis.gaps?.map((gap, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md p-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-400">
              No candidate analysis available.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs text-zinc-500">
          Ready to probe missing metrics and ownership? Launching the interview generates targeted questions for each gap.
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              if (!isLoading && !pendingAction) {
                setPendingAction("done");
                onSelectAction("done");
              }
            }}
            disabled={isLoading || pendingAction !== null}
            className="cursor-pointer rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            {pendingAction === "done" && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Finish Review</span>
          </button>

          <button
            onClick={() => {
              if (!isLoading && !pendingAction) {
                setPendingAction("tailor");
                onSelectAction("tailor");
              }
            }}
            disabled={isLoading || pendingAction !== null}
            className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
          >
            {pendingAction === "tailor" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            <span>Skip to Tailoring</span>
          </button>

          <button
            onClick={() => {
              if (!isLoading && !pendingAction) {
                setPendingAction("need_more_info");
                onSelectAction("need_more_info");
              }
            }}
            disabled={isLoading || pendingAction !== null}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
          >
            {pendingAction === "need_more_info" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Launching Interview Planner...</span>
              </>
            ) : (
              <>
                <span>Begin Evidence Gathering ({gapsCount} Gaps)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
