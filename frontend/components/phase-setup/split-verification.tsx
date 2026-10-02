"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CandidateAnalysis,
  CandidateGap,
  CandidateGapStatus,
  CandidateStrength,
  JobDetails,
} from "@/lib/types";
import { useRotatingPhrase, SYNTHESIZING_PHRASES } from "@/hooks/use-rotating-phrase";
import { CompanyLogo } from "@/components/company-logo";
import { TelemetryButton, TelemetryStage } from "@/components/telemetry-button";
import {
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  MapPin,
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
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";

const INTERVIEW_PLANNER_STAGES: TelemetryStage[] = [
  {
    stage: "STAGE [1/3]",
    label: "Formulating probe objectives for identified gaps...",
    detail: "NLP gap evaluation • criteria taxonomy mapping",
  },
  {
    stage: "STAGE [2/3]",
    label: "Cross-referencing baseline resume entries...",
    detail: "Identifying adjacent experiences • transferability audit",
  },
  {
    stage: "STAGE [3/3]",
    label: "Initializing interview planner checkpointer...",
    detail: "Compiling investigation deck • thread orchestration",
  },
];

const DIRECT_TAILOR_STAGES: TelemetryStage[] = [
  {
    stage: "STAGE [1/4]",
    label: "Mapping baseline resume evidence to requirements...",
    detail: "Direct criteria matching • relevance scoring",
  },
  {
    stage: "STAGE [2/4]",
    label: "Synthesizing high-impact tailored bullet points...",
    detail: "XYZ action-metric formula • technical tone alignment",
  },
  {
    stage: "STAGE [3/4]",
    label: "Running factual grounding & rubric critique...",
    detail: "Factual integrity check • hallucination prevention",
  },
  {
    stage: "STAGE [4/4]",
    label: "Finalizing proposal review checkpointer...",
    detail: "Preparing proposal diffs • compiling critique report",
  },
];

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
  const [showAllResponsibilities, setShowAllResponsibilities] = useState(false);

  // Staged cascade steps: 0 -> 1 -> 2 -> 3 -> 4
  const [cascadeStep, setCascadeStep] = useState(0);

  // Collapsed state map for gaps and strengths
  const [expandedGaps, setExpandedGaps] = useState<Record<number, boolean>>({ 0: true });
  const [expandedStrengths, setExpandedStrengths] = useState<Record<number, boolean>>({});

  const synthesizingPhrase = useRotatingPhrase(SYNTHESIZING_PHRASES, pendingAction === "tailor");

  // Sequenced cascade pacing (~1.4s total)
  useEffect(() => {
    const t1 = setTimeout(() => setCascadeStep(1), 50);
    const t2 = setTimeout(() => setCascadeStep(2), 280);
    const t3 = setTimeout(() => setCascadeStep(3), 620);
    const t4 = setTimeout(() => setCascadeStep(4), 980);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

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

  // Target alignment score (0 - 100)
  const targetScore = useMemo(() => {
    const scoreStr = candidateAnalysis?.score?.toLowerCase() || "";
    if (scoreStr.includes("strong")) return 88;
    if (scoreStr.includes("good")) return 76;
    return 62;
  }, [candidateAnalysis?.score]);

  // Animated score counter for radial dial
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    if (cascadeStep < 2) return;
    const duration = 650;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(ease * targetScore));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [cascadeStep, targetScore]);

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
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "good match":
        return "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
      default:
        return "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
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
            "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
        };
    }
  };

  // Toggle individual gap
  const toggleGap = (index: number) => {
    setExpandedGaps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Toggle individual strength
  const toggleStrength = (index: number) => {
    setExpandedStrengths((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Bulk expand/collapse for gaps
  const areAllGapsExpanded = filteredGaps.length > 0 && filteredGaps.every((_, idx) => expandedGaps[idx]);
  const handleToggleAllGaps = () => {
    if (areAllGapsExpanded) {
      setExpandedGaps({});
    } else {
      const next: Record<number, boolean> = {};
      filteredGaps.forEach((_, idx) => {
        next[idx] = true;
      });
      setExpandedGaps(next);
    }
  };

  // SVG circular gauge geometry
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63
  const strokeDashoffset = circumference - (circumference * displayedScore) / 100;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Chapter 1 & 2: Editorial Centerpiece Scorecard with Radial Gauge */}
      <div
        className={`transition-all duration-600 ease-out ${
          cascadeStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        } rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-5 sm:p-6 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Radial Dial & Core Status */}
          <div className="flex items-center gap-5">
            {/* SVG Circular Dial */}
            <div className="relative flex items-center justify-center shrink-0 w-20 h-20">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-stone-200/80 dark:stroke-stone-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className={`transition-all duration-700 ease-out ${
                    targetScore >= 80
                      ? "stroke-emerald-600 dark:stroke-emerald-400"
                      : targetScore >= 70
                      ? "stroke-sky-600 dark:stroke-sky-400"
                      : "stroke-amber-500 dark:stroke-amber-400"
                  }`}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={cascadeStep >= 2 ? strokeDashoffset : circumference}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-50">
                  {displayedScore}%
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400">
                  Index
                </span>
              </div>
            </div>

            {/* Title & Diagnostic Label */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Fit Audit Diagnostic
                </span>
                {candidateAnalysis && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${scoreBadgeColor()}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{candidateAnalysis.score}</span>
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Candidate Alignment Verification
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Baseline qualifications cross-referenced against extracted target role criteria.
              </p>
            </div>
          </div>

          {/* High-Level Editorial Metric Strip */}
          <div
            className={`transition-all duration-500 delay-150 ease-out ${
              cascadeStep >= 2 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
            } flex flex-wrap md:flex-col lg:flex-row items-stretch md:items-end lg:items-center gap-2.5 shrink-0`}
          >
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{strengthsList.length} Verified Strengths</span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{gapsList.length} Probes to Address</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter 3 & 4: Two Column Grid (Opportunity vs Strategic Audit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Target Role Details (~5 cols) */}
        <div
          className={`lg:col-span-5 flex flex-col rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-5 sm:p-6 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 space-y-5 transition-all duration-600 ease-out ${
            cascadeStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs uppercase tracking-wider">
              <Briefcase className="h-3.5 w-3.5 text-stone-500" />
              <span>Target Role Details</span>
            </div>
          </div>

          {jobDetails ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {jobDetails.job_title}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-600 dark:text-stone-400 mt-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                    <CompanyLogo company={jobDetails.job_company} size={15} />
                    <span>{jobDetails.job_company}</span>
                  </div>
                  {jobDetails.job_location && (
                    <div className="flex items-center gap-1 text-stone-500">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      <span>{jobDetails.job_location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements Chips */}
              <div>
                <h4 className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Key Competencies</span>
                  <span className="font-normal text-stone-400">
                    {(jobDetails.job_requirements || []).length} criteria
                  </span>
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(jobDetails.job_requirements || []).map((req, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-stone-200 bg-stone-50/80 px-2.5 py-1 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibilities with Expand Toggle to Prevent Vertical Bloat */}
              {(jobDetails.job_responsibilities || []).length > 0 && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      Core Responsibilities
                    </h4>
                    {jobDetails.job_responsibilities.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllResponsibilities(!showAllResponsibilities)}
                        className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {showAllResponsibilities
                          ? "Show fewer"
                          : `+${jobDetails.job_responsibilities.length - 4} more`}
                      </button>
                    )}
                  </div>
                  <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400 list-disc list-inside">
                    {(showAllResponsibilities
                      ? jobDetails.job_responsibilities
                      : jobDetails.job_responsibilities.slice(0, 4)
                    ).map((resp, idx) => (
                      <li key={idx} className="line-clamp-2" title={resp}>
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-stone-400">
              No target job details loaded yet.
            </div>
          )}
        </div>

        {/* Right Column: Strategic Evidence Audit (~7 cols) */}
        <div
          className={`lg:col-span-7 flex flex-col rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-5 sm:p-6 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 space-y-5 transition-all duration-600 ease-out ${
            cascadeStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Header & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-xs uppercase tracking-wider">
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Evidence Audit Dossier</span>
            </div>

            {/* View Mode Segmented Controls */}
            <div className="flex items-center rounded-lg border border-stone-200 p-0.5 bg-stone-50/80 text-xs dark:border-stone-700 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`cursor-pointer px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-stone-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-zinc-200"
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
                    : "text-stone-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-zinc-200"
                }`}
              >
                Actionable Gaps ({gapsList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("strengths")}
                className={`cursor-pointer px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "strengths"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-stone-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-zinc-200"
                }`}
              >
                Strengths ({strengthsList.length})
              </button>
            </div>
          </div>

          {candidateAnalysis ? (
            <div className="space-y-4 flex-1">
              {/* Chapter 3: Executive Strategic Fit Diagnostic (Warm Left Accent) */}
              <div
                className={`transition-all duration-500 ease-out ${
                  cascadeStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                } rounded-lg border-l-3 border-emerald-600 border border-stone-200/70 bg-stone-50/70 p-3.5 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-200 leading-relaxed space-y-1.5`}
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Strategic Fit Assessment</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400">{candidateAnalysis.user_message}</p>
              </div>

              {/* Relevant Experience Profile (if available) */}
              {candidateAnalysis.relevant_experience && (
                <div className="rounded-lg border border-sky-200/80 bg-sky-50/40 p-3.5 text-xs text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200 leading-relaxed space-y-1">
                  <div className="font-semibold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Relevant Experience Profile</span>
                  </div>
                  <p className="text-sky-900/80 dark:text-sky-300/80">
                    {candidateAnalysis.relevant_experience}
                  </p>
                </div>
              )}

              {/* Status Filter Pills for Gaps (when viewing All or Gaps) */}
              {(activeTab === "all" || activeTab === "gaps") && gapsList.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-stone-400 mr-1">Status:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter("all")}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedStatusFilter === "all"
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      All ({gapsList.length})
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

                  {/* Expand / Collapse All Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleAllGaps}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <ChevronsUpDown className="h-3 w-3" />
                    <span>{areAllGapsExpanded ? "Collapse all" : "Expand all"}</span>
                  </button>
                </div>
              )}

              {/* Dynamic Items Container (Collapsible Dossier Cards) */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {/* 1. Gaps List */}
                {(activeTab === "all" || activeTab === "gaps") && (
                  <div className="space-y-2.5">
                    {activeTab === "all" && (
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Identified Evidence Gaps ({filteredGaps.length})</span>
                      </h4>
                    )}

                    {filteredGaps.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-2">
                        No gaps match the selected status filter.
                      </p>
                    ) : (
                      filteredGaps.map((gap, idx) => {
                        const badge = getGapStatusBadge(gap.status);
                        const BadgeIcon = badge.icon;
                        const isExpanded = Boolean(expandedGaps[idx]);

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border transition-all duration-200 ${
                              isExpanded
                                ? "border-stone-300 bg-white shadow-2xs dark:border-stone-700 dark:bg-stone-900"
                                : "border-stone-200/90 bg-stone-50/50 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950/40"
                            }`}
                          >
                            {/* Clickable Header Row */}
                            <button
                              type="button"
                              onClick={() => toggleGap(idx)}
                              className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChevronDown
                                  className={`h-4 w-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-zinc-700" : ""
                                  }`}
                                />
                                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                  {gap.requirement}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.badgeClass}`}
                              >
                                <BadgeIcon className="h-3 w-3" />
                                <span>{badge.label}</span>
                              </span>
                            </button>

                            {/* Collapsible Detail Body */}
                            {isExpanded && (
                              <div className="px-3.5 pb-3.5 pt-0 text-xs text-stone-700 dark:text-stone-300 space-y-2 border-t border-stone-100 dark:border-stone-800 mt-0.5">
                                <p className="pt-2.5 leading-relaxed text-stone-600 dark:text-stone-400">
                                  {gap.gap}
                                </p>

                                {/* Related Mentions (if available) */}
                                {gap.evidence && gap.evidence.length > 0 && (
                                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 space-y-1">
                                    <span className="text-[10px] uppercase font-semibold text-stone-400 flex items-center gap-1">
                                      <Quote className="h-2.5 w-2.5" />
                                      <span>Related Mentions in Resume:</span>
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {gap.evidence.map((ev, evIdx) => (
                                        <span
                                          key={evIdx}
                                          className="rounded bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-700 dark:text-stone-300"
                                        >
                                          {ev}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified Strengths ({strengthsList.length})</span>
                      </h4>
                    )}

                    {strengthsList.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-2">
                        No verified strengths available.
                      </p>
                    ) : (
                      strengthsList.map((str, idx) => {
                        const isExpanded = Boolean(expandedStrengths[idx]);

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border transition-all duration-200 ${
                              isExpanded
                                ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                                : "border-emerald-200/70 bg-emerald-50/20 hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/10"
                            }`}
                          >
                            {/* Clickable Header Row */}
                            <button
                              type="button"
                              onClick={() => toggleStrength(idx)}
                              className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChevronDown
                                  className={`h-4 w-4 text-emerald-600 shrink-0 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                                <span className="font-semibold text-xs text-emerald-950 dark:text-emerald-300 truncate">
                                  {str.requirement}
                                </span>
                              </div>
                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 rounded-full px-2 py-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Verified</span>
                              </span>
                            </button>

                            {/* Collapsible Detail Body */}
                            {isExpanded && (
                              <div className="px-3.5 pb-3.5 pt-0 text-xs text-stone-800 dark:text-stone-200 space-y-2 border-t border-emerald-100 dark:border-emerald-900/40 mt-0.5">
                                <p className="pt-2.5 leading-relaxed text-stone-700 dark:text-stone-300">
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
                                          className="rounded bg-emerald-100/90 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 text-[10px]"
                                        >
                                          ✓ {ev}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-stone-400">
              No candidate analysis available.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Bar (Signature Warm Paper & Emerald HUD) */}
      <div
        className={`transition-all duration-600 ease-out ${
          cascadeStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        } flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-stone-200/90 bg-white/95 backdrop-blur-xs p-4 sm:p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/95`}
      >
        <div className="text-xs text-stone-600 dark:text-stone-400">
          Ready to probe missing metrics and ownership? Launching the interview generates targeted questions for each identified gap.
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {/* Tertiary: Finish Review */}
          <button
            type="button"
            onClick={() => {
              if (!isLoading && !pendingAction) {
                setPendingAction("done");
                onSelectAction("done");
              }
            }}
            disabled={isLoading || pendingAction !== null}
            className={`cursor-pointer rounded-lg border border-stone-200 px-3.5 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 transition-all duration-300 flex items-center gap-1.5 ${
              pendingAction !== null && pendingAction !== "done"
                ? "opacity-20 pointer-events-none scale-95"
                : ""
            }`}
          >
            {pendingAction === "done" && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
            <span>Finish Review</span>
          </button>

          {/* Secondary: Skip to Tailoring */}
          <div
            className={`transition-all duration-300 ${
              pendingAction !== null && pendingAction !== "tailor"
                ? "opacity-20 pointer-events-none scale-95"
                : ""
            }`}
          >
            <TelemetryButton
              isLoading={pendingAction === "tailor"}
              disabled={isLoading || (pendingAction !== null && pendingAction !== "tailor")}
              onClick={() => {
                if (!isLoading && !pendingAction) {
                  setPendingAction("tailor");
                  onSelectAction("tailor");
                }
              }}
              stages={DIRECT_TAILOR_STAGES}
              cycleIntervalMs={2200}
              variant="secondary"
              systemTag="DIRECT TAILOR ENGINE"
            >
              <div className="flex items-center gap-2 text-xs font-semibold px-1 py-0.5">
                <Wand2 className="h-3.5 w-3.5 text-stone-500" />
                <span>Skip to Tailoring</span>
              </div>
            </TelemetryButton>
          </div>

          {/* Primary Hero: Begin Evidence Gathering */}
          <div
            className={`transition-all duration-300 ${
              pendingAction !== null && pendingAction !== "need_more_info"
                ? "opacity-20 pointer-events-none scale-95"
                : ""
            }`}
          >
            <TelemetryButton
              isLoading={pendingAction === "need_more_info"}
              disabled={isLoading || (pendingAction !== null && pendingAction !== "need_more_info")}
              onClick={() => {
                if (!isLoading && !pendingAction) {
                  setPendingAction("need_more_info");
                  onSelectAction("need_more_info");
                }
              }}
              stages={INTERVIEW_PLANNER_STAGES}
              cycleIntervalMs={2000}
              variant="primary"
              systemTag="INTERVIEW PLANNER ENGINE"
            >
              <div className="flex items-center gap-2 text-xs font-semibold px-2 py-0.5">
                {/* Breathing green beacon dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-halo-breathe absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Begin Evidence Gathering ({gapsList.length} Gaps)</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </TelemetryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
