"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Feedbacks,
  ResumeBullet,
  ResumeExperience,
  ResumeProject,
  ResumeStructure,
  TailorAnalysis,
  TailorMatched,
  TailorUnmatched,
} from "@/lib/types";
import { ProposalDecision } from "@/hooks/use-tailoring-session";
import { useRotatingPhrase } from "@/hooks/use-rotating-phrase";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Building2,
  Briefcase,
  ShieldCheck,
  Check,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface TailoringWorkspaceProps {
  resumeData: ResumeStructure | null;
  tailorAnalysis: TailorAnalysis | null;
  feedbacks: Feedbacks | null;
  proposalDecisions: Record<string, ProposalDecision>;
  isSynthesizing: boolean;
  onDecideProposal: (proposalKey: string, status: "accepted" | "rejected", customText?: string) => void;
  onFinishReview: () => void;
}

type UnifiedProposal =
  | { kind: "matched"; data: TailorMatched; key: string }
  | { kind: "unmatched"; data: TailorUnmatched; key: string };

export function TailoringWorkspace({
  resumeData,
  tailorAnalysis,
  feedbacks,
  proposalDecisions,
  isSynthesizing,
  onDecideProposal,
  onFinishReview,
}: TailoringWorkspaceProps) {
  const rotatingPhrase = useRotatingPhrase(isSynthesizing);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customTextDraft, setCustomTextDraft] = useState("");

  const activeElementRef = useRef<HTMLDivElement | null>(null);

  // Combine matched and unmatched into a unified sequential review list
  const proposals: UnifiedProposal[] = useMemo(() => {
    const list: UnifiedProposal[] = [];
    if (tailorAnalysis?.tailor_matched_list) {
      tailorAnalysis.tailor_matched_list.forEach((item, idx) => {
        list.push({ kind: "matched", data: item, key: `matched_${item.topic_id}_${idx}` });
      });
    }
    if (tailorAnalysis?.tailor_unmatched_list) {
      tailorAnalysis.tailor_unmatched_list.forEach((item, idx) => {
        list.push({ kind: "unmatched", data: item, key: `unmatched_${item.topic_id}_${idx}` });
      });
    }
    return list;
  }, [tailorAnalysis]);

  const currentProposal = proposals[currentIndex] || null;

  // Reset custom edit draft when changing proposal
  useEffect(() => {
    setIsEditingCustom(false);
    if (currentProposal) {
      if (currentProposal.kind === "matched") {
        const firstBullet = currentProposal.data.new_bullet_points?.[0]?.text || "";
        setCustomTextDraft(firstBullet);
      } else {
        const firstBullet = currentProposal.data.new_bullet_points?.[0]?.text || "";
        setCustomTextDraft(firstBullet);
      }
    }
  }, [currentIndex, currentProposal]);

  // Auto-scroll the live document to spotlight the active item
  useEffect(() => {
    if (activeElementRef.current) {
      activeElementRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const handleApplyCustom = () => {
    if (!currentProposal || !customTextDraft.trim()) return;
    onDecideProposal(currentProposal.key, "accepted", customTextDraft.trim());
    setIsEditingCustom(false);
    // Advance to next
    if (currentIndex < proposals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleAccept = () => {
    if (!currentProposal) return;
    onDecideProposal(currentProposal.key, "accepted");
    if (currentIndex < proposals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReject = () => {
    if (!currentProposal) return;
    onDecideProposal(currentProposal.key, "rejected");
    if (currentIndex < proposals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Compute live updated resume preview with accepted modifications
  const previewResume = useMemo(() => {
    if (!resumeData) return null;

    // Deep clone
    const cloned: ResumeStructure = JSON.parse(JSON.stringify(resumeData));

    // 1. Apply Matched modifications
    proposals.forEach((p) => {
      const decision = proposalDecisions[p.key];
      if (decision?.status === "accepted") {
        if (p.kind === "matched") {
          const matched = p.data;
          const ref = matched.resume_reference;
          const targetText = decision.customText || matched.new_bullet_points?.[0]?.text;

          if (ref && targetText) {
            const list = cloned[ref.type] as Array<ResumeExperience | ResumeProject> | undefined;
            const entry = list?.find((e) => e.entry_id === ref.entry_id);
            if (entry && entry.bullets) {
              if (matched.next_action === "MODIFY" && entry.bullets.length > 0) {
                // Modify first matching or top bullet
                entry.bullets[0].text = targetText;
              } else if (matched.next_action === "ADD") {
                entry.bullets.push({ text: targetText, sentence_id: `added_${p.key}` });
              }
            }
          }
        }
      }
    });

    // 2. Prepend Accepted Unmatched Experiences (reverse-chronological convention)
    proposals.forEach((p) => {
      const decision = proposalDecisions[p.key];
      if (decision?.status === "accepted" && p.kind === "unmatched") {
        const unmatch = p.data;
        const targetBullet = decision.customText || unmatch.new_bullet_points?.[0]?.text || "";

        if (unmatch.company_name) {
          // Prepend to work_experience
          const newExp: ResumeExperience = {
            entry_id: `new_exp_${p.key}`,
            company: unmatch.company_name,
            job_title: unmatch.job_title || "Specialist",
            location: unmatch.job_location || null,
            duration: unmatch.duration || "Recent",
            bullets: [{ text: targetBullet, sentence_id: `new_b_${p.key}` }],
          };
          cloned.work_experience = [newExp, ...cloned.work_experience];
        } else if (unmatch.project_name) {
          // Prepend to projects
          const newProj: ResumeProject = {
            entry_id: `new_proj_${p.key}`,
            project_name: unmatch.project_name,
            technologies: unmatch.skills || [],
            bullets: [{ text: targetBullet, sentence_id: `new_b_${p.key}` }],
          };
          cloned.projects = [newProj, ...cloned.projects];
        }
      }
    });

    return cloned;
  }, [resumeData, proposals, proposalDecisions]);

  // =========================================================================
  // SYNTHESIS PROGRESS SCREEN (5-12s while backend tailors and verifies)
  // =========================================================================
  if (isSynthesizing) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 px-4 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg">
          <Wand2 className="h-8 w-8 animate-pulse" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 min-h-[2rem] transition-all">
            {rotatingPhrase}
          </h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto">
            Our agent maps verified evidence to your resume, structures high-impact XYZ bullets, and runs a factuality critic to eliminate hallucinations.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 text-left space-y-3 max-w-md mx-auto text-xs">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Mapped evidence provenance to exact resume entries</span>
          </div>
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Drafted XYZ-syntax achievements (Accomplished X by doing Z)</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-400" />
            <span>{rotatingPhrase}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DUAL-PANE PROPOSAL REVIEW WORKSPACE
  // =========================================================================
  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Phase 3: Decision Review
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              <span>100% Critic Fact-Checked</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            Review Tailored Bullet Proposals
          </h2>
          <p className="text-xs text-zinc-500">
            Accept, tweak, or reject each proposal. Your live resume on the left updates instantly.
          </p>
        </div>

        <button
          onClick={onFinishReview}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all shrink-0"
        >
          <span>Finish Review & Compare</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANE: Live Structured Resume with Active Spotlight (~55% -> 7 cols)  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-950/40">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <Briefcase className="h-4 w-4 text-zinc-500" />
              <span>Live Resume Preview</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Spotlight highlights currently inspected proposal
            </span>
          </div>

          {/* Document Content */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[640px] overflow-y-auto font-sans text-xs text-zinc-800 dark:text-zinc-200">
            {previewResume ? (
              <>
                {/* Header */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 text-center">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {previewResume.name || "Candidate Name"}
                  </h1>
                  {previewResume.contact && (
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {previewResume.contact}
                    </p>
                  )}
                </div>

                {/* Work Experience */}
                {previewResume.work_experience?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-3">
                      Work Experience
                    </h3>
                    <div className="space-y-4">
                      {previewResume.work_experience.map((exp, expIdx) => {
                        const isCurrentEntryActive =
                          currentProposal?.kind === "matched" &&
                          currentProposal.data.resume_reference.entry_id === exp.entry_id;

                        return (
                          <div
                            key={expIdx}
                            ref={isCurrentEntryActive ? activeElementRef : null}
                            className={`rounded-lg p-2.5 transition-all ${
                              isCurrentEntryActive
                                ? "bg-emerald-50/60 ring-2 ring-emerald-500/40 dark:bg-emerald-950/30"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
                              <span>{exp.job_title}</span>
                              <span className="text-zinc-500 text-[11px]">{exp.duration}</span>
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-1.5">
                              {exp.company} {exp.location && `• ${exp.location}`}
                            </div>
                            <ul className="space-y-1 list-disc list-outside ml-4 text-[11px] text-zinc-700 dark:text-zinc-300">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx}>{b.text}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {previewResume.projects?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-3">
                      Projects
                    </h3>
                    <div className="space-y-3">
                      {previewResume.projects.map((proj, projIdx) => (
                        <div key={projIdx} className="p-2">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {proj.project_name}
                          </div>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="text-[10px] text-zinc-500 mb-1">
                              Technologies: {proj.technologies.join(", ")}
                            </div>
                          )}
                          <ul className="space-y-1 list-disc list-outside ml-4 text-[11px] text-zinc-700 dark:text-zinc-300">
                            {proj.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {previewResume.education?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-2">
                      Education
                    </h3>
                    {previewResume.education.map((edu, eduIdx) => (
                      <div key={eduIdx} className="flex justify-between text-[11px]">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                        </span>
                        <span className="text-zinc-500">{edu.institution}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-xs text-zinc-400">
                No structured resume data loaded.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: Proposal Decision Inspector (~45% -> 5 cols)                  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between min-h-[580px]">
          {currentProposal ? (
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              {/* Card Stepper Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Proposal {currentIndex + 1} of {proposals.length}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(Math.min(proposals.length - 1, currentIndex + 1))}
                      disabled={currentIndex === proposals.length - 1}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Category & Status Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold border ${
                      currentProposal.kind === "matched"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                        : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900"
                    }`}
                  >
                    {currentProposal.kind === "matched"
                      ? `${currentProposal.data.next_action} Existing Bullet`
                      : "Add Unrepresented Experience"}
                  </span>

                  {proposalDecisions[currentProposal.key] && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        proposalDecisions[currentProposal.key].status === "accepted"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {proposalDecisions[currentProposal.key].status === "accepted" ? "✓ Accepted" : "✗ Rejected"}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {currentProposal.kind === "matched"
                    ? `Role: ${currentProposal.data.resume_reference.type}`
                    : `New: ${currentProposal.data.company_name || currentProposal.data.project_name}`}
                </h3>
              </div>

              {/* Proposal Content Diff */}
              <div className="space-y-3 flex-1">
                {/* Matched: Original vs Proposed */}
                {currentProposal.kind === "matched" && (
                  <div className="space-y-2">
                    {currentProposal.data.old_bullet_points && currentProposal.data.old_bullet_points.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                        <span className="font-semibold block mb-1 text-[10px] uppercase text-red-700 dark:text-red-400">
                          Original Text:
                        </span>
                        <p className="line-through opacity-80">
                          {currentProposal.data.old_bullet_points[0].text}
                        </p>
                      </div>
                    )}

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <span className="font-semibold block mb-1 text-[10px] uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Proposed XYZ Bullet:</span>
                      </span>
                      {isEditingCustom ? (
                        <div className="space-y-2 mt-1">
                          <textarea
                            rows={3}
                            value={customTextDraft}
                            onChange={(e) => setCustomTextDraft(e.target.value)}
                            className="w-full rounded border border-emerald-300 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setIsEditingCustom(false)}
                              className="px-2 py-1 text-[11px] rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleApplyCustom}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            >
                              Apply Custom Bullet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium">
                          {proposalDecisions[currentProposal.key]?.customText ||
                            currentProposal.data.new_bullet_points?.[0]?.text}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Unmatched: Brand New Experience Entry */}
                {currentProposal.kind === "unmatched" && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 text-xs text-purple-950 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span>{currentProposal.data.job_title || "Project"}</span>
                      <span className="text-purple-700 dark:text-purple-400">{currentProposal.data.duration}</span>
                    </div>

                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {currentProposal.data.skills && (
                        <span>Tech: {currentProposal.data.skills.join(", ")}</span>
                      )}
                    </div>

                    <div className="border-t border-purple-200/60 dark:border-purple-900/40 pt-2">
                      <span className="font-semibold block mb-1 text-[10px] uppercase text-purple-700 dark:text-purple-400">
                        Proposed Achievement Bullets:
                      </span>
                      {currentProposal.data.new_bullet_points?.map((b, bIdx) => (
                        <p key={bIdx} className="font-medium text-xs">
                          • {b.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning & Verified Evidence Tags */}
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400 space-y-2">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                      Rationale:
                    </span>
                    <p className="text-[11px]">{currentProposal.data.reasoning}</p>
                  </div>

                  {currentProposal.data.evidence && currentProposal.data.evidence.length > 0 && (
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-1 text-[10px] uppercase">
                        Evidence Backlink:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {currentProposal.data.evidence.map((ev, evIdx) => (
                          <span
                            key={evIdx}
                            className="rounded bg-zinc-200/80 px-2 py-0.5 text-[10px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleReject}
                    className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={handleAccept}
                    className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed transition-colors shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept & Apply</span>
                  </button>
                </div>

                {!isEditingCustom && (
                  <button
                    onClick={() => setIsEditingCustom(true)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit wording inline</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400">
              No proposal selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
