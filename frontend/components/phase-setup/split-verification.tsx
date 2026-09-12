"use client";

import { useState, useMemo } from "react";
import {
  CandidateAnalysis,
  CandidateGap,
  CandidateGapStatus,
  CandidateStrength,
  JobDetails,
} from "@/lib/types";
import { useRotatingPhrase, SYNTHESIZING_PHRASES } from "@/hooks/use-rotating-phrase";
import {
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  MapPin,
  Building2,
  ArrowRight,
  Wand2,
  Check,
  Loader2,
  XCircle,
  HelpCircle,
  Sparkles,
  Compass,
  FileCheck2,
  Quote,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"all" | "gaps" | "strengths">("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | CandidateGapStatus>("all");

  const synthesizingPhrase = useRotatingPhrase(SYNTHESIZING_PHRASES, pendingAction === "tailor");

  // Normalize gaps to CandidateGap objects
  const gapsList: CandidateGap[] = useMemo(() => {
    if (!candidateAnalysis?.gaps) return [];
    return candidateAnalysis.gaps.map((item) => {
      if (typeof item === "string") {
        return {
          requirement: item,
          status: "missing" as CandidateGapStatus,
          evidence: null,
          gap: item,
        };
      }
      return item;
    });
  }, [candidateAnalysis?.gaps]);

  // Normalize strengths to CandidateStrength objects
  const strengthsList: CandidateStrength[] = useMemo(() => {
    if (!candidateAnalysis?.strengths) return [];
    return candidateAnalysis.strengths.map((item) => {
      if (typeof item === "string") {
        return {
          requirement: item,
          explanation: item,
          evidence: [],
        };
      }
      return item;
    });
  }, [candidateAnalysis?.strengths]);

  // Count breakdown by gap status
  const gapCounts = useMemo(() => {
    const counts: Record<CandidateGapStatus, number> = {
      missing: 0,
      partial: 0,
      unclear: 0,
      transferable: 0,
    };
    gapsList.forEach((g) => {
      if (g.status && counts[g.status] !== undefined) {
        counts[g.status]++;
      }
    });
    return counts;
  }, [gapsList]);

  // Filtered gaps according to status pill
  const filteredGaps = useMemo(() => {
    if (selectedStatusFilter === "all") return gapsList;
    return gapsList.filter((g) => g.status === selectedStatusFilter);
  }, [gapsList, selectedStatusFilter]);

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

  const getGapStatusBadge = (status: CandidateGapStatus) => {
    switch (status) {
      case "missing":
        return {
          label: "Missing Evidence",
          icon: XCircle,
          badgeClass:
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60",
        };
      case "partial":
        return {
          label: "Partial Match",
          icon: AlertTriangle,
          badgeClass:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60",
        };
      case "unclear":
        return {
          label: "Unclear in Resume",
          icon: HelpCircle,
          badgeClass:
            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/60",
        };
      case "transferable":
        return {
          label: "Transferable Skill",
          icon: Sparkles,
          badgeClass:
            "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900/60",
        };
      default:
        return {
          label: "Target Gap",
          icon: AlertTriangle,
          badgeClass:
            "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        };
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
            Review the extracted target job requirements against your verified baseline qualifications before initiating interview probes.
          </p>
        </div>

        {candidateAnalysis && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide ${scoreBadgeColor()}`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              <span>{candidateAnalysis.score}</span>
            </div>
            <div className="text-xs font-medium text-zinc-500 hidden sm:block">
              {strengthsList.length} Strengths • {gapsList.length} Gaps
            </div>
          </div>
        )}
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Target Job Card (~5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <Briefcase className="h-4 w-4 text-zinc-500" />
              <span>Target Role Details</span>
            </div>
            <span className="text-[11px] text-zinc-400">Validated via LLM</span>
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
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Key Requirements</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    {(jobDetails.job_requirements || []).length} criteria
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
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
                  <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside max-h-40 overflow-y-auto pr-1">
                    {(jobDetails.job_responsibilities || []).slice(0, 6).map((resp, idx) => (
                      <li key={idx} className="line-clamp-2" title={resp}>
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

        {/* Right Column: Candidate Fit Assessment (~7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          {/* Header & Alignment Mode */}
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <span>Candidate Alignment Audit</span>
            </div>

            {/* View Mode Segmented Controls */}
            <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 text-xs dark:border-zinc-700 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`cursor-pointer px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                All ({gapsList.length + strengthsList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gaps")}
                className={`cursor-pointer px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "gaps"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Gaps ({gapsList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("strengths")}
                className={`cursor-pointer px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "strengths"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Strengths ({strengthsList.length})
              </button>
            </div>
          </div>

          {candidateAnalysis ? (
            <div className="space-y-4 flex-1">
              {/* Executive Alignment Message */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300 leading-relaxed space-y-1.5">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                  <span>Strategic Fit Diagnostic:</span>
                </span>
                <p className="text-zinc-600 dark:text-zinc-400">{candidateAnalysis.user_message}</p>
              </div>

              {/* Relevant Experience Profile (if available) */}
              {candidateAnalysis.relevant_experience && (
                <div className="rounded-lg border border-blue-200/80 bg-blue-50/40 p-3.5 text-xs text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200 leading-relaxed space-y-1">
                  <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Relevant Experience Profile:</span>
                  </div>
                  <p className="text-blue-900/80 dark:text-blue-300/80">
                    {candidateAnalysis.relevant_experience}
                  </p>
                </div>
              )}

              {/* Status Filter Pills for Gaps (when viewing All or Gaps) */}
              {(activeTab === "all" || activeTab === "gaps") && gapsList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-zinc-400 mr-1">Status Filter:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter("all")}
                    className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      selectedStatusFilter === "all"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    All Gaps ({gapsList.length})
                  </button>
                  {gapCounts.missing > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("missing")}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedStatusFilter === "missing"
                          ? "bg-rose-600 text-white"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}
                    >
                      Missing ({gapCounts.missing})
                    </button>
                  )}
                  {gapCounts.partial > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("partial")}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedStatusFilter === "partial"
                          ? "bg-amber-600 text-white"
                          : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      Partial ({gapCounts.partial})
                    </button>
                  )}
                  {gapCounts.unclear > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("unclear")}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedStatusFilter === "unclear"
                          ? "bg-purple-600 text-white"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                      }`}
                    >
                      Unclear ({gapCounts.unclear})
                    </button>
                  )}
                  {gapCounts.transferable > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("transferable")}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedStatusFilter === "transferable"
                          ? "bg-sky-600 text-white"
                          : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300"
                      }`}
                    >
                      Transferable ({gapCounts.transferable})
                    </button>
                  )}
                </div>
              )}

              {/* Dynamic Items Container */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {/* 1. Gaps List */}
                {(activeTab === "all" || activeTab === "gaps") && (
                  <div className="space-y-2.5">
                    {activeTab === "all" && (
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Identified Evidence Gaps ({filteredGaps.length})</span>
                      </h4>
                    )}

                    {filteredGaps.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-2">
                        No gaps match the selected status filter.
                      </p>
                    ) : (
                      filteredGaps.map((gap, idx) => {
                        const badge = getGapStatusBadge(gap.status);
                        const BadgeIcon = badge.icon;

                        return (
                          <div
                            key={idx}
                            className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200 space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {gap.requirement}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.badgeClass}`}
                              >
                                <BadgeIcon className="h-3 w-3" />
                                <span>{badge.label}</span>
                              </span>
                            </div>

                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {gap.gap}
                            </p>

                            {/* Existing Clues in Resume (if available) */}
                            {gap.evidence && gap.evidence.length > 0 && (
                              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
                                <span className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                  <Quote className="h-2.5 w-2.5" />
                                  <span>Related Resume Mentions:</span>
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {gap.evidence.map((ev, evIdx) => (
                                    <span
                                      key={evIdx}
                                      className="rounded bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300"
                                    >
                                      {ev}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. Strengths List */}
                {(activeTab === "all" || activeTab === "strengths") && (
                  <div className="space-y-2.5 pt-2">
                    {activeTab === "all" && (
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Check className="h-3.5 w-3.5" />
                        <span>Verified Strengths ({strengthsList.length})</span>
                      </h4>
                    )}

                    {strengthsList.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-2">
                        No verified strengths available.
                      </p>
                    ) : (
                      strengthsList.map((str, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs text-zinc-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-zinc-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-emerald-900 dark:text-emerald-300">
                              {str.requirement}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Verified</span>
                            </span>
                          </div>

                          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {str.explanation}
                          </p>

                          {str.evidence && str.evidence.length > 0 && (
                            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                              <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-400">
                                Direct Resume Evidence:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {str.evidence.map((ev, evIdx) => (
                                  <span
                                    key={evIdx}
                                    className="rounded bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 text-[10px]"
                                  >
                                    ✓ {ev}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
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
          Ready to probe missing metrics and ownership? Launching the interview generates targeted questions for each identified gap.
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
            className="cursor-pointer rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:border-zinc-200 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            {pendingAction === "done" && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
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
            className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-100 disabled:border-zinc-700 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
          >
            {pendingAction === "tailor" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-emerald-400" />
                <span className="font-medium animate-fade-in">{synthesizingPhrase}</span>
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                <span>Skip to Tailoring</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (!isLoading && !pendingAction) {
                setPendingAction("need_more_info");
                onSelectAction("need_more_info");
              }
            }}
            disabled={isLoading || pendingAction !== null}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-zinc-800 disabled:text-zinc-200 disabled:border-zinc-700 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
          >
            {pendingAction === "need_more_info" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-emerald-400" />
                <span>Launching Interview Planner...</span>
              </>
            ) : (
              <>
                <span>Begin Evidence Gathering ({gapsList.length} Gaps)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
