"use client";

import { useState, useRef, DragEvent, ChangeEvent, FormEvent, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Globe,
  AlertCircle,
  Loader2,
  Check,
  RotateCcw,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Layers,
  Clock,
  FileCheck2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { getUserSessions } from "@/lib/api-client";
import { UserSessionSummary } from "@/lib/types";
import { ResiLogo } from "@/components/logo";

interface DropzoneProps {
  isLoading: boolean;
  requiresFallback: boolean;
  fallbackError: string | null;
  pendingFile: File | null;
  onUpload: (file: File, jobLink?: string, jobDescription?: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

const INTAKE_STAGES = [
  {
    stage: "STAGE [1/4]",
    label: "Parsing .docx structure & semantic sections...",
    detail: "AST extraction • style mapping • metadata audit",
  },
  {
    stage: "STAGE [2/4]",
    label: "Extracting target job competencies & keywords...",
    detail: "Deterministic NLP parsing • requirement classification",
  },
  {
    stage: "STAGE [3/4]",
    label: "Cross-referencing verified metrics against requirements...",
    detail: "Evidence alignment audit • metric surface mapping",
  },
  {
    stage: "STAGE [4/4]",
    label: "Initializing agent memory & fit audit checkpoint...",
    detail: "Compiling session checkpointer • preparing interview thread",
  },
];

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Recently";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export function Dropzone({
  isLoading,
  requiresFallback,
  fallbackError,
  pendingFile,
  onUpload,
  onSelectSession,
}: DropzoneProps) {
  const [file, setFile] = useState<File | null>(pendingFile);
  const [activeTab, setActiveTab] = useState<"url" | "paste">("url");
  const [jobLink, setJobLink] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Background loading stage ticker
  const [stageIndex, setStageIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(12);

  // Recent dossiers state
  const [sessions, setSessions] = useState<UserSessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sequential loading ticker during 10-second background extraction
  useEffect(() => {
    if (!isLoading) {
      setStageIndex(0);
      setProgressPercent(12);
      return;
    }

    // Advance through 4 telemetry stages over ~9.6 seconds
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => (prev < INTAKE_STAGES.length - 1 ? prev + 1 : prev));
    }, 2400);

    // Smoothly increment progress bar up to 94%
    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 94) return 94;
        return prev + 1;
      });
    }, 110);

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, [isLoading]);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await getUserSessions();
      if (res?.success && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } catch {
      // Gracefully handle unauthenticated or network blips
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // If backend returns fallback needed, automatically switch to paste tab
  useEffect(() => {
    if (requiresFallback) {
      setActiveTab("paste");
    }
  }, [requiresFallback]);

  useEffect(() => {
    if (pendingFile) {
      setFile(pendingFile);
    }
  }, [pendingFile]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith(".docx")) {
        setValidationError("Only Microsoft Word (.docx) files are supported currently.");
        return;
      }
      setValidationError(null);
      setFile(selected);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.endsWith(".docx")) {
        setValidationError("Only Microsoft Word (.docx) files are supported currently.");
        return;
      }
      setValidationError(null);
      setFile(dropped);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!file) {
      setValidationError("Please upload your resume in .docx format.");
      return;
    }

    if (activeTab === "url") {
      if (!jobLink.trim()) {
        setValidationError("Please provide a job listing URL.");
        return;
      }
      try {
        const parsed = new URL(jobLink.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error();
        }
      } catch {
        setValidationError("Please provide a valid HTTP or HTTPS URL.");
        return;
      }
      onUpload(file, jobLink.trim(), undefined);
    } else {
      if (!jobDescription.trim() || jobDescription.trim().length < 50) {
        setValidationError("Please paste a complete job description (at least 50 characters).");
        return;
      }
      onUpload(file, undefined, jobDescription.trim());
    }
  };

  const handleResumePastSession = (sessionId: string) => {
    if (onSelectSession) {
      setResumingSessionId(sessionId);
      onSelectSession(sessionId);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* Editorial Header Section */}
      <div className="mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-mono font-medium text-stone-700 shadow-2xs mb-3">
          <ResiLogo size={14} className="h-5 w-5 inline-flex" />
          <span>EVIDENCE-BASED RESUME STUDIO</span>
          <span className="text-stone-300">/</span>
          <span className="text-emerald-700 font-semibold">STAGE 01: INTAKE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-zinc-900 leading-tight">
          Target Your Dream Role With Truth
        </h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-2xl font-sans">
          We don’t hallucinate skills. We compare your verified experience against target job requirements, probe for real-world metrics, and build fact-checked resume bullets.
        </p>
      </div>

      {/* Split Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Studio Dossier Console (Cols 1-7 on lg, 1-8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200/90 bg-white/95 p-6 sm:p-7 shadow-xs backdrop-blur-sm space-y-6"
          >
            {/* Dossier Console Header Strip */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 text-[11px] font-mono text-stone-500">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-stone-800">DOSSIER SPECIFICATION</span>
              </div>

              {/* Breathing Halo Pulse on CHECKPOINT READY */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center h-2.5 w-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-halo-breathe" />
                  <span className="absolute h-1 w-1 rounded-full bg-emerald-200" />
                </div>
                <span className="font-semibold text-stone-700 font-mono text-[10px] sm:text-[11px] tracking-wide">
                  CHECKPOINT READY
                </span>
              </div>
            </div>

            {/* Slot 1: Master Resume File (.docx) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-800">
                  01. Source Experience File (.docx)
                </label>
                {file && (
                  <span className="text-[11px] font-mono text-emerald-700 font-medium">
                    ✓ Verified Document Attached
                  </span>
                )}
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-zinc-900 bg-stone-50"
                    : file
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-stone-300 hover:border-stone-400 bg-stone-50/50 hover:bg-stone-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center justify-between gap-3 text-stone-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-800 shadow-2xs">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-zinc-900 truncate max-w-[280px] sm:max-w-md">
                          {file.name}
                        </p>
                        <p className="text-xs font-mono text-stone-500">
                          {(file.size / 1024).toFixed(1)} KB • Microsoft Word (.docx)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-stone-500 underline hover:text-stone-800">
                        Replace
                      </span>
                      <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-zinc-900">
                        Drop your master resume here
                      </span>
                      <span className="text-sm text-stone-600"> or click to browse</span>
                    </div>
                    <p className="text-xs font-mono text-stone-600">
                      Only Microsoft Word (.docx) files are supported for semantic formatting preservation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Slot 2: Target Opportunity Specification */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-800">
                  02. Target Opportunity Specification
                </label>

                {/* Segmented Mode Switcher */}
                <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab("url")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                      activeTab === "url"
                        ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    <span>Job URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("paste")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                      activeTab === "paste"
                        ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>Paste Text</span>
                  </button>
                </div>
              </div>

              {/* Scraper Fallback Alert */}
              {requiresFallback && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-semibold">Automated Scraper Interrupted</p>
                    <p className="mt-0.5 text-amber-800">
                      {fallbackError || "Anti-bot protection blocked live fetching. Please paste the job description text below to continue."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "url" ? (
                <div>
                  <input
                    type="url"
                    value={jobLink}
                    onChange={(e) => setJobLink(e.target.value)}
                    placeholder="https://www.linkedin.com/jobs/view/... or Indeed, Workday, Greenhouse"
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-stone-600 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-2xs"
                  />
                  <p className="mt-2 text-[11px] font-mono text-stone-600">
                    Supports public postings across LinkedIn, Indeed, Greenhouse, Lever, and Workday.
                  </p>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description, responsibilities, and required competencies here..."
                    className="w-full rounded-xl border border-stone-300 bg-white p-3.5 text-sm text-zinc-900 placeholder:text-stone-600 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors shadow-2xs font-sans"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-stone-600">
                    <span>Deterministic keyword extraction enabled</span>
                    <span>{jobDescription.length} characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-medium">{validationError}</span>
              </div>
            )}

            {/* Micro-Telemetry Status Ticker */}
            <div className="rounded-xl border border-stone-200/70 bg-stone-50/70 px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono text-stone-600">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-stone-500" />
                <span className="text-stone-500">TELEMETRY:</span>
                <span className="font-medium text-stone-800">
                  {file ? "DOCX_LOADED" : "AWAITING_INPUT"} 
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-stone-600">

              </div>
            </div>

            {/* Morphing Telemetry HUD Start Button */}
            <button
              type="submit"
              disabled={isLoading || Boolean(resumingSessionId)}
              className={`relative overflow-hidden w-full rounded-xl transition-all duration-300 text-white ${
                isLoading
                  ? "bg-gradient-to-r from-zinc-950 via-stone-900 to-emerald-950 border border-emerald-500/40 p-4 shadow-lg shadow-emerald-950/20"
                  : "bg-gradient-to-r from-zinc-900 via-stone-900 to-emerald-950/90 hover:from-zinc-900 hover:via-stone-800 hover:to-emerald-900 border border-emerald-500/25 hover:border-emerald-500/50 shadow-sm hover:shadow-md hover:shadow-emerald-950/30 p-3.5 sm:p-4 group cursor-pointer active:scale-[0.99]"
              }`}
            >
              {isLoading ? (
                /* Interactive Morphing Telemetry HUD during background execution */
                <div className="flex flex-col text-left space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="font-semibold text-emerald-400 tracking-wider">
                        {INTAKE_STAGES[stageIndex].stage}
                      </span>
                      <span className="text-stone-500">·</span>
                      <span className="text-stone-300 font-medium">BACKGROUND WORKSPACE ENGINE</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-semibold">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-sans font-medium text-stone-100">
                      {INTAKE_STAGES[stageIndex].label}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-stone-400 pl-6">
                    // {INTAKE_STAGES[stageIndex].detail}
                  </div>

                  <div className="w-full bg-stone-800/80 rounded-full h-1 overflow-hidden mt-1">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                /* Sleek Dark Emerald-Slate Idle Trigger */
                <div className="flex items-center justify-center gap-2.5 font-semibold text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <span className="tracking-wide">Initiate Agentic Tailoring Mission</span>

                </div>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Recent Dossiers / Past Sessions (Cols 8-12 on lg, 9-12 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs backdrop-blur-sm">
            {/* Header & Refresh */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-700" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-stone-800">
                  Recent Dossiers
                </h2>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600 border border-stone-200/60">
                  {sessions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={fetchSessions}
                disabled={isLoadingSessions}
                title="Refresh sessions list"
                className="cursor-pointer text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-md hover:bg-stone-100 disabled:opacity-50"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoadingSessions ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            </div>

            {/* List / Loading / Empty States */}
            {isLoadingSessions ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-stone-400" />
                <p className="text-xs font-mono text-stone-500">Querying session checkpointer...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 px-3 text-center space-y-2.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800">No Archived Missions</p>
                  <p className="text-[11px] text-stone-500 mt-1 max-w-[220px] mx-auto leading-normal">
                    When you analyze a resume, previous sessions are recorded here for instant restoration.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {sessions.map((sess) => {
                  const isCurrentResuming = resumingSessionId === sess.session_id;
                  return (
                    <div
                      key={sess.session_id}
                      className="group rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 hover:bg-white hover:border-stone-300 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                            {sess.job_title || "General Tailoring Run"}
                          </p>
                          <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                            {sess.job_company ? `@ ${sess.job_company}` : "Custom Target Specification"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-mono text-stone-500 border border-stone-200">
                          #{sess.session_id.slice(0, 6)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-stone-200/50 pt-2 text-[10px] font-mono text-stone-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(sess.created_at)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleResumePastSession(sess.session_id)}
                          disabled={Boolean(resumingSessionId)}
                          className="cursor-pointer inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-50 transition-colors"
                        >
                          {isCurrentResuming ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Rehydrating...</span>
                            </>
                          ) : (
                            <>
                              <span>Resume</span>
                              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl border border-stone-200/70 bg-[#faf9f6] p-4 text-xs text-stone-600 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Evidence-First Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-500">
              Checkpoints are cryptographically bounded to your authenticated user ID. Past runs preserve full interview traces and tailoring diff histories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
