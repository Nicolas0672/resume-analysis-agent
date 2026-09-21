"use client";

import { useState, useRef, useEffect } from "react";
import { ResumeBullet, ResumeExperience, ResumeProject, ResumeStructure } from "@/lib/types";
import { Briefcase, Check, Edit2, Trash2, X, AlertCircle } from "lucide-react";
import { getActiveSkillEntries } from "@/lib/utils";

interface TactilePaperCanvasProps {
  resume: ResumeStructure | null;
  highlightSentenceIds?: number[];
  recentUpdatedSentenceIds?: number[];
  onEditBullet: (sentenceId: number, newText: string) => Promise<void>;
  onDeleteBullet: (sentenceId: number) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
}

export function TactilePaperCanvas({
  resume,
  highlightSentenceIds = [],
  recentUpdatedSentenceIds = [],
  onEditBullet,
  onDeleteBullet,
  onDeleteEntry,
}: TactilePaperCanvasProps) {
  const [editingSentenceId, setEditingSentenceId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);

  const skillEntries = getActiveSkillEntries(resume?.skills);

  const activeElementRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when highlighted items change
  useEffect(() => {
    if (activeElementRef.current) {
      activeElementRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSentenceIds, recentUpdatedSentenceIds]);

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
          Hover items to edit in-place or remove
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

          {/* Education (Placed at Top) */}
          {resume.education?.length > 0 && (
            <div className="mb-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                Education
              </h2>
              <div className="space-y-1.5">
                {resume.education.map((edu, eduIdx) => (
                  <div key={edu.entry_id ?? eduIdx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      <span>{edu.institution || "Institution"}</span>
                      <span className="text-zinc-500 font-normal text-[11px]">{edu.duration || edu.location || ""}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-700 dark:text-zinc-300">
                      <span>
                        {edu.degree || "Degree"}{edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                      </span>
                      {edu.gpa && <span className="text-zinc-500 text-[10px]">GPA: {edu.gpa}</span>}
                    </div>
                    {edu.coursework && edu.coursework.length > 0 && (
                      <div className="text-[10px] text-zinc-500">
                        Relevant Coursework: {edu.coursework.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {resume.work_experience?.length > 0 && (
            <div className="mb-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                Work Experience
              </h2>
              <div className="space-y-2.5">
                {resume.work_experience.map((exp, expIdx) => {
                  const entryId = exp.entry_id ?? expIdx;
                  const hasHighlightedBullet = exp.bullets.some(
                    (b) =>
                      highlightSentenceIds.includes(b.sentence_id) ||
                      recentUpdatedSentenceIds.includes(b.sentence_id)
                  );

                  return (
                    <div
                      key={exp.entry_id ?? expIdx}
                      ref={hasHighlightedBullet ? activeElementRef : null}
                      className={`group/entry relative rounded p-1 -mx-1 transition-all ${
                        hasHighlightedBullet
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : ""
                      }`}
                    >
                      {/* Entry Header & Actions */}
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
                              className="opacity-0 group-hover/entry:opacity-100 p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {exp.location && (
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects?.length > 0 && (
            <div className="mb-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-2">
                Projects
              </h2>
              <div className="space-y-2.5">
                {resume.projects.map((proj, projIdx) => {
                  const hasHighlightedBullet = proj.bullets.some(
                    (b) =>
                      highlightSentenceIds.includes(b.sentence_id) ||
                      recentUpdatedSentenceIds.includes(b.sentence_id)
                  );

                  return (
                    <div
                      key={proj.entry_id ?? projIdx}
                      ref={hasHighlightedBullet ? activeElementRef : null}
                      className={`group/entry relative rounded p-1 -mx-1 transition-all ${
                        hasHighlightedBullet
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-baseline font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="text-xs">{proj.project_name || "Project"}</span>
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
                            className="opacity-0 group-hover/entry:opacity-100 p-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="text-[10px] text-zinc-500 mb-0.5 font-normal">
                          Tech: {proj.technologies.join(", ")}
                        </div>
                      )}

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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Skills (Placed at Bottom) */}
          {skillEntries.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-0.5 mb-1.5">
                Technical Skills
              </h2>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
