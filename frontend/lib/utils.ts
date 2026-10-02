import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ResumeSkills } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SkillCategoryEntry {
  label: string;
  items: string[];
}

/**
 * Returns all non-empty skill categories with clean display labels.
 * Automatically filters out empty strings or empty arrays across all fields
 * (programming_languages, frameworks, tools, libraries, databases, cloud, other, etc.).
 */
export function getActiveSkillEntries(skills?: ResumeSkills | null): SkillCategoryEntry[] {
  if (!skills) return [];

  const knownLabels: Record<string, string> = {
    programming_languages: "Languages",
    frameworks: "Frameworks",
    tools: "Developer Tools",
    libraries: "Libraries",
    databases: "Databases",
    cloud: "Cloud / DevOps",
    other: "Other",
  };

  const results: SkillCategoryEntry[] = [];
  const seenKeys = new Set<string>();

  const order = [
    "programming_languages",
    "frameworks",
    "tools",
    "libraries",
    "databases",
    "cloud",
    "other",
  ];

  for (const key of order) {
    const val = (skills as unknown as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      const filtered = val
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      if (filtered.length > 0) {
        results.push({
          label: knownLabels[key] || key,
          items: filtered,
        });
        seenKeys.add(key);
      }
    }
  }

  // Also include any additional dynamic array fields if present
  for (const [key, val] of Object.entries(skills)) {
    if (key === "sentence_ids" || seenKeys.has(key)) continue;
    if (Array.isArray(val)) {
      const filtered = val
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      if (filtered.length > 0) {
        const formattedLabel = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        results.push({
          label: formattedLabel,
          items: filtered,
        });
      }
    }
  }

  return results;
}

const MONTHS_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9, sept: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function parseDatePart(text: string, isEnd = false): [number, number] {
  if (!text) return [0, 0];
  const lower = text.toLowerCase().trim();
  if (["present", "current", "now", "ongoing", "active"].some((k) => lower.includes(k))) {
    return [9999, 12];
  }

  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  let month = 0;
  for (const [name, mNum] of Object.entries(MONTHS_MAP)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(lower)) {
      month = mNum;
      break;
    }
  }

  if (month === 0) {
    const slashMatch = text.match(/\b(0?[1-9]|1[0-2])[/-](?:19\d\d|20\d\d)\b/);
    if (slashMatch) {
      month = parseInt(slashMatch[1], 10);
    }
  }

  if (month === 0 && year > 0) {
    month = isEnd ? 12 : 1;
  }

  return [year, month];
}

export function getDurationSortKey(durationStr?: string | null): [number, number, number, number] {
  if (!durationStr || typeof durationStr !== "string") {
    return [0, 0, 0, 0];
  }

  const parts = durationStr.trim().split(/\s*(?:[-–—]|(?:\bto\b))\s*/i);
  if (parts.length >= 2) {
    const start = parseDatePart(parts[0], false);
    const end = parseDatePart(parts[1], true);
    return [end[0], end[1], start[0], start[1]];
  } else if (parts.length === 1) {
    const start = parseDatePart(parts[0], false);
    const end = parseDatePart(parts[0], true);
    return [end[0], end[1], start[0], start[1]];
  }

  return [0, 0, 0, 0];
}

export function compareEntriesReverseChronological(
  a: { duration?: string | null; date?: string | null },
  b: { duration?: string | null; date?: string | null }
): number {
  const keyA = getDurationSortKey(a.duration || a.date);
  const keyB = getDurationSortKey(b.duration || b.date);

  for (let i = 0; i < 4; i++) {
    if (keyB[i] !== keyA[i]) {
      return keyB[i] - keyA[i]; // Higher (newer) comes first
    }
  }
  return 0;
}

