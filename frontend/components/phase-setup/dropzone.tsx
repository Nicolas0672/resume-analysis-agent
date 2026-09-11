"use client";

import { useState, useRef, DragEvent, ChangeEvent, FormEvent, useEffect } from "react";
import { UploadCloud, FileText, Globe, AlertCircle, Loader2, Sparkles, Check } from "lucide-react";

interface DropzoneProps {
  isLoading: boolean;
  requiresFallback: boolean;
  fallbackError: string | null;
  pendingFile: File | null;
  onUpload: (file: File, jobLink?: string, jobDescription?: string) => void;
}

export function Dropzone({
  isLoading,
  requiresFallback,
  fallbackError,
  pendingFile,
  onUpload,
}: DropzoneProps) {
  const [file, setFile] = useState<File | null>(pendingFile);
  const [activeTab, setActiveTab] = useState<"url" | "paste">("url");
  const [jobLink, setJobLink] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 mb-4 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
          <span>Evidence-First Resume Tailoring</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Target Your Dream Role With Truth
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          We don’t hallucinate skills. We compare your verified experience against target requirements, probe for real-world metrics, and build fact-checked resume bullets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Resume Upload */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            1. Upload Your Resume (.docx)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/50"
                : file
                ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50"
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
              <div className="flex items-center justify-center gap-3 text-emerald-700 dark:text-emerald-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                </div>
                <Check className="h-5 w-5 ml-auto text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Click to upload</span> or drag and drop
                </div>
                <p className="text-xs text-zinc-500">Microsoft Word (.docx) files only</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Target Job Posting */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              2. Target Job Listing
            </label>

            {/* Tab switch */}
            <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  activeTab === "url"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Globe className="h-3 w-3" />
                <span>Job URL</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("paste")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                  activeTab === "paste"
                    ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>

          {/* Scraper Fallback Alert */}
          {requiresFallback && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">URL Extraction Incomplete</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  {fallbackError || "Anti-bot protection blocked the scraper. Please paste the job description text below."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "url" ? (
            <div>
              <div className="relative">
                <input
                  type="url"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/... or Indeed, Workday"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                Supports LinkedIn, Indeed, and Workday postings.
              </p>
            </div>
          ) : (
            <div>
              <textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description, requirements, and responsibilities here..."
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Paste the full job post to extract requirements deterministically.
              </p>
            </div>
          )}
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:bg-zinc-400 disabled:text-zinc-200 disabled:border-zinc-300 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Resume & Extracting Job Gaps...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Analyze Alignment & Surface Gaps</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
