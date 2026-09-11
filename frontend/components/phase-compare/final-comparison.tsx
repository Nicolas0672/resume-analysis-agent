"use client";

import { useState, useMemo } from "react";
import {
  ResumeExperience,
  ResumeProject,
  ResumeStructure,
  TailorAnalysis,
} from "@/lib/types";
import { ProposalDecision } from "@/hooks/use-tailoring-session";
import {
  Printer,
  FileDown,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Building2,
  Briefcase,
} from "lucide-react";

interface FinalComparisonProps {
  originalResume: ResumeStructure | null;
  tailorAnalysis: TailorAnalysis | null;
  proposalDecisions: Record<string, ProposalDecision>;
  onBackToTailoring: () => void;
}

export function FinalComparison({
  originalResume,
  tailorAnalysis,
  proposalDecisions,
  onBackToTailoring,
}: FinalComparisonProps) {
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [docxToast, setDocxToast] = useState(false);

  // Compute final tailored resume
  const tailoredResume = useMemo(() => {
    if (!originalResume) return null;

    const cloned: ResumeStructure = JSON.parse(JSON.stringify(originalResume));

    // 1. Apply Matched modifications
    tailorAnalysis?.tailor_matched_list?.forEach((matched, idx) => {
      const key = `matched_${matched.topic_id}_${idx}`;
      const decision = proposalDecisions[key];

      if (decision?.status === "accepted") {
        const ref = matched.resume_reference;
        const targetText = decision.customText || matched.new_bullet_points?.[0]?.text;

        if (ref && targetText) {
          const list = cloned[ref.type] as Array<ResumeExperience | ResumeProject> | undefined;
          const entry = list?.find((e) => e.entry_id === ref.entry_id);
          if (entry && entry.bullets) {
            if (matched.next_action === "MODIFY" && entry.bullets.length > 0) {
              entry.bullets[0].text = targetText;
            } else if (matched.next_action === "ADD") {
              entry.bullets.push({ text: targetText, sentence_id: `added_${key}` });
            }
          }
        }
      }
    });

    // 2. Prepend Accepted Unmatched Experiences
    tailorAnalysis?.tailor_unmatched_list?.forEach((unmatch, idx) => {
      const key = `unmatched_${unmatch.topic_id}_${idx}`;
      const decision = proposalDecisions[key];

      if (decision?.status === "accepted") {
        const targetBullet = decision.customText || unmatch.new_bullet_points?.[0]?.text || "";

        if (unmatch.company_name) {
          const newExp: ResumeExperience = {
            entry_id: `new_exp_${key}`,
            company: unmatch.company_name,
            job_title: unmatch.job_title || "Specialist",
            location: unmatch.job_location || null,
            duration: unmatch.duration || "Recent",
            bullets: [{ text: targetBullet, sentence_id: `new_b_${key}` }],
          };
          cloned.work_experience = [newExp, ...cloned.work_experience];
        } else if (unmatch.project_name) {
          const newProj: ResumeProject = {
            entry_id: `new_proj_${key}`,
            project_name: unmatch.project_name,
            technologies: unmatch.skills || [],
            bullets: [{ text: targetBullet, sentence_id: `new_b_${key}` }],
          };
          cloned.projects = [newProj, ...cloned.projects];
        }
      }
    });

    return cloned;
  }, [originalResume, tailorAnalysis, proposalDecisions]);

  const acceptedCount = useMemo(() => {
    return Object.values(proposalDecisions).filter((d) => d.status === "accepted").length;
  }, [proposalDecisions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDocxClick = () => {
    setDocxToast(true);
    setTimeout(() => setDocxToast(false), 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Phase 4: Final Comparison & Export
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              <span>{acceptedCount} Enhancements Applied</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            Compare Original vs. Tailored Resume
          </h2>
          <p className="text-xs text-zinc-500">
            Synchronized side-by-side inspection. Print or save directly to PDF.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onBackToTailoring}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Modify Decisions</span>
          </button>

          {/* Highlight Toggle */}
          <button
            onClick={() => setHighlightChanges(!highlightChanges)}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              highlightChanges
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Highlight Changes: {highlightChanges ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={handleDocxClick}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Download DOCX</span>
          </button>
        </div>
      </div>

      {/* DOCX Coming Soon Toast */}
      {docxToast && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-between shadow-sm animate-in fade-in print:hidden">
          <span>
            DOCX reconstruction endpoint is scheduled for backend development. Please use <strong>Print / Save as PDF</strong> for an immediate high-fidelity export.
          </span>
          <button onClick={() => setDocxToast(false)} className="underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Planned ATS Slot Notification */}
      <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-3.5 text-xs text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-purple-300 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>
            <strong>Next Step on Roadmap:</strong> ATS Optimization Agent (will run keyword density & parseability check once the backend node is activated).
          </span>
        </div>
        <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded">
          Reserved Slot
        </span>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Original Uploaded Resume                                    */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden print:hidden">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
            <span>Original Resume (Baseline)</span>
            <span className="text-[10px] font-normal text-zinc-400">Pre-interview state</span>
          </div>

          <div className="p-6 space-y-5 max-h-[680px] overflow-y-auto text-xs text-zinc-800 dark:text-zinc-200 font-sans">
            {originalResume ? (
              <>
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 text-center">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{originalResume.name}</h3>
                  <p className="text-[10px] text-zinc-500">{originalResume.contact}</p>
                </div>

                {originalResume.work_experience?.map((exp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100">
                      <span>{exp.job_title}</span>
                      <span className="text-zinc-500 text-[10px]">{exp.duration}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">{exp.company} {exp.location && `• ${exp.location}`}</div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                      {exp.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-12 text-center text-zinc-400">No original resume data.</div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Final Tailored Resume (Printable container)                */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden print:border-none print:shadow-none print:w-full print:m-0">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Tailored Resume (Evidence-Backed)</span>
            </span>
            <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
              Ready for distribution
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6 max-h-[680px] overflow-y-auto print:max-h-none print:overflow-visible text-xs text-zinc-800 dark:text-zinc-200 font-sans print:p-0">
            {tailoredResume ? (
              <>
                {/* Header */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 text-center">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {tailoredResume.name || "Candidate Name"}
                  </h1>
                  {tailoredResume.contact && (
                    <p className="text-[11px] text-zinc-500 mt-1">{tailoredResume.contact}</p>
                  )}
                </div>

                {/* Work Experience */}
                {tailoredResume.work_experience?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      Work Experience
                    </h3>
                    <div className="space-y-4">
                      {tailoredResume.work_experience.map((exp, expIdx) => (
                        <div key={expIdx} className="space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            <span>{exp.job_title}</span>
                            <span className="text-zinc-500 text-[10px]">{exp.duration}</span>
                          </div>
                          <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-1">
                            {exp.company} {exp.location && `• ${exp.location}`}
                          </div>
                          <ul className="space-y-1.5 list-disc list-outside ml-4 text-[11px] text-zinc-700 dark:text-zinc-300">
                            {exp.bullets.map((b, bIdx) => (
                              <li
                                key={bIdx}
                                className={
                                  highlightChanges && b.sentence_id?.startsWith("added_")
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-medium px-1 rounded"
                                    : ""
                                }
                              >
                                {b.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {tailoredResume.projects?.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      Projects
                    </h3>
                    <div className="space-y-3">
                      {tailoredResume.projects.map((proj, projIdx) => (
                        <div key={projIdx} className="space-y-1">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {proj.project_name}
                          </div>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="text-[10px] text-zinc-500">
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
                {tailoredResume.education?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                      Education
                    </h3>
                    {tailoredResume.education.map((edu, eduIdx) => (
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
              <div className="py-12 text-center text-zinc-400">No tailored resume data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
