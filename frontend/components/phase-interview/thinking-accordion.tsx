"use client";

import React, { useState } from "react";
import { ChevronDown, Check, Loader2, Sparkles, BrainCircuit } from "lucide-react";

interface ThinkingAccordionProps {
  isThinking: boolean;
  durationSeconds: number;
  currentStage?: string;
  stages?: string[];
  defaultOpen?: boolean;
}

const DEFAULT_STAGES = [
  "Analyzing candidate response",
  "Checking evidence against job requirement",
  "Synthesizing next high-value probe",
];

export function ThinkingAccordion({
  isThinking,
  durationSeconds,
  currentStage,
  stages = DEFAULT_STAGES,
  defaultOpen = false,
}: ThinkingAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2 text-xs">
      {/* Header Button / Pill */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1 transition-all duration-200 cursor-pointer select-none ${
          isThinking
            ? "bg-stone-100/90 hover:bg-stone-200/80 text-stone-700 dark:bg-stone-800/90 dark:hover:bg-stone-700/80 dark:text-stone-200 border border-stone-300/80 dark:border-stone-700 shadow-2xs"
            : "bg-stone-100 hover:bg-stone-200/80 text-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700/80 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60"
        }`}
      >
        {isThinking ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-stone-500 dark:text-stone-400" />
            <span className="font-medium text-stone-800 dark:text-stone-200">Thinking...</span>
            <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
              {durationSeconds.toFixed(1)}s
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="h-3 w-3 text-stone-500 dark:text-stone-400" />
            <span className="font-medium text-stone-700 dark:text-stone-200">
              Thought for {durationSeconds > 0 ? `${durationSeconds.toFixed(1)}s` : "a few seconds"}
            </span>
          </div>
        )}

        <ChevronDown
          className={`h-3 w-3 text-stone-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="mt-2 ml-1 max-w-sm rounded-lg border border-stone-200/70 bg-stone-50/80 p-3 shadow-2xs backdrop-blur-xs dark:border-stone-800 dark:bg-stone-900/80">
          <div className="space-y-2">
            {stages.map((stage, idx) => {
              const isCurrent = isThinking && currentStage === stage;
              const isPast = !isThinking || stages.indexOf(currentStage || "") > idx;

              return (
                <div key={stage} className="flex items-center gap-2 text-[11px]">
                  {isCurrent ? (
                    <Loader2 className="h-3 w-3 animate-spin text-stone-600 dark:text-stone-300 shrink-0" />
                  ) : isPast ? (
                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 shrink-0">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-stone-300 dark:bg-stone-600 ml-1 shrink-0" />
                  )}
                  <span
                    className={
                      isCurrent
                        ? "font-medium text-stone-900 dark:text-stone-100"
                        : isPast
                        ? "text-stone-700 dark:text-stone-300"
                        : "text-stone-400 dark:text-stone-500"
                    }
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
