"use client";

import { useState, useEffect } from "react";

export const SYNTHESIZING_PHRASES: string[] = [
  "Mapping interview evidence to resume sections...",
  "Formulating high-impact XYZ achievement statements...",
  "Fact-checking bullet points against interview logs...",
  "Validating measurable metrics & ownership scope...",
  "Eliminating unverified claims & hallucinations...",
  "Polishing active verbs & ATS keyword precision...",
  "Finalizing tailored resume proposals...",
];

export function useRotatingPhrase(
  phrasesOrActive: boolean | string[] = SYNTHESIZING_PHRASES,
  activeOrInterval?: boolean | number | string[],
  intervalOrFallback?: number
): string {
  let phrases: string[] = SYNTHESIZING_PHRASES;
  let isActive = false;
  let intervalMs = 2600;

  if (typeof phrasesOrActive === "boolean") {
    isActive = phrasesOrActive;
    if (Array.isArray(activeOrInterval)) {
      phrases = activeOrInterval;
      if (typeof intervalOrFallback === "number") intervalMs = intervalOrFallback;
    } else if (typeof activeOrInterval === "number") {
      intervalMs = activeOrInterval;
    }
  } else if (Array.isArray(phrasesOrActive)) {
    phrases = phrasesOrActive;
    if (typeof activeOrInterval === "boolean") {
      isActive = activeOrInterval;
    }
    if (typeof intervalOrFallback === "number") {
      intervalMs = intervalOrFallback;
    }
  }

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive || phrases.length <= 1) {
      setIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isActive, phrases, intervalMs]);

  return phrases[index] || phrases[0] || "";
}
