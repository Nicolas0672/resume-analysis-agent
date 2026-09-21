"use client";

import { useState, useMemo } from "react";
import {
  Feedbacks,
  InterviewPlan,
  ResumeStructure,
  TailorAnalysis,
} from "@/lib/types";
import { useRotatingPhrase } from "@/hooks/use-rotating-phrase";
import { TactilePaperCanvas } from "./tactile-paper-canvas";
import { EditorialDebrief } from "./editorial-debrief";
import {
  ArrowRight,
  ShieldCheck,
  Wand2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface TailoringWorkspaceProps {
  resumeData: ResumeStructure | null;
  resumeToEdit: ResumeStructure | null;
  tailorAnalysis: TailorAnalysis | null;
  feedbacks: Feedbacks | null;
  appliedTopicIds: string[];
  interviewPlan?: InterviewPlan | null;
  isSynthesizing: boolean;
  onApplyTopic: (topicId: string) => Promise<void>;
  onCustomTailoring: (topicId: string, sentenceId: number, newText: string) => Promise<void>;
  onEditResumeBullet: (sentenceId: number, newText: string) => Promise<void>;
  onDeleteBullet: (sentenceId: number) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
  onFinishReview: () => void;
}

export function TailoringWorkspace({
  resumeData,
  resumeToEdit,
  tailorAnalysis,
  feedbacks,
  appliedTopicIds,
  interviewPlan,
  isSynthesizing,
  onApplyTopic,
  onCustomTailoring,
  onEditResumeBullet,
  onDeleteBullet,
  onDeleteEntry,
  onFinishReview,
}: TailoringWorkspaceProps) {
  const rotatingPhrase = useRotatingPhrase(isSynthesizing);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [highlightSentenceIds, setHighlightSentenceIds] = useState<number[]>([]);
  const [showSoftGateModal, setShowSoftGateModal] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  // Determine all topic IDs from tailor analysis
  const allTopicIds = useMemo(() => {
    const set = new Set<string>();
    tailorAnalysis?.tailor_matched_list?.forEach((m) => set.add(m.topic_id));
    tailorAnalysis?.tailor_unmatched_list?.forEach((u) => set.add(u.topic_id));
    return Array.from(set);
  }, [tailorAnalysis]);

  // Find unapplied topics
  const unappliedTopicIds = useMemo(() => {
    return allTopicIds.filter((tid) => !appliedTopicIds.includes(tid));
  }, [allTopicIds, appliedTopicIds]);

  const handleFinishClick = () => {
    if (unappliedTopicIds.length > 0) {
      setShowSoftGateModal(true);
    } else {
      onFinishReview();
    }
  };

  const handleApplyAllAndFinish = async () => {
    setIsApplyingAll(true);
    try {
      for (const tid of unappliedTopicIds) {
        await onApplyTopic(tid);
      }
      setShowSoftGateModal(false);
      onFinishReview();
    } catch (err) {
      console.error("Failed to apply remaining topics", err);
    } finally {
      setIsApplyingAll(false);
    }
  };

  // =========================================================================
  // SYNTHESIS PROGRESS SCREEN (while agent generates proposals & verifies)
  // =========================================================================
  if (isSynthesizing) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 px-4 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg">
          <Wand2 className="h-8 w-8 animate-pulse text-emerald-400 dark:text-emerald-600" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 min-h-[2rem] transition-all">
            {rotatingPhrase}
          </h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto">
            Our agent maps verified evidence to your resume, structures high-impact XYZ bullets, and runs an automated factuality critic to eliminate hallucinations.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 text-left space-y-3 max-w-md mx-auto text-xs">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Mapped evidence provenance to exact resume entries</span>
          </div>
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Formulated XYZ achievement bullets (Accomplished X by doing Z)</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>{rotatingPhrase}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Phase 3: Executive Co-Author Studio
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              <span>100% Critic Fact-Checked</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            Review Tailored Recommendations & Refine Working Draft
          </h2>
          <p className="text-xs text-zinc-500">
            Review agent-synthesized topic packages on the right, apply enhancements to your live resume sheet on the left, and refine any bullet in-place.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {unappliedTopicIds.length === 0 && allTopicIds.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
              <CheckCircle2 className="h-4 w-4" />
              <span>All Topics Applied</span>
            </div>
          )}
          <button
            onClick={handleFinishClick}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs transition-all shrink-0 ${
              unappliedTopicIds.length === 0 && allTopicIds.length > 0
                ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/20"
                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            }`}
          >
            <span>Finish Review & Compare</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dual-Pane Layout: Left = Tactile Canvas (55%), Right = Editorial Debrief (45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[780px]">
        {/* Left Pane: Tactile Paper Canvas (7 cols = ~58%) */}
        <div className="lg:col-span-7 h-full">
          <TactilePaperCanvas
            resume={resumeToEdit || resumeData}
            highlightSentenceIds={highlightSentenceIds}
            onEditBullet={onEditResumeBullet}
            onDeleteBullet={onDeleteBullet}
            onDeleteEntry={onDeleteEntry}
          />
        </div>

        {/* Right Pane: Editorial Debrief Inspector (5 cols = ~42%) */}
        <div className="lg:col-span-5 h-full">
          <EditorialDebrief
            tailorAnalysis={tailorAnalysis}
            feedbacks={feedbacks}
            appliedTopicIds={appliedTopicIds}
            interviewPlan={interviewPlan}
            activeTopicId={activeTopicId}
            onSelectTopic={setActiveTopicId}
            onApplyTopic={onApplyTopic}
            onCustomTailoring={onCustomTailoring}
            onHighlightSentenceIds={setHighlightSentenceIds}
          />
        </div>
      </div>

      {/* Soft Gate Confirmation Modal */}
      {showSoftGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Unapplied Topic Proposals
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              You have <span className="font-semibold text-zinc-900 dark:text-zinc-100">{unappliedTopicIds.length}</span> unapplied tailored topic(s). Would you like to apply all verified recommendations before finishing, or proceed with your current draft as-is?
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleApplyAllAndFinish}
                disabled={isApplyingAll}
                className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                {isApplyingAll ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Apply All & Finish</span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowSoftGateModal(false);
                  onFinishReview();
                }}
                disabled={isApplyingAll}
                className="cursor-pointer px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Proceed As-Is
              </button>

              <button
                onClick={() => setShowSoftGateModal(false)}
                disabled={isApplyingAll}
                className="cursor-pointer px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Keep Reviewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
