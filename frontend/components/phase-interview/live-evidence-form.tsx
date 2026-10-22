"use client";

import { useState, useEffect, useMemo } from "react";
import { ExperienceMetadata } from "@/lib/types";
import {
  Briefcase,
  FolderGit2,
  Users2,
  Sparkles,
  Save,
  AlertCircle,
  Check,
  RotateCcw,
  Info,
  Loader2,
  PanelRightClose,
  MessageSquare,
} from "lucide-react";

export type ExperienceTabType = "work_experience" | "project" | "leadership" | "other";

interface LiveEvidenceFormProps {
  metadata: ExperienceMetadata | null;
  isLoading: boolean;
  highlightErrors?: boolean;
  hasUserReplied?: boolean;
  onSaveMetadata: (metadata: ExperienceMetadata) => Promise<void>;
  onResetTopicExperience: (newExperienceType: ExperienceTabType) => Promise<void>;
  onClose?: () => void;
}

export function LiveEvidenceForm({
  metadata,
  isLoading,
  highlightErrors = false,
  hasUserReplied = false,
  onSaveMetadata,
  onResetTopicExperience,
  onClose,
}: LiveEvidenceFormProps) {
  // An experience is considered unanchored at the start of a probing conversation
  // when no metadata entity has been established and the user has not chatted with the bot yet.
  const hasEntityIdentity = Boolean(
    metadata?.company?.trim() ||
    metadata?.project_name?.trim() ||
    metadata?.leadership_title?.trim() ||
    metadata?.other_title?.trim() ||
    metadata?.job_title?.trim() ||
    metadata?.role?.trim()
  );

  const isAwaitingConversation = !hasEntityIdentity && !hasUserReplied;

  // Determine current active tab
  const activeTab: ExperienceTabType =
    metadata?.experience_type || "work_experience";

  // Local draft state
  const [draft, setDraft] = useState<ExperienceMetadata>(() => metadata || { experience_type: "work_experience" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pendingSwitchTab, setPendingSwitchTab] = useState<ExperienceTabType | null>(null);

  // Sync draft when server metadata changes
  useEffect(() => {
    if (metadata) {
      setDraft(metadata);
    } else {
      setDraft({ experience_type: activeTab });
    }
  }, [metadata, activeTab]);

  // Check if draft has unsaved edits
  const isDirty = useMemo(() => {
    if (!metadata) {
      return Boolean(
        draft.company ||
        draft.job_title ||
        draft.project_name ||
        draft.role ||
        draft.leadership_title ||
        draft.position ||
        draft.other_title
      );
    }
    return JSON.stringify(draft) !== JSON.stringify(metadata);
  }, [draft, metadata]);

  // Handle local text field changes
  const updateField = (field: keyof ExperienceMetadata, val: string) => {
    setDraft((prev) => ({
      ...prev,
      experience_type: prev.experience_type || activeTab,
      [field]: val,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveMetadata({
        ...draft,
        experience_type: draft.experience_type || activeTab,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabClick = (tab: ExperienceTabType) => {
    if (isAwaitingConversation || tab === activeTab) return;

    // If an experience is already anchored with fields or conversation, warn before clearing
    const hasExistingContent = Boolean(
      metadata?.experience_type ||
      draft.company ||
      draft.project_name ||
      draft.leadership_title ||
      draft.other_title
    );

    if (hasExistingContent) {
      setPendingSwitchTab(tab);
    } else {
      // Clean tab switch if nothing was entered yet
      setDraft({ experience_type: tab });
    }
  };

  const confirmSwitchTab = async () => {
    if (!pendingSwitchTab) return;
    const target = pendingSwitchTab;
    setPendingSwitchTab(null);
    await onResetTopicExperience(target);
  };

  // Validation checks for highlighting
  const isWorkMissingCompany =
    activeTab === "work_experience" && highlightErrors && !draft.company?.trim();
  const isWorkMissingTitle =
    activeTab === "work_experience" && highlightErrors && !draft.job_title?.trim();
  const isProjMissingName =
    activeTab === "project" && highlightErrors && !draft.project_name?.trim();
  const isLeadMissingTitle =
    activeTab === "leadership" && highlightErrors && !draft.leadership_title?.trim();
  const isLeadMissingPosition =
    activeTab === "leadership" && highlightErrors && !draft.position?.trim();
  const isOtherMissingTitle =
    activeTab === "other" && highlightErrors && !draft.other_title?.trim();

  return (
    <div className="flex flex-col h-full rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Live Experience Identity
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Anchors this requirement to one experience. Updates sync to the chatbot.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isAwaitingConversation || !isDirty || isSaving || isLoading}
            className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Collapse evidence form"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/70 p-1 gap-1">
        <button
          type="button"
          disabled={isAwaitingConversation}
          onClick={() => handleTabClick("work_experience")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            isAwaitingConversation
              ? activeTab === "work_experience"
                ? "bg-white/60 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 cursor-not-allowed border border-dashed border-stone-300 dark:border-stone-700"
                : "text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50"
              : activeTab === "work_experience"
              ? "bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 shadow-xs cursor-pointer"
              : "text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-stone-900/50 cursor-pointer"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Work</span>
        </button>

        <button
          type="button"
          disabled={isAwaitingConversation}
          onClick={() => handleTabClick("project")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            isAwaitingConversation
              ? activeTab === "project"
                ? "bg-white/60 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 cursor-not-allowed border border-dashed border-stone-300 dark:border-stone-700"
                : "text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50"
              : activeTab === "project"
              ? "bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 shadow-xs cursor-pointer"
              : "text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-stone-900/50 cursor-pointer"
          }`}
        >
          <FolderGit2 className="h-3.5 w-3.5" />
          <span>Project</span>
        </button>

        <button
          type="button"
          disabled={isAwaitingConversation}
          onClick={() => handleTabClick("leadership")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            isAwaitingConversation
              ? activeTab === "leadership"
                ? "bg-white/60 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 cursor-not-allowed border border-dashed border-stone-300 dark:border-stone-700"
                : "text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50"
              : activeTab === "leadership"
              ? "bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 shadow-xs cursor-pointer"
              : "text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-stone-900/50 cursor-pointer"
          }`}
        >
          <Users2 className="h-3.5 w-3.5" />
          <span>Leadership</span>
        </button>

        <button
          type="button"
          disabled={isAwaitingConversation}
          onClick={() => handleTabClick("other")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            isAwaitingConversation
              ? activeTab === "other"
                ? "bg-white/60 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 cursor-not-allowed border border-dashed border-stone-300 dark:border-stone-700"
                : "text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50"
              : activeTab === "other"
              ? "bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 shadow-xs cursor-pointer"
              : "text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-stone-900/50 cursor-pointer"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Other</span>
        </button>
      </div>

      {/* Form Inputs Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {/* Guidance Callout when Awaiting Initial Conversation */}
        {isAwaitingConversation && (
          <div className="rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/40 p-3.5 space-y-1.5 text-sky-950 dark:text-sky-200 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-sky-900 dark:text-sky-100">
                  Chat with the Interviewer First
                </h4>
                <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80 mt-0.5 leading-relaxed">
                  Answer the opening question in the chat to begin. Once you start describing what you worked on, the agent will automatically detect your experience type (Work, Project, Leadership) and unlock this form for live editing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WORK EXPERIENCE FIELDS */}
        {activeTab === "work_experience" && (
          <>
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Company Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.company || ""}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="e.g. Stripe, Acme Corp"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isWorkMissingCompany
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isWorkMissingCompany && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Company Name is required to save evidence.
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Job Title <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.job_title || ""}
                onChange={(e) => updateField("job_title", e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isWorkMissingTitle
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isWorkMissingTitle && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Job Title is required to save evidence.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Duration <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isAwaitingConversation}
                  value={draft.duration || ""}
                  onChange={(e) => updateField("duration", e.target.value)}
                  placeholder="e.g. 2022 - Present"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Location <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isAwaitingConversation}
                  value={draft.location || ""}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="e.g. San Francisco or Remote"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
                />
              </div>
            </div>
          </>
        )}

        {/* PROJECT FIELDS */}
        {activeTab === "project" && (
          <>
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Project Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.project_name || ""}
                onChange={(e) => updateField("project_name", e.target.value)}
                placeholder="e.g. Distributed Key-Value Store"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isProjMissingName
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isProjMissingName && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Project Name is required to save evidence.
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Your Role <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.role || ""}
                onChange={(e) => updateField("role", e.target.value)}
                placeholder="e.g. Creator & Lead Developer"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Technologies / Frameworks <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.technologies?.join(", ") || ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    technologies: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="e.g. Go, Raft, gRPC, Docker"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Duration / Timeframe <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.duration || ""}
                onChange={(e) => updateField("duration", e.target.value)}
                placeholder="e.g. Fall 2023, 2024"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
              />
            </div>
          </>
        )}

        {/* LEADERSHIP FIELDS */}
        {activeTab === "leadership" && (
          <>
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Organization / Initiative <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.leadership_title || ""}
                onChange={(e) => updateField("leadership_title", e.target.value)}
                placeholder="e.g. ACM Student Chapter, Hackathon Lead"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isLeadMissingTitle
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isLeadMissingTitle && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Organization Title is required to save evidence.
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Position / Role <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.position || ""}
                onChange={(e) => updateField("position", e.target.value)}
                placeholder="e.g. President, Technical Director"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isLeadMissingPosition
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isLeadMissingPosition && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Position is required to save evidence.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Duration <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isAwaitingConversation}
                  value={draft.duration || ""}
                  onChange={(e) => updateField("duration", e.target.value)}
                  placeholder="e.g. 2022 - 2023"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Location <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isAwaitingConversation}
                  value={draft.location || ""}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="e.g. Berkeley, CA"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
                />
              </div>
            </div>
          </>
        )}

        {/* OTHER FIELDS */}
        {activeTab === "other" && (
          <>
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Experience Title <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.other_title || ""}
                onChange={(e) => updateField("other_title", e.target.value)}
                placeholder="e.g. Open Source Contributor, Volunteer Dev"
                className={`w-full rounded-lg border px-3 py-2 text-xs bg-white dark:bg-stone-900 text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60 ${
                  isOtherMissingTitle
                    ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-rose-500"
                    : "border-stone-300 dark:border-stone-700 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900"
                }`}
              />
              {isOtherMissingTitle && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Experience Title is required to save evidence.
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Organization / Entity <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isAwaitingConversation}
                value={draft.other_organization || ""}
                onChange={(e) => updateField("other_organization", e.target.value)}
                placeholder="e.g. Kubernetes Community, Red Cross"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Context Notes <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                disabled={isAwaitingConversation}
                value={draft.other_notes || ""}
                onChange={(e) => updateField("other_notes", e.target.value)}
                placeholder="Brief notes on what you did..."
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-stone-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800/60"
              />
            </div>
          </>
        )}

        {/* Helpful Info Footer */}
        <div className="rounded-lg bg-stone-100/80 dark:bg-stone-800/80 p-2.5 text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
          <p>
            Qualitative evidence (actions, metrics, scope) is gathered by the chatbot. Fields marked with <span className="text-rose-500 font-semibold">*</span> are required to finalize evidence.
          </p>
        </div>
      </div>

      {/* Switching Confirmation Modal */}
      {pendingSwitchTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Switch Experience Type?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Switching to <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">{pendingSwitchTab.replace("_", " ")}</span> will clear the current conversation and evidence for this topic so distinct experiences don't get mixed together.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingSwitchTab(null)}
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitchTab}
                className="cursor-pointer px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-medium text-white transition-colors shadow-xs"
              >
                Reset & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
