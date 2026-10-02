"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface TelemetryStage {
  stage: string;
  label: string;
  detail?: string;
}

export interface TelemetryButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  isLoading: boolean;
  disabled?: boolean;
  stages: TelemetryStage[];
  cycleIntervalMs?: number;
  targetMaxProgress?: number;
  systemTag?: string;
  variant?: "primary" | "secondary";
  layout?: "compact" | "detailed";
  children: React.ReactNode;
  className?: string;
}

export function TelemetryButton({
  onClick,
  type = "button",
  isLoading,
  disabled = false,
  stages,
  cycleIntervalMs = 2200,
  targetMaxProgress = 94,
  systemTag = "AGENT WORKSPACE ENGINE",
  variant = "primary",
  layout = "compact",
  children,
  className = "",
}: TelemetryButtonProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(12);

  // Sequential loading ticker during background execution
  useEffect(() => {
    if (!isLoading) {
      setStageIndex(0);
      setProgressPercent(12);
      return;
    }

    const stageTimer = setInterval(() => {
      setStageIndex((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, cycleIntervalMs);

    // Compute step interval so progress bar climbs smoothly up to targetMaxProgress
    const totalDuration = stages.length * cycleIntervalMs;
    const stepInterval = Math.max(35, Math.floor(totalDuration / (targetMaxProgress - 12)));

    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= targetMaxProgress) return targetMaxProgress;
        return prev + 1;
      });
    }, stepInterval);

    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, [isLoading, stages.length, cycleIntervalMs, targetMaxProgress]);

  const currentStage = stages[stageIndex] || stages[0];

  const isDetailed = layout === "detailed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
        isDetailed
          ? isLoading
            ? "bg-gradient-to-r from-zinc-950 via-stone-900 to-emerald-950 border border-emerald-500/40 text-white shadow-lg shadow-emerald-950/20 p-3 sm:p-4 cursor-wait"
            : variant === "secondary"
            ? "border border-stone-300 bg-white text-zinc-800 hover:bg-stone-50 hover:border-stone-400 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 p-2.5 sm:p-3 cursor-pointer active:scale-[0.99]"
            : "bg-gradient-to-r from-zinc-900 via-stone-900 to-emerald-950/95 hover:from-zinc-900 hover:via-stone-800 hover:to-emerald-900 border border-emerald-500/30 hover:border-emerald-400/60 text-white shadow-sm hover:shadow-md hover:shadow-emerald-950/20 p-2.5 sm:p-3 cursor-pointer active:scale-[0.99]"
          : `inline-flex items-center justify-center min-h-[42px] px-3.5 sm:px-4 py-2 sm:py-2.5 ${
              isLoading
                ? "bg-gradient-to-r from-zinc-950 via-stone-900 to-emerald-950 border border-emerald-500/40 text-white shadow-md shadow-emerald-950/20 cursor-wait"
                : variant === "secondary"
                ? "border border-stone-300 bg-white text-zinc-800 hover:bg-stone-50 hover:border-stone-400 shadow-2xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer active:scale-[0.99]"
                : "bg-gradient-to-r from-zinc-900 via-stone-900 to-emerald-950/95 hover:from-zinc-900 hover:via-stone-800 hover:to-emerald-900 border border-emerald-500/30 hover:border-emerald-400/60 text-white shadow-sm hover:shadow-md hover:shadow-emerald-950/20 cursor-pointer active:scale-[0.99]"
            }`
      } ${disabled && !isLoading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {isLoading ? (
        isDetailed ? (
          /* ================= DETAILED 4-ROW HUD (START SESSION PAGE) ================= */
          <div className="flex flex-col text-left space-y-1.5 w-full">
            {/* Top Status Strip */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="font-semibold text-emerald-400 tracking-wider">
                  {currentStage?.stage}
                </span>
                <span className="text-stone-500">·</span>
                <span className="text-stone-300 font-medium truncate max-w-[160px] sm:max-w-none">
                  {systemTag}
                </span>
              </div>
              <span className="text-emerald-400 font-mono font-semibold shrink-0 ml-2">
                {progressPercent}%
              </span>
            </div>

            {/* Active Stage Label */}
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" />
              <span className="text-xs font-sans font-medium text-stone-100 truncate">
                {currentStage?.label}
              </span>
            </div>

            {/* Detail Line */}
            {currentStage?.detail && (
              <div className="text-[10px] font-mono text-stone-400 pl-5.5 truncate">
                // {currentStage.detail}
              </div>
            )}

            {/* Micro Progress Bar */}
            <div className="w-full bg-stone-800/80 rounded-full h-1 overflow-hidden mt-0.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          /* ================= COMPACT SINGLE-ROW HUD (WORKFLOW BUTTONS) ================= */
          <div className="flex items-center justify-between gap-2 sm:gap-2.5 w-full min-w-0">
            {/* Left: Spinner + Stage Ticker */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" />
              <span
                key={`stage-${stageIndex}`}
                className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-400 tracking-wider shrink-0 uppercase animate-in fade-in duration-200"
              >
                {currentStage?.stage}
              </span>
              <span className="text-stone-500 shrink-0 text-xs">·</span>
              <span
                key={`label-${stageIndex}`}
                className="text-xs font-sans font-medium text-stone-100 truncate animate-in fade-in duration-200"
              >
                {currentStage?.label}
              </span>
            </div>

            {/* Right: Micro percentage badge */}
            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-400 shrink-0 ml-2">
              {progressPercent}%
            </span>

            {/* Slim bottom-edge micro progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-stone-800/80 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )
      ) : (
        children
      )}
    </button>
  );
}
