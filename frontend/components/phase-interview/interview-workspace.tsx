"use client";

import { useState, useEffect } from "react";
import {
  CandidateAnalysis,
  EvidenceWithDetails,
  InterviewDetails,
  InterviewPlan,
  InterruptPayload,
  JobDetails,
} from "@/lib/types";
import { ChatMessage } from "@/hooks/use-tailoring-session";
import { useRotatingPhrase, SYNTHESIZING_PHRASES } from "@/hooks/use-rotating-phrase";
import { CompanyLogo } from "@/components/company-logo";
import { TelemetryButton, TelemetryStage } from "@/components/telemetry-button";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Wand2,
  Layers,
  Check,
  Pause,
  Play,
  Lock,
} from "lucide-react";

const TAILORING_ENGINE_STAGES: TelemetryStage[] = [
  {
    stage: "STAGE [1/4]",
    label: "Extracting verified interview evidence & metrics...",
    detail: "Mining conversational answers • structuring evidence bank",
  },
  {
    stage: "STAGE [2/4]",
    label: "Synthesizing high-impact tailored bullet points...",
    detail: "Infusing interview metrics • XYZ formula construction",
  },
  {
    stage: "STAGE [3/4]",
    label: "Running factual grounding & rubric critique...",
    detail: "Auditing against resume baseline • verification score check",
  },
  {
    stage: "STAGE [4/4]",
    label: "Compiling final proposal review workspace...",
    detail: "Preparing diff comparisons • finalizing checkpointer thread",
  },
];

interface InterviewWorkspaceProps {
  jobDetails: JobDetails | null;
  candidateAnalysis: CandidateAnalysis | null;
  interviewPlan: InterviewPlan | null;
  activeInterrupt?: InterruptPayload | null;
  completedTopicIds: string[];
  evidenceWithDetails: EvidenceWithDetails[];
  activeTopicId: string | null;
  investigationMessages: ChatMessage[];
  isLoading: boolean;
  onSelectTopic: (topicId: string) => void;
  onSubmitAnswer: (answer: string) => void;
  onProceedToTailoring: () => void;
}

export function InterviewWorkspace({
  jobDetails,
  candidateAnalysis,
  interviewPlan,
  activeInterrupt,
  completedTopicIds,
  evidenceWithDetails,
  activeTopicId,
  investigationMessages,
  isLoading,
  onSelectTopic,
  onSubmitAnswer,
  onProceedToTailoring,
}: InterviewWorkspaceProps) {
  const [answerInput, setAnswerInput] = useState("");
  const [showStrengths, setShowStrengths] = useState(false);
  const [showJobDrawer, setShowJobDrawer] = useState(false);
  const [selectedTopicPending, setSelectedTopicPending] = useState<string | null>(null);
  const [isProceeding, setIsProceeding] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const synthesizingPhrase = useRotatingPhrase(SYNTHESIZING_PHRASES, isProceeding);

  // Clear pending states when loading resolves
  useEffect(() => {
    if (!isLoading) {
      setSelectedTopicPending(null);
      setIsProceeding(false);
    }
  }, [isLoading]);

  // When active topic changes or clears, reset pause state
  useEffect(() => {
    setIsPaused(false);
  }, [activeTopicId]);

  // Derive topics from activeInterrupt.options (investigation_selection) or interviewPlan
  const interruptTopics: InterviewDetails[] = (activeInterrupt?.options || [])
    .filter((opt) => opt.id && opt.id !== "end")
    .map((opt) => ({
      topic_id: opt.id,
      topic: opt.topic || opt.label || opt.id,
      priority: (opt.priority as "High" | "Medium" | "Low") || "Medium",
      reason: opt.reason || "",
      objective: opt.objective || "",
      job_requirement: opt.job_requirement || "",
      relevant_experience: [],
    }));

  const planTopics: InterviewDetails[] = interviewPlan?.interview_plan || [];

  // Merge map by topic_id
  const topicsMap = new Map<string, InterviewDetails>();
  planTopics.forEach((t) => topicsMap.set(t.topic_id, t));
  interruptTopics.forEach((t) => {
    const existing = topicsMap.get(t.topic_id);
    topicsMap.set(t.topic_id, { ...existing, ...t });
  });

  const topics: InterviewDetails[] =
    topicsMap.size > 0
      ? Array.from(topicsMap.values())
      : interruptTopics.length > 0
      ? interruptTopics
      : planTopics;

  const activeTopic =
    topics.find((t) => t.topic_id === activeTopicId) ||
    planTopics.find((t) => t.topic_id === activeTopicId) ||
    (activeTopicId
      ? {
          topic_id: activeTopicId,
          topic: "Target Requirement Probe",
          priority: "High" as const,
          reason: "",
          objective: "",
          job_requirement: "",
          relevant_experience: [],
        }
      : null);

  const remainingTopics = topics.filter(
    (t) => !completedTopicIds.includes(t.topic_id)
  );

  const hasActiveProbe = Boolean(activeTopicId && activeTopic);
  const isInChatView = hasActiveProbe && !isPaused;

  const handleSelectTopicClick = (topicId: string) => {
    // Prevent starting another topic if a probe is already active or in progress
    if (isLoading || selectedTopicPending || isProceeding || hasActiveProbe) return;
    setSelectedTopicPending(topicId);
    onSelectTopic(topicId);
  };

  const handleProceedClick = () => {
    if (isLoading || isProceeding) return;
    setIsProceeding(true);
    onProceedToTailoring();
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerInput.trim() || isLoading) return;
    const text = answerInput.trim();
    setAnswerInput("");
    onSubmitAnswer(text);
  };

  // Respectful, positive wrap-up that extracts and finalizes evidence without claiming lack of experience
  const handleWrapUpTopic = () => {
    if (isLoading) return;
    onSubmitAnswer(
      "I have provided all the relevant details for this experience. Please summarize and record any verified tools, metrics, or ownership discussed, and let's proceed to the next topic."
    );
  };

  // Fallback skip for requirements the candidate truly never touched
  const handlePreFillSkip = () => {
    setAnswerInput(
      "I do not have direct verifiable experience with this requirement, let's move on to the next topic."
    );
  };

  const priorityBadge = (priority: "High" | "Medium" | "Low") => {
    switch (priority) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Paused Probe Global Banner (appears if active probe is paused) */}
      {hasActiveProbe && isPaused && activeTopic && (
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 shrink-0 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <span>Active Probe Paused: {activeTopic.topic}</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-semibold border ${priorityBadge(activeTopic.priority)}`}>
                  {activeTopic.priority}
                </span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                The Agent has held your conversation in memory. Review the job requirements or evidence locker, and resume whenever ready.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(false)}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-all shrink-0"
          >
            <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
            <span>Resume Probe →</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANE: Persistent Evidence Tracker & Focus Area (~4 cols)            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Case 1: In Active Focus Chat View */}
          {isInChatView && activeTopic ? (
            <div className="rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3.5">
                <div className="flex items-center gap-2">
                  {/* Breathing emerald beacon */}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-halo-breathe absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Active Probe Focus
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowJobDrawer(!showJobDrawer)}
                  className="text-[11px] font-medium text-stone-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-zinc-200 underline decoration-stone-300 cursor-pointer"
                >
                  {showJobDrawer ? "Hide Job" : "View Job ↗"}
                </button>
              </div>

              {/* Slide-out Job Drawer Preview */}
              {showJobDrawer && jobDetails && (
                <div className="p-3 bg-stone-50/80 dark:bg-zinc-950/60 rounded-lg border border-stone-200/80 dark:border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                    <CompanyLogo company={jobDetails.job_company} size={15} />
                    <span>{jobDetails.job_title} @ {jobDetails.job_company}</span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-400 max-h-36 overflow-y-auto pr-1 text-[11px]">
                    {jobDetails.job_requirements.join(" • ")}
                  </div>
                </div>
              )}

              {/* Focused Topic Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${priorityBadge(activeTopic.priority)}`}>
                    {activeTopic.priority} Priority Gap
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Topic {completedTopicIds.length + 1} of {topics.length}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {activeTopic.topic}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Target: </span>
                    {activeTopic.job_requirement}
                  </p>
                </div>

                {activeTopic.objective && (
                  <div className="rounded-lg bg-stone-50/70 dark:bg-stone-800/50 p-2.5 text-xs text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Objective: </span>
                    {activeTopic.objective}
                  </div>
                )}
              </div>

              {/* Queued Topics Summary & Pause Action */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-500">
                  {Math.max(0, remainingTopics.length - 1)} other {remainingTopics.length - 1 === 1 ? "topic" : "topics"} queued
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaused(true)}
                  className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-zinc-100 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 px-2 py-1 rounded transition-colors"
                >
                  <Pause className="h-3 w-3" />
                  <span>Pause & Review</span>
                </button>
              </div>
            </div>
          ) : (
            /* Case 2: In Topic Deck View or Paused Mode */
            <div className="rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 overflow-hidden">
              <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-stone-500" />
                    <span>Evidence Targets</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {completedTopicIds.length} of {topics.length} topics secured
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJobDrawer(!showJobDrawer)}
                  className="text-[11px] font-medium text-stone-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-zinc-200 underline decoration-stone-300 cursor-pointer"
                >
                  {showJobDrawer ? "Hide Job" : "View Job ↗"}
                </button>
              </div>

              {/* Slide-out Job Drawer Preview */}
              {showJobDrawer && jobDetails && (
                <div className="p-3.5 bg-stone-50/80 dark:bg-zinc-950/60 border-b border-stone-200 dark:border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                    <CompanyLogo company={jobDetails.job_company} size={16} />
                    <span>{jobDetails.job_title} @ {jobDetails.job_company}</span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-400 max-h-36 overflow-y-auto pr-1 text-[11px]">
                    {jobDetails.job_requirements.join(" • ")}
                  </div>
                </div>
              )}

              {/* Topics Priority List */}
              <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                {topics.map((t) => {
                  const isSecured = completedTopicIds.includes(t.topic_id);
                  const isCurrentActive = t.topic_id === activeTopicId;
                  const isPending = selectedTopicPending === t.topic_id;

                  // If an active probe exists but is paused, other topics are locked
                  const isLockedByActiveProbe = hasActiveProbe && !isCurrentActive && !isSecured;

                  return (
                    <div
                      key={t.topic_id}
                      onClick={() => {
                        if (isSecured || isLockedByActiveProbe || isLoading || selectedTopicPending) return;
                        if (isCurrentActive && isPaused) {
                          setIsPaused(false);
                          return;
                        }
                        handleSelectTopicClick(t.topic_id);
                      }}
                      className={`rounded-lg border p-3 text-xs transition-all ${
                        isCurrentActive
                          ? "border-amber-400 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30 shadow-xs"
                          : isSecured
                          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : isLockedByActiveProbe
                          ? "border-stone-200/60 bg-stone-50/40 dark:border-stone-800 dark:bg-stone-900/40 opacity-60 cursor-not-allowed"
                          : isPending
                          ? "border-stone-400 bg-stone-100 dark:bg-stone-800 opacity-75 cursor-not-allowed"
                          : "border-stone-200/90 hover:border-stone-400 bg-white dark:border-stone-800 dark:bg-stone-900 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${priorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>

                        {isSecured ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Secured</span>
                          </span>
                        ) : isCurrentActive && isPaused ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <Pause className="h-3 w-3" />
                            <span>Paused · Resume →</span>
                          </span>
                        ) : isCurrentActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Probing</span>
                          </span>
                        ) : isLockedByActiveProbe ? (
                          <span className="flex items-center gap-1 text-[10px] text-stone-400">
                            <Lock className="h-3 w-3" />
                            <span>Queued</span>
                          </span>
                        ) : isPending ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-stone-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Opening...</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400 hover:text-zinc-800 dark:hover:text-zinc-200">
                            Click to probe →
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.topic}
                      </div>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5" title={t.job_requirement}>
                        {t.job_requirement}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-Time Evidence Locker (Always accessible) */}
          <div className="rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span>Accumulated Evidence Bank ({evidenceWithDetails.length})</span>
            </h4>

            {evidenceWithDetails.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-3 text-center">
                Answer interview questions to deposit verified metrics and technologies here.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {evidenceWithDetails.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-zinc-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-zinc-200 space-y-1"
                  >
                    <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>{item.job_requirement}</span>
                    </div>

                    {item.evidence && (
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-0.5">
                        {item.evidence.technologies && item.evidence.technologies.length > 0 && (
                          <div>
                            <span className="font-medium text-stone-700 dark:text-stone-300">Tech: </span>
                            {item.evidence.technologies.join(", ")}
                          </div>
                        )}
                        {item.evidence.metrics && item.evidence.metrics.length > 0 && (
                          <div>
                            <span className="font-medium text-stone-700 dark:text-stone-300">Metrics: </span>
                            {item.evidence.metrics.join("; ")}
                          </div>
                        )}
                        {item.evidence.ownership && item.evidence.ownership.length > 0 && (
                          <div>
                            <span className="font-medium text-stone-700 dark:text-stone-300">Role: </span>
                            {item.evidence.ownership.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Confirmed Baseline Strengths */}
          {candidateAnalysis?.strengths && candidateAnalysis.strengths.length > 0 && (
            <div className="rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs p-3 shadow-2xs dark:border-stone-800 dark:bg-stone-900/90">
              <button
                type="button"
                onClick={() => setShowStrengths(!showStrengths)}
                className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Base Resume Strengths ({candidateAnalysis.strengths.length})</span>
                </div>
                {showStrengths ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showStrengths && (
                <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto text-[11px] text-stone-600 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {candidateAnalysis.strengths.map((str, idx) => {
                    const req = typeof str === "string" ? str : str.requirement;
                    const expl = typeof str === "string" ? "" : str.explanation;
                    return (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{req}</span>
                          {expl && <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">{expl}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: Guided Interview Workspace (~8 cols)                         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-stone-200/90 bg-white/90 backdrop-blur-xs shadow-2xs dark:border-stone-800 dark:bg-stone-900/90 min-h-[560px]">
          {isInChatView && activeTopic ? (
            /* ================= ACTIVE QUESTION PROBE VIEW ================= */
            <div className="flex flex-col flex-1">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 rounded-t-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${priorityBadge(activeTopic.priority)}`}>
                      {activeTopic.priority} Priority
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {activeTopic.topic}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pause Probe Button */}
                    <button
                      type="button"
                      onClick={() => setIsPaused(true)}
                      disabled={isLoading || isProceeding}
                      className={`cursor-pointer text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 ${
                        isProceeding ? "opacity-20 pointer-events-none scale-95" : ""
                      }`}
                    >
                      <Pause className="h-3 w-3 text-stone-500" />
                      <span>Pause Probe</span>
                    </button>

                    <div className="transition-all duration-300">
                      <TelemetryButton
                        isLoading={isProceeding}
                        disabled={isLoading && !isProceeding}
                        onClick={handleProceedClick}
                        stages={TAILORING_ENGINE_STAGES}
                        cycleIntervalMs={2400}
                        variant="secondary"
                        systemTag="TAILORING & CRITIQUE ENGINE"
                      >
                        <span className="text-xs font-medium text-stone-700 hover:text-zinc-900 dark:text-stone-300 dark:hover:text-zinc-100 flex items-center gap-1 px-1">
                          Finish Interview & Tailor →
                        </span>
                      </TelemetryButton>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <p>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Objective: </span>
                    {activeTopic.objective}
                  </p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[380px]">
                {investigationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                          : "bg-stone-100 text-zinc-900 dark:bg-stone-800 dark:text-zinc-100 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-70">
                        {msg.role === "assistant" ? (
                          <>
                            <Sparkles className="h-3 w-3 text-emerald-500" />
                            <span>Interview Agent</span>
                          </>
                        ) : (
                          <span>You</span>
                        )}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-stone-100 dark:bg-stone-800 px-4 py-3 text-sm text-stone-500 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-stone-600 dark:text-stone-400" />
                      <span>Analyzing your response & checking evidence...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Response Composer */}
              <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 rounded-b-xl space-y-3">
                {/* Guidance Chips & Safe Conclusion Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span className="italic flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
                    Tip: Name specific tools, team scale, and measurable results.
                  </span>

                  <div className="flex items-center gap-3">
                    {/* Respectful Wrap Up Action */}
                    <button
                      type="button"
                      onClick={handleWrapUpTopic}
                      disabled={isLoading}
                      className="cursor-pointer bg-transparent hover:underline disabled:opacity-40 disabled:hover:no-underline disabled:cursor-not-allowed text-stone-700 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400 font-semibold text-xs flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Wrap Up & Save Evidence</span>
                    </button>

                    <span className="text-stone-300 dark:text-stone-700">•</span>

                    {/* Rare skip option */}
                    <button
                      type="button"
                      onClick={handlePreFillSkip}
                      disabled={isLoading}
                      className="cursor-pointer bg-transparent hover:underline disabled:opacity-40 disabled:hover:no-underline disabled:cursor-not-allowed text-stone-400 hover:text-rose-600 text-[11px]"
                    >
                      Skip topic
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSend} className="space-y-2">
                  <textarea
                    rows={3}
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Describe your hands-on experience, responsibilities, or specific project outcomes..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-zinc-900 placeholder:text-stone-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-stone-700 dark:bg-stone-800 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      Press <kbd className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">Enter ↵</kbd> to submit, <kbd className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">Shift+Enter</kbd> for newline
                    </span>

                    <button
                      type="submit"
                      disabled={isLoading || !answerInput.trim()}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-stone-200 disabled:text-stone-500 disabled:border-stone-300 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-stone-800 dark:disabled:text-stone-400 transition-all"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Evaluating Response...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Response</span>
                          <Send className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* ================= TOPIC DECK SELECTION VIEW ================= */
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 mb-3 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Interview Topic Deck</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {hasActiveProbe && isPaused
                    ? "Active Investigation Paused"
                    : "Select an Area to Investigate"}
                </h3>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 max-w-xl">
                  {hasActiveProbe && isPaused
                    ? `You are currently probing "${activeTopic?.topic}". Resume your probe below, or finish and proceed to tailoring.`
                    : "Pick any prioritized gap topic below to uncover factual evidence. You can probe as many or as few as you like before proceeding to resume tailoring."}
                </p>
              </div>

              {/* Deck Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {remainingTopics.length > 0 ? (
                  remainingTopics.map((t) => {
                    const isCurrentActive = t.topic_id === activeTopicId;
                    const isPending = selectedTopicPending === t.topic_id;
                    const isLockedByActiveProbe = hasActiveProbe && !isCurrentActive;

                    return (
                      <div
                        key={t.topic_id}
                        onClick={() => {
                          if (isLockedByActiveProbe || isLoading || selectedTopicPending || isProceeding) return;
                          if (isCurrentActive && isPaused) {
                            setIsPaused(false);
                            return;
                          }
                          handleSelectTopicClick(t.topic_id);
                        }}
                        className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between space-y-3 ${
                          isCurrentActive && isPaused
                            ? "border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/40 shadow-sm ring-1 ring-amber-400 cursor-pointer"
                            : isLockedByActiveProbe
                            ? "border-stone-200/60 bg-stone-50/40 dark:border-stone-800 dark:bg-stone-900/40 opacity-60 cursor-not-allowed"
                            : isPending
                            ? "border-stone-400 bg-stone-100 dark:bg-stone-800 opacity-75 cursor-not-allowed"
                            : "border-stone-200 hover:border-zinc-900 hover:shadow-md dark:border-stone-800 dark:hover:border-stone-100 cursor-pointer bg-stone-50/50 dark:bg-zinc-950/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${priorityBadge(t.priority)}`}>
                              {t.priority} Priority
                            </span>
                            <span className="text-xs font-semibold flex items-center gap-1">
                              {isCurrentActive && isPaused ? (
                                <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1 font-bold">
                                  <Play className="h-3 w-3 fill-current" />
                                  <span>Resume Probe →</span>
                                </span>
                              ) : isLockedByActiveProbe ? (
                                <span className="text-stone-400 flex items-center gap-1 font-normal text-[11px]">
                                  <Lock className="h-3 w-3" />
                                  <span>Queued</span>
                                </span>
                              ) : isPending ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin text-stone-600" />
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Start Probe →</span>
                              )}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {t.topic}
                          </h4>
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                            {t.reason}
                          </p>
                        </div>

                        <div className="text-[11px] text-stone-400 border-t border-stone-200/60 dark:border-stone-800 pt-2 truncate">
                          Target: {t.job_requirement}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-10 text-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      All Identified Gap Topics Have Been Probed!
                    </h4>
                    <p className="text-xs text-stone-500 mt-1">
                      You are ready to generate fact-checked, tailored resume bullets.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom CTA Bar */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-stone-500">
                  {completedTopicIds.length} topics completed • Ready to proceed at any time.
                </span>

                <TelemetryButton
                  isLoading={isProceeding}
                  disabled={isLoading && !isProceeding}
                  onClick={handleProceedClick}
                  stages={TAILORING_ENGINE_STAGES}
                  cycleIntervalMs={2400}
                  variant="primary"
                  systemTag="TAILORING & CRITIQUE ENGINE"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold px-2 py-0.5">
                    <Wand2 className="h-4 w-4" />
                    <span>Proceed to Resume Tailoring</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </TelemetryButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
