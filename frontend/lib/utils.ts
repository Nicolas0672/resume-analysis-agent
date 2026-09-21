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

