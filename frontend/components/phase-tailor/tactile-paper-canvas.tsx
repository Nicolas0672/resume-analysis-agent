"use client";

import { useState, useRef, useEffect } from "react";
import {
  ResumeBullet,
  ResumeExperience,
  ResumeLeadership,
  ResumeProject,
  ResumeEducation,
  ResumeCertification,
  ResumeSkills,
  ResumeStructure,
} from "@/lib/types";
import {
  Briefcase,
  Check,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Plus,
} from "lucide-react";
import { getActiveSkillEntries } from "@/lib/utils";

interface TactilePaperCanvasProps {
  resume: ResumeStructure | null;
  highlightSentenceIds?: number[];
  recentUpdatedSentenceIds?: number[];
  onEditBullet: (sentenceId: number, newText: string) => Promise<void>;
  onDeleteBullet: (sentenceId: number) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
  onEditEntry?: (entryId: number, patch: Record<string, any>) => Promise<void>;
  onAddBullet?: (entryId: number, text: string) => Promise<void>;
  onEditSkills?: (skills: ResumeSkills) => Promise<void>;
}

export function TactilePaperCanvas({
  resume,
  highlightSentenceIds = [],
  recentUpdatedSentenceIds = [],
  onEditBullet,
  onDeleteBullet,
  onDeleteEntry,
  onEditEntry,
  onAddBullet,
  onEditSkills,
}: TactilePaperCanvasProps) {
  // Bullet editing
  const [editingSentenceId, setEditingSentenceId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);

  // Entry metadata editing
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingEntryDraft, setEditingEntryDraft] = useState<Record<string, any>>({});

  // Add bullet state
  const [addingBulletEntryId, setAddingBulletEntryId] = useState<number | null>(null);
  const [addingBulletDraft, setAddingBulletDraft] = useState<string>("");

  // Skills editing
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [skillsDraft, setSkillsDraft] = useState<Record<string, string>>({});

  const skillEntries = getActiveSkillEntries(resume?.skills);

  const activeElementRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when highlighted items change
  useEffect(() => {
    if (activeElementRef.current) {
      activeElementRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSentenceIds, recentUpdatedSentenceIds]);

  // Bullet handlers
  const handleStartEdit = (bullet: ResumeBullet) => {
    setEditingSentenceId(bullet.sentence_id);
    setEditingDraft(bullet.text);
  };

  const handleCancelEdit = () => {
    setEditingSentenceId(null);
    setEditingDraft("");
  };

  const handleSaveEdit = async () => {
    if (editingSentenceId === null || !editingDraft.trim()) return;
    setIsSaving(true);
    try {
      await onEditBullet(editingSentenceId, editingDraft.trim());
      setEditingSentenceId(null);
      setEditingDraft("");
    } catch (err) {
      console.error("Failed to edit bullet", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBulletClick = async (sentenceId: number) => {
    if (confirm("Are you sure you want to delete this bullet point?")) {
      await onDeleteBullet(sentenceId);
    }
  };

  const handleDeleteEntryClick = async (entryId: number, label: string) => {
    if (confirm(`Are you sure you want to remove "${label}" and all its bullets?`)) {
      setDeletingEntryId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingEntryId(null);
      }
    }
  };

  // Entry editing handlers
  const handleStartEditEntry = (entryId: number, initialData: Record<string, any>) => {
    setEditingEntryId(entryId);
    setEditingEntryDraft({ ...initialData });
  };

  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setEditingEntryDraft({});
  };

  const handleSaveEditEntry = async (entryId: number) => {
    if (!onEditEntry) return;
    setIsSaving(true);
    try {
      await onEditEntry(entryId, editingEntryDraft);
      setEditingEntryId(null);
      setEditingEntryDraft({});
    } catch (err) {
      console.error("Failed to edit entry", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add bullet handlers
  const handleStartAddBullet = (entryId: number) => {
    setAddingBulletEntryId(entryId);
    setAddingBulletDraft("");
  };

  const handleCancelAddBullet = () => {
    setAddingBulletEntryId(null);
    setAddingBulletDraft("");
  };

  const handleSaveAddBullet = async (entryId: number) => {
    if (!onAddBullet || !addingBulletDraft.trim()) return;
    setIsSaving(true);
    try {
      await onAddBullet(entryId, addingBulletDraft.trim());
      setAddingBulletEntryId(null);
      setAddingBulletDraft("");
    } catch (err) {
      console.error("Failed to add bullet", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Skills editing handlers
  const handleStartEditSkills = () => {
    const s = resume?.skills;
    setSkillsDraft({
      programming_languages: (s?.programming_languages || []).join(", "),
      frameworks: (s?.frameworks || []).join(", "),
      libraries: (s?.libraries || []).join(", "),
      databases: (s?.databases || []).join(", "),
      cloud: (s?.cloud || []).join(", "),
      tools: (s?.tools || []).join(", "),
      other: (s?.other || []).join(", "),
    });
    setIsEditingSkills(true);
  };

  const handleCancelEditSkills = () => {
    setIsEditingSkills(false);
    setSkillsDraft({});
  };

  const handleSaveEditSkills = async () => {
    if (!onEditSkills) return;
    setIsSaving(true);
    try {
      const splitClean = (val?: string) =>
        val
          ? val
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [];

      const updatedSkills: ResumeSkills = {
        programming_languages: splitClean(skillsDraft.programming_languages),
        frameworks: splitClean(skillsDraft.frameworks),
        libraries: splitClean(skillsDraft.libraries),
        databases: splitClean(skillsDraft.databases),
        cloud: splitClean(skillsDraft.cloud),
        tools: splitClean(skillsDraft.tools),
        other: splitClean(skillsDraft.other),
        sentence_ids: resume?.skills?.sentence_ids || [],
      };

      await onEditSkills(updatedSkills);
      setIsEditingSkills(false);
      setSkillsDraft({});
    } catch (err) {
      console.error("Failed to edit skills", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!resume) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center text-xs text-zinc-400">
        No resume document loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      {/* Canvas Header Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 mb-3 px-1 text-xs">
        <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
          <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Working Resume Canvas (Draft)</span>
        </div>
        <span className="text-[11px] text-zinc-400">
          Hover any header or bullet to edit in-place or remove
        </span>
      </div>

      {/* Tactile Sheet Canvas Container */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2">
        <div className="mx-auto max-w-[680px] rounded-lg border border-zinc-200 bg-white p-6 sm:p-8 pb-5 sm:pb-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all font-sans text-xs text-zinc-800 dark:text-zinc-200">
          {/* Document Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 text-center mb-3.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {resume.name || "Candidate Name"}
            </h1>
            {resume.contact && (
              <p className="text-[11px] text-zinc-500 mt-1 font-normal tracking-wide">
                {resume.contact}
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* EDUCATION SECTION                                                         */}
          {/* ========================================================================= */}
          {resume.education && resume.education.length > 0 && (
            <div className="mb-3.5">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Education
                </h2>
              </div>

              <div className="space-y-2">
                {resume.education.map((edu, eduIdx) => {
                  const entryId = edu.entry_id ?? eduIdx;
                  const isEditingEntry = editingEntryId === entryId;

                  if (isEditingEntry) {
                    return (
                      <div
                        key={entryId}
                        className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Institution
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.institution || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  institution: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. University of California"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Duration / Dates
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.duration || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  duration: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. 2020 - 2024"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Degree
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.degree || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  degree: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. Bachelor of Science"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Field of Study
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.field_of_study || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  field_of_study: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. Computer Science"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              GPA
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.gpa || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  gpa: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. 3.8 / 4.0"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Location
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.location || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  location: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. Berkeley, CA"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Relevant Coursework (comma separated)
                            </label>
                            <input
                              type="text"
                              value={
                                Array.isArray(editingEntryDraft.coursework)
                                  ? editingEntryDraft.coursework.join(", ")
                                  : editingEntryDraft.coursework || ""
                              }
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  coursework: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. Data Structures, Algorithms, Distributed Systems"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={handleCancelEditEntry}
                            className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            disabled={isSaving}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditEntry(entryId)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save Education"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={entryId}
                      className="group/entry relative rounded p-1 -mx-1 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        <span>{edu.institution || "Institution"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 font-normal text-[11px]">
                            {edu.duration || edu.location || ""}
                          </span>
                          <div className="opacity-0 group-hover/entry:opacity-100 flex items-center gap-1 transition-opacity">
                            {onEditEntry && edu.entry_id !== undefined && edu.entry_id !== null && (
                              <button
                                onClick={() =>
                                  handleStartEditEntry(edu.entry_id!, {
                                    institution: edu.institution,
                                    degree: edu.degree,
                                    field_of_study: edu.field_of_study,
                                    duration: edu.duration,
                                    location: edu.location,
                                    gpa: edu.gpa,
                                    coursework: edu.coursework,
                                  })
                                }
                                title="Edit education details"
                                className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                            {edu.entry_id !== undefined && edu.entry_id !== null && (
                              <button
                                onClick={() =>
                                  handleDeleteEntryClick(
                                    edu.entry_id!,
                                    edu.institution || "Education entry"
                                  )
                                }
                                title="Delete education entry"
                                disabled={deletingEntryId === edu.entry_id}
                                className="p-0.5 rounded text-zinc-400 hover:text-red-600 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] text-zinc-700 dark:text-zinc-300">
                        <span>
                          {edu.degree || "Degree"}
                          {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                        </span>
                        {edu.gpa && (
                          <span className="text-zinc-500 text-[10px]">GPA: {edu.gpa}</span>
                        )}
                      </div>

                      {edu.coursework && edu.coursework.length > 0 && (
                        <div className="text-[10px] text-zinc-500">
                          Relevant Coursework: {edu.coursework.join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORK EXPERIENCE SECTION                                                   */}
          {/* ========================================================================= */}
          {resume.work_experience && resume.work_experience.length > 0 && (
            <div className="mb-3.5">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Work Experience
                </h2>
              </div>

              <div className="space-y-2.5">
                {resume.work_experience.map((exp, expIdx) => {
                  const entryId = exp.entry_id ?? expIdx;
                  const isEditingEntry = editingEntryId === entryId;
                  const isAddingBullet = addingBulletEntryId === entryId;
                  const hasHighlightedBullet = exp.bullets.some(
                    (b) =>
                      highlightSentenceIds.includes(b.sentence_id) ||
                      recentUpdatedSentenceIds.includes(b.sentence_id)
                  );

                  return (
                    <div
                      key={entryId}
                      ref={hasHighlightedBullet ? activeElementRef : null}
                      className={`group/entry relative rounded p-1 -mx-1 transition-all ${
                        hasHighlightedBullet
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : ""
                      }`}
                    >
                      {/* Entry Header: Edit Mode vs View Mode */}
                      {isEditingEntry ? (
                        <div className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Job Title
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.job_title || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    job_title: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. Senior Software Engineer"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Company
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.company || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    company: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. Google"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Duration / Dates
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.duration || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    duration: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. 2021 - Present"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Location
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.location || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    location: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. New York, NY"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={handleCancelEditEntry}
                              className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditEntry(entryId)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Role"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{exp.job_title || "Job Title"}</span>
                            {exp.company && (
                              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                                • {exp.company}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[11px] font-normal">
                              {exp.duration || ""}
                            </span>
                            <div className="opacity-0 group-hover/entry:opacity-100 flex items-center gap-1 transition-opacity">
                              {onEditEntry && exp.entry_id !== undefined && exp.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleStartEditEntry(exp.entry_id!, {
                                      job_title: exp.job_title,
                                      company: exp.company,
                                      duration: exp.duration,
                                      location: exp.location,
                                    })
                                  }
                                  title="Edit role header"
                                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                              {exp.entry_id !== undefined && exp.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleDeleteEntryClick(
                                      exp.entry_id!,
                                      `${exp.job_title} at ${exp.company}`
                                    )
                                  }
                                  title="Delete entire role"
                                  disabled={deletingEntryId === exp.entry_id}
                                  className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {exp.location && !isEditingEntry && (
                        <div className="text-[10px] text-zinc-500 mb-0.5 font-normal">
                          {exp.location}
                        </div>
                      )}

                      {/* Bullets List */}
                      <ul className="space-y-0.5 mt-1">
                        {exp.bullets.map((bullet) => {
                          const isEditing = editingSentenceId === bullet.sentence_id;
                          const isRecent = recentUpdatedSentenceIds.includes(bullet.sentence_id);
                          const isHighlighted = highlightSentenceIds.includes(bullet.sentence_id);

                          return (
                            <li
                              key={bullet.sentence_id}
                              className={`group/bullet relative rounded px-1.5 py-0.5 -mx-1 transition-all ${
                                isRecent
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 ring-1 ring-emerald-500 animate-pulse"
                                  : isHighlighted
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                              }`}
                            >
                              {isEditing ? (
                                <div className="space-y-2 py-1">
                                  <textarea
                                    value={editingDraft}
                                    onChange={(e) => setEditingDraft(e.target.value)}
                                    rows={3}
                                    className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                      } else if (e.key === "Escape") {
                                        handleCancelEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      disabled={isSaving}
                                    >
                                      Cancel (Esc)
                                    </button>
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                      disabled={isSaving}
                                    >
                                      {isSaving ? "Saving..." : "Save (Enter)"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span className="flex-1 leading-snug text-zinc-700 dark:text-zinc-300">
                                    • {bullet.text}
                                    {isRecent && (
                                      <span className="ml-2 inline-flex items-center text-[9px] font-semibold uppercase text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                                        Agent Updated
                                      </span>
                                    )}
                                  </span>

                                  {/* Quick In-Place Action Icons */}
                                  <div className="opacity-0 group-hover/bullet:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                    <button
                                      onClick={() => handleStartEdit(bullet)}
                                      title="Edit bullet text"
                                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteBulletClick(bullet.sentence_id)
                                      }
                                      title="Delete bullet"
                                      className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Add Bullet Input / Trigger */}
                      {onAddBullet && exp.entry_id !== undefined && exp.entry_id !== null && (
                        <div className="mt-1 pl-2">
                          {isAddingBullet ? (
                            <div className="space-y-2 py-1 rounded bg-zinc-50/70 dark:bg-zinc-800/40 p-2 border border-zinc-200 dark:border-zinc-700">
                              <textarea
                                value={addingBulletDraft}
                                onChange={(e) => setAddingBulletDraft(e.target.value)}
                                placeholder="Type new bullet point here..."
                                rows={2}
                                className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={handleCancelAddBullet}
                                  className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100"
                                  disabled={isSaving}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveAddBullet(exp.entry_id!)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  disabled={isSaving}
                                >
                                  {isSaving ? "Adding..." : "Add Bullet"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAddBullet(exp.entry_id!)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add bullet point</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PROJECTS SECTION                                                          */}
          {/* ========================================================================= */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="mb-3.5">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Projects
                </h2>
              </div>

              <div className="space-y-2.5">
                {resume.projects.map((proj, projIdx) => {
                  const entryId = proj.entry_id ?? projIdx;
                  const isEditingEntry = editingEntryId === entryId;
                  const isAddingBullet = addingBulletEntryId === entryId;
                  const hasHighlightedBullet = proj.bullets.some(
                    (b) =>
                      highlightSentenceIds.includes(b.sentence_id) ||
                      recentUpdatedSentenceIds.includes(b.sentence_id)
                  );

                  return (
                    <div
                      key={entryId}
                      ref={hasHighlightedBullet ? activeElementRef : null}
                      className={`group/entry relative rounded p-1 -mx-1 transition-all ${
                        hasHighlightedBullet
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : ""
                      }`}
                    >
                      {/* Project Header: Edit Mode vs View Mode */}
                      {isEditingEntry ? (
                        <div className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Project Name
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.project_name || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    project_name: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. Distributed Task Queue"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Duration / Dates
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.duration || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    duration: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. 2023"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Technologies (comma separated)
                              </label>
                              <input
                                type="text"
                                value={
                                  Array.isArray(editingEntryDraft.technologies)
                                    ? editingEntryDraft.technologies.join(", ")
                                    : editingEntryDraft.technologies || ""
                                }
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    technologies: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. Go, Redis, Docker"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={handleCancelEditEntry}
                              className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditEntry(entryId)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Project"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100">
                          <span className="text-xs">{proj.project_name || "Project"}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[11px] font-normal">
                              {proj.duration || ""}
                            </span>
                            <div className="opacity-0 group-hover/entry:opacity-100 flex items-center gap-1 transition-opacity">
                              {onEditEntry && proj.entry_id !== undefined && proj.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleStartEditEntry(proj.entry_id!, {
                                      project_name: proj.project_name,
                                      duration: proj.duration,
                                      role: proj.role,
                                      technologies: proj.technologies,
                                    })
                                  }
                                  title="Edit project header"
                                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                              {proj.entry_id !== undefined && proj.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleDeleteEntryClick(
                                      proj.entry_id!,
                                      proj.project_name || "Project"
                                    )
                                  }
                                  title="Delete project"
                                  disabled={deletingEntryId === proj.entry_id}
                                  className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {proj.technologies && proj.technologies.length > 0 && !isEditingEntry && (
                        <div className="text-[10px] text-zinc-500 mb-0.5 font-normal">
                          Tech: {proj.technologies.join(", ")}
                        </div>
                      )}

                      {/* Bullets List */}
                      <ul className="space-y-0.5 mt-1">
                        {proj.bullets.map((bullet) => {
                          const isEditing = editingSentenceId === bullet.sentence_id;
                          const isRecent = recentUpdatedSentenceIds.includes(bullet.sentence_id);

                          return (
                            <li
                              key={bullet.sentence_id}
                              className="group/bullet relative rounded px-1.5 py-0.5 -mx-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all"
                            >
                              {isEditing ? (
                                <div className="space-y-2 py-1">
                                  <textarea
                                    value={editingDraft}
                                    onChange={(e) => setEditingDraft(e.target.value)}
                                    rows={3}
                                    className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      disabled={isSaving}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                      disabled={isSaving}
                                    >
                                      {isSaving ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span className="flex-1 leading-snug text-zinc-700 dark:text-zinc-300">
                                    • {bullet.text}
                                    {isRecent && (
                                      <span className="ml-2 inline-flex items-center text-[9px] font-semibold uppercase text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                                        Agent Updated
                                      </span>
                                    )}
                                  </span>
                                  <div className="opacity-0 group-hover/bullet:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                    <button
                                      onClick={() => handleStartEdit(bullet)}
                                      title="Edit bullet text"
                                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteBulletClick(bullet.sentence_id)
                                      }
                                      title="Delete bullet"
                                      className="p-1 rounded text-zinc-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Add Bullet Input / Trigger */}
                      {onAddBullet && proj.entry_id !== undefined && proj.entry_id !== null && (
                        <div className="mt-1 pl-2">
                          {isAddingBullet ? (
                            <div className="space-y-2 py-1 rounded bg-zinc-50/70 dark:bg-zinc-800/40 p-2 border border-zinc-200 dark:border-zinc-700">
                              <textarea
                                value={addingBulletDraft}
                                onChange={(e) => setAddingBulletDraft(e.target.value)}
                                placeholder="Type new bullet point here..."
                                rows={2}
                                className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={handleCancelAddBullet}
                                  className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100"
                                  disabled={isSaving}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveAddBullet(proj.entry_id!)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  disabled={isSaving}
                                >
                                  {isSaving ? "Adding..." : "Add Bullet"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAddBullet(proj.entry_id!)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add bullet point</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEADERSHIP & EXTRACURRICULARS SECTION                                     */}
          {/* ========================================================================= */}
          {resume.leadership && resume.leadership.length > 0 && (
            <div className="mb-3.5">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Leadership & Extracurriculars
                </h2>
              </div>

              <div className="space-y-2.5">
                {resume.leadership.map((lead, leadIdx) => {
                  const entryId = lead.entry_id ?? leadIdx;
                  const isEditingEntry = editingEntryId === entryId;
                  const isAddingBullet = addingBulletEntryId === entryId;

                  return (
                    <div
                      key={entryId}
                      className="group/entry relative rounded p-1 -mx-1 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                    >
                      {/* Leadership Header: Edit vs View */}
                      {isEditingEntry ? (
                        <div className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Organization / Title
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.title || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. IEEE Student Chapter"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Position / Role
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.position || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    position: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. President"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Duration
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.duration || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    duration: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. 2022 - 2023"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                                Location
                              </label>
                              <input
                                type="text"
                                value={editingEntryDraft.location || ""}
                                onChange={(e) =>
                                  setEditingEntryDraft((prev) => ({
                                    ...prev,
                                    location: e.target.value,
                                  }))
                                }
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                placeholder="e.g. Cambridge, MA"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={handleCancelEditEntry}
                              className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditEntry(entryId)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Entry"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{lead.title}</span>
                            {lead.position && (
                              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                                • {lead.position}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[11px] font-normal">
                              {lead.duration || ""}
                            </span>
                            <div className="opacity-0 group-hover/entry:opacity-100 flex items-center gap-1 transition-opacity">
                              {onEditEntry && lead.entry_id !== undefined && lead.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleStartEditEntry(lead.entry_id!, {
                                      title: lead.title,
                                      position: lead.position,
                                      duration: lead.duration,
                                      location: lead.location,
                                    })
                                  }
                                  title="Edit leadership entry"
                                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                              {lead.entry_id !== undefined && lead.entry_id !== null && (
                                <button
                                  onClick={() =>
                                    handleDeleteEntryClick(lead.entry_id!, lead.title)
                                  }
                                  title="Delete leadership entry"
                                  disabled={deletingEntryId === lead.entry_id}
                                  className="p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bullets List */}
                      <ul className="space-y-0.5 mt-1">
                        {lead.bullets.map((bullet) => {
                          const isEditing = editingSentenceId === bullet.sentence_id;
                          return (
                            <li
                              key={bullet.sentence_id}
                              className="group/bullet relative rounded px-1.5 py-0.5 -mx-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all"
                            >
                              {isEditing ? (
                                <div className="space-y-2 py-1">
                                  <textarea
                                    value={editingDraft}
                                    onChange={(e) => setEditingDraft(e.target.value)}
                                    rows={3}
                                    className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100"
                                      disabled={isSaving}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                      disabled={isSaving}
                                    >
                                      {isSaving ? "Saving..." : "Save"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <span className="flex-1 leading-snug text-zinc-700 dark:text-zinc-300">
                                    • {bullet.text}
                                  </span>
                                  <div className="opacity-0 group-hover/bullet:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                    <button
                                      onClick={() => handleStartEdit(bullet)}
                                      title="Edit bullet text"
                                      className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteBulletClick(bullet.sentence_id)
                                      }
                                      title="Delete bullet"
                                      className="p-1 rounded text-zinc-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Add Bullet Input / Trigger */}
                      {onAddBullet && lead.entry_id !== undefined && lead.entry_id !== null && (
                        <div className="mt-1 pl-2">
                          {isAddingBullet ? (
                            <div className="space-y-2 py-1 rounded bg-zinc-50/70 dark:bg-zinc-800/40 p-2 border border-zinc-200 dark:border-zinc-700">
                              <textarea
                                value={addingBulletDraft}
                                onChange={(e) => setAddingBulletDraft(e.target.value)}
                                placeholder="Type new bullet point here..."
                                rows={2}
                                className="w-full rounded border border-emerald-500 bg-white p-2 text-xs text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100"
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={handleCancelAddBullet}
                                  className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-100"
                                  disabled={isSaving}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveAddBullet(lead.entry_id!)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  disabled={isSaving}
                                >
                                  {isSaving ? "Adding..." : "Add Bullet"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAddBullet(lead.entry_id!)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add bullet point</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CERTIFICATIONS SECTION                                                    */}
          {/* ========================================================================= */}
          {resume.certifications && resume.certifications.length > 0 && (
            <div className="mb-3.5">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Certifications
                </h2>
              </div>

              <div className="space-y-1">
                {resume.certifications.map((cert, certIdx) => {
                  const entryId = cert.entry_id ?? certIdx;
                  const isEditingEntry = editingEntryId === entryId;

                  if (isEditingEntry) {
                    return (
                      <div
                        key={entryId}
                        className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Certification Name
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.name || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. AWS Certified Solutions Architect"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                              Date / Status
                            </label>
                            <input
                              type="text"
                              value={editingEntryDraft.date || ""}
                              onChange={(e) =>
                                setEditingEntryDraft((prev) => ({
                                  ...prev,
                                  date: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                              placeholder="e.g. 2024"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={handleCancelEditEntry}
                            className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200"
                            disabled={isSaving}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditEntry(entryId)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={entryId}
                      className="group/entry flex justify-between items-baseline text-xs text-zinc-800 dark:text-zinc-200 p-0.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <span className="font-medium">• {cert.name}</span>
                      <div className="flex items-center gap-2">
                        {cert.date && (
                          <span className="text-[11px] text-zinc-500 font-normal">
                            {cert.date}
                          </span>
                        )}
                        <div className="opacity-0 group-hover/entry:opacity-100 flex items-center gap-1 transition-opacity">
                          {onEditEntry && cert.entry_id !== undefined && cert.entry_id !== null && (
                            <button
                              onClick={() =>
                                handleStartEditEntry(cert.entry_id!, {
                                  name: cert.name,
                                  date: cert.date,
                                })
                              }
                              title="Edit certification"
                              className="p-0.5 rounded text-zinc-400 hover:text-zinc-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          {cert.entry_id !== undefined && cert.entry_id !== null && (
                            <button
                              onClick={() =>
                                handleDeleteEntryClick(cert.entry_id!, cert.name)
                              }
                              title="Delete certification"
                              disabled={deletingEntryId === cert.entry_id}
                              className="p-0.5 rounded text-zinc-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TECHNICAL SKILLS SECTION                                                  */}
          {/* ========================================================================= */}
          {(skillEntries.length > 0 || isEditingSkills) && (
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Technical Skills
                </h2>
                {onEditSkills && !isEditingSkills && (
                  <button
                    onClick={handleStartEditSkills}
                    title="Edit technical skills"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              {isEditingSkills ? (
                <div className="rounded-lg border border-emerald-500 bg-zinc-50/70 dark:bg-zinc-800/50 p-2.5 space-y-2 my-1">
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                        Languages (comma separated)
                      </label>
                      <input
                        type="text"
                        value={skillsDraft.programming_languages || ""}
                        onChange={(e) =>
                          setSkillsDraft((prev) => ({
                            ...prev,
                            programming_languages: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g. Python, TypeScript, Go, Java"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                        Frameworks
                      </label>
                      <input
                        type="text"
                        value={skillsDraft.frameworks || ""}
                        onChange={(e) =>
                          setSkillsDraft((prev) => ({
                            ...prev,
                            frameworks: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g. React, Next.js, FastAPI"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                        Developer Tools
                      </label>
                      <input
                        type="text"
                        value={skillsDraft.tools || ""}
                        onChange={(e) =>
                          setSkillsDraft((prev) => ({
                            ...prev,
                            tools: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g. Git, Docker, Kubernetes"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                        Databases
                      </label>
                      <input
                        type="text"
                        value={skillsDraft.databases || ""}
                        onChange={(e) =>
                          setSkillsDraft((prev) => ({
                            ...prev,
                            databases: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g. PostgreSQL, Redis, MongoDB"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">
                        Cloud / DevOps
                      </label>
                      <input
                        type="text"
                        value={skillsDraft.cloud || ""}
                        onChange={(e) =>
                          setSkillsDraft((prev) => ({
                            ...prev,
                            cloud: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g. AWS, GCP, Azure"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      onClick={handleCancelEditSkills}
                      className="px-2 py-1 text-[11px] rounded text-zinc-500 hover:bg-zinc-200"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditSkills}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Skills"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                  {skillEntries.map((entry, idx) => (
                    <div key={idx}>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {entry.label}:{" "}
                      </span>
                      <span>{entry.items.join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
