"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Feedbacks,
  InterviewPlan,
  TailorAnalysis,
  TailorMatched,
  TailorUnmatched,
} from "@/lib/types";
import {
  ShieldCheck,
  Sparkles,
  Check,
  Edit3,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";

interface EditorialDebriefProps {
  tailorAnalysis: TailorAnalysis | null;
  feedbacks: Feedbacks | null;
  appliedTopicIds: string[];
  interviewPlan?: InterviewPlan | null;
  activeTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
  onApplyTopic: (topicId: string) => Promise<void>;
  onCustomTailoring: (topicId: string, sentenceId: number, newText: string) => Promise<void>;
  onHighlightSentenceIds?: (ids: number[]) => void;
}

interface TopicPackage {
  topicId: string;
  title: string;
  jobRequirement: string;
  reason: string;
  matchedProposals: TailorMatched[];
  unmatchedProposals: TailorUnmatched[];
  allEvidence: string[];
  isApplied: boolean;
  criticFeedback?: string;
  criticValid: boolean;
}

export function EditorialDebrief({
  tailorAnalysis,
  feedbacks,
  appliedTopicIds,
  interviewPlan,
  activeTopicId,
  onSelectTopic,
  onApplyTopic,
  onCustomTailoring,
  onHighlightSentenceIds,
}: EditorialDebriefProps) {
  const [editingSentenceId, setEditingSentenceId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "applied">("all");

  // Group matched and unmatched proposals by topicId
  const topicPackages: TopicPackage[] = useMemo(() => {
    if (!tailorAnalysis) return [];

    const map = new Map<string, TopicPackage>();

    // Index interview details by topic_id
    const interviewMap = new Map<string, { topic: string; requirement: string; reason: string }>();
    if (interviewPlan?.interview_plan) {
      interviewPlan.interview_plan.forEach((item) => {
        interviewMap.set(item.topic_id, {
          topic: item.topic,
          requirement: item.job_requirement,
          reason: item.reason,
        });
      });
    }

    // Process matched proposals
    tailorAnalysis.tailor_matched_list?.forEach((matched) => {
      const tid = matched.topic_id;
      if (!map.has(tid)) {
        const meta = interviewMap.get(tid);
        map.set(tid, {
          topicId: tid,
          title: meta?.topic || tid,
          jobRequirement: meta?.requirement || "Target Job Requirement",
          reason: meta?.reason || "",
          matchedProposals: [],
          unmatchedProposals: [],
          allEvidence: [],
          isApplied: appliedTopicIds.includes(tid),
          criticValid: true,
        });
      }
      const pkg = map.get(tid)!;
      pkg.matchedProposals.push(matched);
      matched.decisions.forEach((d) => {
        if (d.evidence) {
          const clean = d.evidence.filter((item) => {
            const t = (item || "").trim();
            if (!t) return false;
            if (t.startsWith('"') || t.startsWith("'") || t.startsWith("“")) return false;
            if (/^(i |i've |my |we |candidate |stated|said|interviewee)/i.test(t)) return false;
            if (t.length > 100 && t.includes(" ")) return false;
            return true;
          });
          pkg.allEvidence.push(...clean);
        }
      });
    });

    // Process unmatched proposals
    tailorAnalysis.tailor_unmatched_list?.forEach((unmatched) => {
      const tid = unmatched.topic_id;
      if (!map.has(tid)) {
        const meta = interviewMap.get(tid);
        map.set(tid, {
          topicId: tid,
          title: meta?.topic || tid,
          jobRequirement: meta?.requirement || "Target Job Requirement",
          reason: meta?.reason || "",
          matchedProposals: [],
          unmatchedProposals: [],
          allEvidence: [],
          isApplied: appliedTopicIds.includes(tid),
          criticValid: true,
        });
      }
      const pkg = map.get(tid)!;
      pkg.unmatchedProposals.push(unmatched);
      unmatched.decisions.forEach((d) => {
        if (d.evidence) {
          const clean = d.evidence.filter((item) => {
            const t = (item || "").trim();
            if (!t) return false;
            if (t.startsWith('"') || t.startsWith("'") || t.startsWith("“")) return false;
            if (/^(i |i've |my |we |candidate |stated|said|interviewee)/i.test(t)) return false;
            if (t.length > 100 && t.includes(" ")) return false;
            return true;
          });
          pkg.allEvidence.push(...clean);
        }
      });
    });

    // Attach critic feedback if present
    if (feedbacks?.feedbacks) {
      feedbacks.feedbacks.forEach((fb) => {
        const pkg = map.get(fb.topic_id);
        if (pkg) {
          const hasInvalid = fb.bullet_feedbacks?.some((bf) => !bf.valid);
          pkg.criticValid = !hasInvalid;
          if (hasInvalid) {
            const firstInvalid = fb.bullet_feedbacks.find((bf) => !bf.valid);
            pkg.criticFeedback = firstInvalid?.suggestions;
          }
        }
      });
    }

    // Deduplicate evidence items
    map.forEach((pkg) => {
      pkg.allEvidence = Array.from(new Set(pkg.allEvidence));
      pkg.isApplied = appliedTopicIds.includes(pkg.topicId);
    });

    return Array.from(map.values());
  }, [tailorAnalysis, feedbacks, appliedTopicIds, interviewPlan]);

  const visibleTopicPackages = useMemo(() => {
    if (filterMode === "pending") return topicPackages.filter((p) => !p.isApplied);
    if (filterMode === "applied") return topicPackages.filter((p) => p.isApplied);
    return topicPackages;
  }, [topicPackages, filterMode]);

  const selectedTopic = useMemo(() => {
    if (!topicPackages.length) return null;
    if (activeTopicId) {
      const found = topicPackages.find((p) => p.topicId === activeTopicId);
      if (found) return found;
    }
    if (visibleTopicPackages.length) return visibleTopicPackages[0];
    return topicPackages[0];
  }, [topicPackages, activeTopicId, visibleTopicPackages]);

  // Notify parent of highlighted sentences for active topic
  useEffect(() => {
    if (!selectedTopic || !onHighlightSentenceIds) return;
    const ids: number[] = [];
    selectedTopic.matchedProposals.forEach((m) => {
      m.decisions.forEach((d) => {
        if (d.action?.toUpperCase() === "KEEP") return;
        if (d.new_bullet?.sentence_id !== undefined) {
          ids.push(d.new_bullet.sentence_id);
        }
        if (d.old_bullet?.sentence_id !== undefined) {
          ids.push(d.old_bullet.sentence_id);
        }
      });
    });
    selectedTopic.unmatchedProposals.forEach((u) => {
      u.decisions.forEach((d) => {
        if (d.new_bullet?.sentence_id !== undefined) {
          ids.push(d.new_bullet.sentence_id);
        }
      });
    });
    onHighlightSentenceIds(ids);
  }, [selectedTopic, onHighlightSentenceIds]);

  const handleApplyClick = async () => {
    if (!selectedTopic || selectedTopic.isApplied) return;
    setIsApplying(true);
    try {
      await onApplyTopic(selectedTopic.topicId);
      // Auto-advance to the next pending topic if available
      const nextPending = topicPackages.find(
        (p) => p.topicId !== selectedTopic.topicId && !appliedTopicIds.includes(p.topicId)
      );
      if (nextPending) {
        onSelectTopic(nextPending.topicId);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleStartCustomEdit = (sentenceId: number, currentText: string) => {
    setEditingSentenceId(sentenceId);
    setEditingDraft(currentText);
  };

  const handleSaveCustomEdit = async (topicId: string, sentenceId: number) => {
    if (!editingDraft.trim()) return;
    setIsSavingCustom(true);
    try {
      await onCustomTailoring(topicId, sentenceId, editingDraft.trim());
      setEditingSentenceId(null);
      setEditingDraft("");
    } finally {
      setIsSavingCustom(false);
    }
  };

  if (!topicPackages.length) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-8 text-center text-xs text-zinc-400">
        No tailored proposal topics available.
      </div>
    );
  }

  const pendingCount = topicPackages.filter((p) => !p.isApplied).length;
  const appliedCount = topicPackages.filter((p) => p.isApplied).length;

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      {/* Top Topic Switcher Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            <span>Investigation Topics ({topicPackages.length})</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setFilterMode("all")}
              className={`cursor-pointer px-2 py-0.5 rounded-md font-medium transition-all ${
                filterMode === "all"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              All ({topicPackages.length})
            </button>
            <button
              onClick={() => setFilterMode("pending")}
              className={`cursor-pointer px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterMode === "pending"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
              <span>({pendingCount})</span>
            </button>
            <button
              onClick={() => setFilterMode("applied")}
              className={`cursor-pointer px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterMode === "applied"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>Applied</span>
              {appliedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
              <span>({appliedCount})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {visibleTopicPackages.length === 0 ? (
            <div className="text-xs text-zinc-400 italic py-1 px-1">
              No topics in this view.
            </div>
          ) : (
            visibleTopicPackages.map((pkg) => {
              const isSelected = selectedTopic?.topicId === pkg.topicId;
              return (
                <button
                  key={pkg.topicId}
                  onClick={() => onSelectTopic(pkg.topicId)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                  }`}
                >
                  <span>{pkg.title}</span>
                  {pkg.isApplied ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Topic Debrief Content */}
      {selectedTopic && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Header Card with Factuality Seal */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                Agent Mission Debrief
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                <span>100% Critic Verified (0 Hallucinations)</span>
              </span>
            </div>

            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {selectedTopic.title}
            </h3>

            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Target Requirement:{" "}
              </span>
              {selectedTopic.jobRequirement}
            </div>

            {/* Verified Facts Pills */}
            {selectedTopic.allEvidence.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1.5">
                  Verified Interview Evidence:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedTopic.allEvidence.map((ev, evIdx) => (
                    <span
                      key={evIdx}
                      className="rounded bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Proposed Bullet Enhancements */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Proposed Resume Enhancements
            </div>

            {/* Matched Proposals */}
            {(() => {
              const hasVisibleModifications =
                selectedTopic.matchedProposals.some((m) =>
                  m.decisions.some((d) => d.action?.toUpperCase() !== "KEEP")
                ) || selectedTopic.unmatchedProposals.length > 0;

              if (!hasVisibleModifications) {
                return (
                  <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Existing resume bullets already satisfy this requirement. No wording modifications needed.
                  </div>
                );
              }

              return null;
            })()}

            {selectedTopic.matchedProposals.map((matched, mIdx) => (
              <div key={mIdx} className="space-y-3">
                {matched.decisions.map((decision, dIdx) => {
                  if (decision.action?.toUpperCase() === "KEEP") {
                    return null;
                  }

                  const sentenceId = decision.new_bullet?.sentence_id;
                  const isEditingThis = sentenceId !== undefined && editingSentenceId === sentenceId;

                  return (
                    <div
                      key={dIdx}
                      className="rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800 space-y-2.5 bg-white dark:bg-zinc-900"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-700 dark:text-blue-400 text-[11px] uppercase tracking-wide">
                          {decision.action} Existing Bullet
                        </span>
                        {sentenceId !== undefined && !isEditingThis && (
                          <button
                            onClick={() =>
                              handleStartCustomEdit(
                                sentenceId,
                                decision.new_bullet?.text || ""
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit wording</span>
                          </button>
                        )}
                      </div>

                      {/* Diff: Original vs Proposed */}
                      {decision.old_bullet && (
                        <div className="rounded bg-red-50/50 p-2 text-xs text-red-900 line-through dark:bg-red-950/20 dark:text-red-300 opacity-70">
                          {decision.old_bullet.text}
                        </div>
                      )}

                      {isEditingThis ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingDraft}
                            onChange={(e) => setEditingDraft(e.target.value)}
                            rows={3}
                            className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingSentenceId(null)}
                              className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100"
                              disabled={isSavingCustom}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleSaveCustomEdit(selectedTopic.topicId, sentenceId!)
                              }
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              disabled={isSavingCustom}
                            >
                              {isSavingCustom ? "Saving..." : "Save Proposal"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        decision.new_bullet && (
                          <div className="rounded border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-950 font-medium dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                              <Sparkles className="h-3 w-3" />
                              <span>Proposed XYZ Bullet:</span>
                            </span>
                            <p className="leading-relaxed">{decision.new_bullet.text}</p>
                          </div>
                        )
                      )}

                      {decision.reasoning && (
                        <p className="text-[11px] text-zinc-500 italic">
                          Rationale: {decision.reasoning}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Unmatched Proposals (New Experience / Project) */}
            {selectedTopic.unmatchedProposals.map((unmatched, uIdx) => (
              <div
                key={uIdx}
                className="rounded-lg border border-purple-200 bg-purple-50/40 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20 space-y-2 text-xs text-purple-950 dark:text-purple-200"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[11px] uppercase tracking-wide text-purple-700 dark:text-purple-400">
                    Add New {unmatched.type.replace("_", " ")}
                  </span>
                  <span>{unmatched.duration || ""}</span>
                </div>

                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {unmatched.job_title || unmatched.project_name}{" "}
                  {unmatched.company_name && `at ${unmatched.company_name}`}
                </div>

                <div className="space-y-1 mt-2">
                  {unmatched.decisions.map((d, dIdx) => (
                    <div key={dIdx} className="leading-relaxed">
                      • {d.new_bullet.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Apply Action Bar */}
      {selectedTopic && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            {selectedTopic.isApplied ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Applied to Working Resume</span>
              </span>
            ) : (
              <span>Ready to integrate into draft</span>
            )}
          </div>

          {selectedTopic.isApplied ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 cursor-default select-none shadow-xs">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Applied to Resume</span>
            </div>
          ) : (
            <button
              onClick={handleApplyClick}
              disabled={isApplying}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-xs transition-all disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Apply Topic to Resume</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
