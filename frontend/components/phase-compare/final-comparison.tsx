"use client";

import { useState, useMemo } from "react";
import { ResumeStructure } from "@/lib/types";
import { getActiveSkillEntries } from "@/lib/utils";
import {
  Printer,
  FileDown,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  FileText,
} from "lucide-react";

interface FinalComparisonProps {
  originalResume: ResumeStructure | null;
  tailoredResume: ResumeStructure | null;
  appliedTopicCount?: number;
  onBackToTailoring: () => void;
}

export function FinalComparison({
  originalResume,
  tailoredResume,
  appliedTopicCount = 0,
  onBackToTailoring,
}: FinalComparisonProps) {
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [docxToast, setDocxToast] = useState(false);
  const [exportPageSelection, setExportPageSelection] = useState<"all" | "page1" | "page2">("all");
  const [showOverLimitModal, setShowOverLimitModal] = useState(false);

  const activeTailored = tailoredResume || originalResume;

  // Extract all non-empty skills categories dynamically for both resumes
  const originalSkillEntries = useMemo(
    () => getActiveSkillEntries(originalResume?.skills),
    [originalResume]
  );
  const tailoredSkillEntries = useMemo(
    () => getActiveSkillEntries(activeTailored?.skills),
    [activeTailored]
  );

  // Helper to check if a bullet is newly added/modified compared to original
  const isBulletModified = (text: string): boolean => {
    if (!originalResume || !highlightChanges) return false;
    const inOriginal =
      originalResume.work_experience?.some((exp) =>
        exp.bullets.some((b) => b.text === text)
      ) ||
      originalResume.projects?.some((proj) =>
        proj.bullets.some((b) => b.text === text)
      ) ||
      originalResume.leadership?.some((lead) =>
        lead.bullets.some((b) => b.text === text)
      );
    return !inOriginal;
  };

  // Calculate content density units matching a standard 8.5" x 11" Google Doc page
  // With tightened minimal spacing, a standard 1-page engineering Google Doc holds ~36-38 lines.
  const contentUnits = useMemo(() => {
    if (!activeTailored) return 0;
    let units = 2; // header
    units += (activeTailored.education?.length || 0) * 2;
    units += (activeTailored.work_experience?.length || 0) * 1.5;
    units +=
      activeTailored.work_experience?.reduce(
        (acc, e) => acc + (e.bullets?.length || 0),
        0
      ) || 0;
    units += (activeTailored.projects?.length || 0) * 1.5;
    units +=
      activeTailored.projects?.reduce(
        (acc, p) => acc + (p.bullets?.length || 0),
        0
      ) || 0;
    units += (activeTailored.leadership?.length || 0) * 1.5;
    units +=
      activeTailored.leadership?.reduce(
        (acc, l) => acc + (l.bullets?.length || 0),
        0
      ) || 0;
    if (tailoredSkillEntries.length > 0) {
      units += 1 + tailoredSkillEntries.length * 0.75;
    }
    return units;
  }, [activeTailored, tailoredSkillEntries]);

  // Page limit thresholds:
  // - 1 Google Doc page: up to 36 units (standard full resume)
  // - 2 Google Doc pages: 37 to 72 units (allowable 2-page max)
  // - Over 2 pages: > 72 units (hard limit error)
  const isMultiPage = contentUnits > 36;
  const isExceedingMax = contentUnits > 72;

  const handlePrint = () => {
    if (isExceedingMax) {
      setShowOverLimitModal(true);
      return;
    }
    // Set document.title temporarily to candidate's name so PDF filename & print header
    // are clean and don't include the website/project title
    const originalTitle = document.title;
    if (activeTailored?.name) {
      document.title = `${activeTailored.name} - Resume`;
    } else {
      document.title = "Resume";
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDocxClick = () => {
    if (isExceedingMax) {
      setShowOverLimitModal(true);
      return;
    }
    setDocxToast(true);
    setTimeout(() => setDocxToast(false), 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 print:m-0 print:p-0 print:w-full print:max-w-none print:space-y-0">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Phase 4: Final Comparison & Export
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              <span>{appliedTopicCount} Topics Applied • 100% Fact-Checked</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            Compare Original vs. Tailored Resume
          </h2>
          <p className="text-xs text-zinc-500">
            Standard Google Doc letter sizing with clean typography and structural parity.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onBackToTailoring}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
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

          {/* Export Page Selector (shown when multi-page) */}
          {isMultiPage && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] text-zinc-500 px-1.5 uppercase font-semibold">Print:</span>
              <button
                onClick={() => setExportPageSelection("all")}
                className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  exportPageSelection === "all"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                All (2)
              </button>
              <button
                onClick={() => setExportPageSelection("page1")}
                className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  exportPageSelection === "page1"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Page 1
              </button>
              <button
                onClick={() => setExportPageSelection("page2")}
                className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                  exportPageSelection === "page2"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Page 2
              </button>
            </div>
          )}

          <button
            onClick={handlePrint}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all ${
              isExceedingMax
                ? "bg-zinc-500 hover:bg-zinc-600 cursor-not-allowed"
                : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={handleDocxClick}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Download DOCX</span>
          </button>
        </div>
      </div>

      {/* Page Limit Advisory & Error Banners */}
      {isExceedingMax ? (
        <div className="rounded-xl border border-red-300 bg-red-50/95 p-4 dark:border-red-900/60 dark:bg-red-950/40 text-red-900 dark:text-red-200 shadow-xs space-y-1.5 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-300">
              <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Page Limit Exceeded: 3+ Pages (Maximum Supported: 2 Pages)</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200 px-2 py-0.5 rounded-full border border-red-300 dark:border-red-800">
              Hard Limit Error
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            Your tailored resume exceeds the 2-page hard limit. Modern hiring managers and applicant tracking systems (ATS) strictly reject 3+ page resumes for non-executive roles. Please click <em>&quot;Modify Decisions&quot;</em> to trim lower-priority bullets or remove entries before exporting.
          </p>
        </div>
      ) : isMultiPage ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs space-y-1.5 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Page Length Notice: 2 Pages (Maximum Allowed)</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
              Page 2 of 2 Max
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            <strong>Recruiter Tip for Engineering Majors:</strong> According to university career centers (e.g. Stanford CareerEd, MIT, CMU) and tech recruiting standards, a <strong>1-page resume is strongly recommended</strong> for engineering undergraduates and candidates with under 5–8 years of experience. Your draft currently occupies 2 pages (the maximum allowed). Consider clicking <em>&quot;Modify Decisions&quot;</em> to trim lower-priority bullets so your highest-impact work fits on a single punchy page.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 flex items-center justify-between text-xs print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Optimal Length: Exactly 1 Page</strong> — Adheres to the 1-page Google Doc standard recommended for engineering majors.
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded">
            1 of 1 Page
          </span>
        </div>
      )}

      {/* DOCX Coming Soon Toast */}
      {docxToast && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-between shadow-sm animate-in fade-in print:hidden">
          <span>
            DOCX reconstruction endpoint is scheduled for backend development. Please use <strong>Print / Save as PDF</strong> for an immediate high-fidelity export.
          </span>
          <button onClick={() => setDocxToast(false)} className="underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Original Uploaded Resume (Baseline Ground Truth)             */}
        {/* ========================================================================= */}
        <div className="self-start h-fit rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden print:hidden">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
            <span>Original Resume (Baseline)</span>
            <span className="text-[10px] font-normal text-zinc-400">Pre-interview ground truth</span>
          </div>

          <div className="p-6 sm:p-8 pb-5 sm:pb-6 space-y-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-sans">
            {originalResume ? (
              <>
                {/* Header */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 text-center mb-1">
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {originalResume.name || "Candidate Name"}
                  </h3>
                  {originalResume.contact && (
                    <p className="text-[11px] text-zinc-500 mt-1 font-normal tracking-wide">
                      {originalResume.contact}
                    </p>
                  )}
                </div>

                {/* Education (Placed at Top) */}
                {originalResume.education?.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                      Education
                    </h4>
                    <div className="space-y-1.5">
                      {originalResume.education.map((edu, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            <span>{edu.institution || "Institution"}</span>
                            <span className="text-zinc-500 font-normal text-[11px]">
                              {edu.duration || edu.location || ""}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-zinc-700 dark:text-zinc-300">
                            <span>
                              {edu.degree || "Degree"}
                              {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                            </span>
                            {edu.gpa && <span className="text-zinc-500 text-[10px]">GPA: {edu.gpa}</span>}
                          </div>
                          {edu.coursework && edu.coursework.length > 0 && (
                            <div className="text-[10px] text-zinc-500">
                              Coursework: {edu.coursework.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Experience */}
                {originalResume.work_experience?.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                      Work Experience
                    </h4>
                    <div className="space-y-2.5">
                      {originalResume.work_experience.map((exp, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            <span>{exp.job_title}</span>
                            <span className="text-zinc-500 text-[11px] font-normal">{exp.duration}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mb-0.5">
                            {exp.company} {exp.location && `• ${exp.location}`}
                          </div>
                          <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                            {exp.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {originalResume.projects?.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                      Projects
                    </h4>
                    <div className="space-y-2">
                      {originalResume.projects.map((proj, pIdx) => (
                        <div key={pIdx} className="space-y-1">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {proj.project_name}
                          </div>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="text-[10px] text-zinc-500 mb-0.5">
                              Technologies: {proj.technologies.join(", ")}
                            </div>
                          )}
                          <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                            {proj.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leadership */}
                {originalResume.leadership?.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                      Leadership & Extracurriculars
                    </h4>
                    <div className="space-y-2">
                      {originalResume.leadership.map((lead, lIdx) => (
                        <div key={lIdx} className="space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            <span>{lead.title}</span>
                            {lead.position && (
                              <span className="text-zinc-500 font-normal text-[11px]">
                                {lead.position}
                              </span>
                            )}
                          </div>
                          <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                            {lead.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Skills */}
                {originalSkillEntries.length > 0 && (
                  <div className="space-y-1 pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                      Technical Skills
                    </h4>
                    <div className="space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                      {originalSkillEntries.map((entry, idx) => (
                        <div key={idx}>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {entry.label}:{" "}
                          </span>
                          <span>{entry.items.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-zinc-400">No original resume data.</div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Final Tailored Resume (Printable Multi-Page Container)      */}
        {/* ========================================================================= */}
        <div
          id="printable-tailored-resume"
          className="self-start h-fit rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden print:border-none print:shadow-none print:w-full print:m-0 print:p-0"
        >
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Tailored Working Resume</span>
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  isExceedingMax
                    ? "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                    : isMultiPage
                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                    : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                }`}
              >
                {isExceedingMax
                  ? "3+ Pages (Exceeds Max Limit)"
                  : isMultiPage
                  ? "Page 1 & 2 of 2 (Max Limit)"
                  : "Page 1 of 1 (Optimal)"}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 pb-5 sm:pb-6 space-y-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-sans print:p-0 print:space-y-3 print:min-h-0">
            {activeTailored ? (
              <>
                {/* ================= PAGE 1 CONTAINER ================= */}
                <div
                  className={`space-y-3.5 ${
                    isMultiPage && exportPageSelection === "page2" ? "print:hidden" : ""
                  }`}
                >
                  {/* Header */}
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 text-center mb-1">
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {activeTailored.name || "Candidate Name"}
                    </h1>
                    {activeTailored.contact && (
                      <p className="text-[11px] text-zinc-500 mt-1 font-normal tracking-wide">
                        {activeTailored.contact}
                      </p>
                    )}
                  </div>

                  {/* Education (Placed at Top) */}
                  {activeTailored.education?.length > 0 && (
                    <div className="space-y-1.5 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                        Education
                      </h3>
                      <div className="space-y-1.5">
                        {activeTailored.education.map((edu, eduIdx) => (
                          <div key={eduIdx} className="space-y-0.5">
                            <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              <span>{edu.institution || "Institution"}</span>
                              <span className="text-zinc-500 text-[11px] font-normal">
                                {edu.duration || edu.location || ""}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-zinc-700 dark:text-zinc-300">
                              <span className="font-medium">
                                {edu.degree || "Degree"}
                                {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                              </span>
                              {edu.gpa && <span className="text-zinc-500 text-[10px]">GPA: {edu.gpa}</span>}
                            </div>
                            {edu.coursework && edu.coursework.length > 0 && (
                              <div className="text-[10px] text-zinc-500">
                                Coursework: {edu.coursework.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Experience */}
                  {activeTailored.work_experience?.length > 0 && (
                    <div className="space-y-1.5 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                        Work Experience
                      </h3>
                      <div className="space-y-2.5">
                        {activeTailored.work_experience.map((exp, expIdx) => (
                          <div key={expIdx} className="space-y-1">
                            <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              <span>{exp.job_title}</span>
                              <span className="text-zinc-500 text-[11px] font-normal">{exp.duration}</span>
                            </div>
                            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-0.5">
                              {exp.company} {exp.location && `• ${exp.location}`}
                            </div>
                            <ul className="space-y-0.5 list-disc list-outside ml-4 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                              {exp.bullets.map((b, bIdx) => {
                                const modified = isBulletModified(b.text);
                                return (
                                  <li
                                    key={bIdx}
                                    className={
                                      modified
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-medium px-1 rounded transition-colors"
                                        : ""
                                    }
                                  >
                                    {b.text}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= PAGE BREAK & CUT-OFF DIVIDER ================= */}
                {/* When exporting/printing, the entire divider is 100% hidden */}
                {isMultiPage && (
                  <div className="my-6 relative text-center print:hidden page-break-divider">
                    <div className="border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
                    <span className="inline-block relative -top-3 bg-white dark:bg-zinc-900 px-3.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest rounded-full border border-amber-300 dark:border-amber-800 shadow-xs">
                      Page Break • Page 2 of 2 (Maximum Limit)
                    </span>
                  </div>
                )}

                {/* Clean, invisible print break for PDF export */}
                {isMultiPage && (
                  <div
                    className={`hidden print:block print:break-before-page ${
                      exportPageSelection === "page1" ? "print:hidden" : ""
                    }`}
                    style={{ height: 0, margin: 0, padding: 0 }}
                  />
                )}

                {/* ================= PAGE 2 CONTAINER ================= */}
                <div
                  className={`space-y-3.5 ${
                    isMultiPage && exportPageSelection === "page1" ? "print:hidden" : ""
                  }`}
                >
                  {/* Projects */}
                  {activeTailored.projects?.length > 0 && (
                    <div className="space-y-1.5 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                        Projects
                      </h3>
                      <div className="space-y-2">
                        {activeTailored.projects.map((proj, projIdx) => (
                          <div key={projIdx} className="space-y-1">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              {proj.project_name}
                            </div>
                            {proj.technologies && proj.technologies.length > 0 && (
                              <div className="text-[10px] text-zinc-500 mb-0.5">
                                Technologies: {proj.technologies.join(", ")}
                              </div>
                            )}
                            <ul className="space-y-0.5 list-disc list-outside ml-4 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                              {proj.bullets.map((b, bIdx) => {
                                const modified = isBulletModified(b.text);
                                return (
                                  <li
                                    key={bIdx}
                                    className={
                                      modified
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-medium px-1 rounded transition-colors"
                                        : ""
                                    }
                                  >
                                    {b.text}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leadership & Activities */}
                  {activeTailored.leadership?.length > 0 && (
                    <div className="space-y-1.5 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                        Leadership & Extracurriculars
                      </h3>
                      <div className="space-y-2">
                        {activeTailored.leadership.map((lead, lIdx) => (
                          <div key={lIdx} className="space-y-1">
                            <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              <span>{lead.title}</span>
                              {lead.position && (
                                <span className="text-zinc-500 font-normal text-[11px]">
                                  {lead.position}
                                </span>
                              )}
                            </div>
                            <ul className="space-y-0.5 list-disc list-outside ml-4 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                              {lead.bullets.map((b, bIdx) => {
                                const modified = isBulletModified(b.text);
                                return (
                                  <li
                                    key={bIdx}
                                    className={
                                      modified
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-medium px-1 rounded transition-colors"
                                        : ""
                                    }
                                  >
                                    {b.text}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Skills */}
                  {tailoredSkillEntries.length > 0 && (
                    <div className="space-y-1 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                        Technical Skills
                      </h3>
                      <div className="space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                        {tailoredSkillEntries.map((entry, sIdx) => (
                          <div key={sIdx}>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {entry.label}:{" "}
                            </span>
                            <span>{entry.items.join(", ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Page Limit Footer Indicator */}
                  {isMultiPage && (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 print:hidden">
                      <span>End of Document (Page 2 of 2)</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Maximum Page Limit Reached (2 Pages)
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-zinc-400">No tailored resume data.</div>
            )}
          </div>
        </div>
      </div>

      {/* 3+ Pages Hard Limit Error Blocking Modal */}
      {showOverLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertOctagon className="h-6 w-6" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Resume Exceeds 2-Page Limit
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your resume currently expands to <strong>3 or more pages</strong>. Modern applicant tracking systems (ATS) and tech recruiters strictly support a <strong>maximum of 2 pages</strong> (with 1 page strongly recommended for engineering majors).
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              To ensure optimal presentation and prevent resume disqualification, please return to Phase 3 to delete or condense bullet points before exporting.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverLimitModal(false)}
                className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowOverLimitModal(false);
                  onBackToTailoring();
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Editor to Trim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Stylesheet for Clean 1 or 2-Page Export (Zero Artifacts) */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide all page chrome, headers, navigation, sidebars, and project titles */
          body * {
            visibility: hidden;
          }
          /* Exclusively show the tailored printable resume container and its contents */
          #printable-tailored-resume,
          #printable-tailored-resume * {
            visibility: visible;
          }
          #printable-tailored-resume {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          /* Force display: none on any print:hidden element */
          .print\\:hidden,
          [class*="print:hidden"],
          .page-break-divider {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
