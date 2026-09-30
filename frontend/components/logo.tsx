"use client";

import React from "react";

interface ResiLogoProps {
  className?: string;
  size?: number;
  showBadge?: boolean;
}

/**
 * Geometric Proof Monogram 'R'
 * A bespoke architectural mark combining an editorial 'R' with precision ledger
 * hairline alignment crosshairs and an emerald evidence datum point.
 */
export function ResiLogo({ className = "h-8.5 w-8.5", size = 24, showBadge = false }: ResiLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-950 text-white shadow-xs border border-stone-800/80 transition-all ${className}`}
      style={{ width: typeof size === "number" ? `${size + 10}px` : undefined, height: typeof size === "number" ? `${size + 10}px` : undefined }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Architectural hairline ledger datum lines */}
        <line
          x1="2"
          y1="9"
          x2="4.5"
          y2="9"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="1 1"
        />
        <line
          x1="13.5"
          y1="1.5"
          x2="13.5"
          y2="3.5"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="1 1"
        />

        {/* Monogram 'R' Spine */}
        <path
          d="M 6.5 4.5 L 6.5 19.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Monogram 'R' Architectural Bowl */}
        <path
          d="M 6.5 4.5 H 13 C 15.8 4.5 17.5 6.2 17.5 9 C 17.5 11.8 15.8 13.5 13 13.5 H 6.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Monogram 'R' Dynamic Kick Leg */}
        <path
          d="M 12 13.5 L 17.5 19.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Evidence Proof Datum Point (Glow + Center Dot) */}
        <circle
          cx="13"
          cy="9"
          r="2.2"
          fill="#10b981"
          className="animate-pulse"
        />
        <circle
          cx="13"
          cy="9"
          r="1"
          fill="#ffffff"
        />
      </svg>

      {showBadge && (
        <span className="absolute -bottom-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
    </div>
  );
}
