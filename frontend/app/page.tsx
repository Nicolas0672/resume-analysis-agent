"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  Wand2,
  ShieldCheck,
  Check,
  X,
  FileCheck,
  Cpu,
  ChevronRight,
  Briefcase,
  Layers,
  FileCode,
  Activity,
  Terminal,
} from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ResiLogo } from "@/components/logo";
import { CompanyLogo } from "@/components/company-logo";

// Reusable scroll reveal wrapper with staggered transition delays
function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        inView
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-8 scale-[0.98]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Deterministic constellation dots for creeping ambient depth (SSR-safe)
const CONSTELLATION_DOTS = [
  { top: "7%", left: "11%", size: 2.5, delay: "0s", duration: "6.8s" },
  { top: "13%", left: "86%", size: 2, delay: "1.4s", duration: "7.6s" },
  { top: "21%", left: "24%", size: 2.5, delay: "2.8s", duration: "8.4s" },
  { top: "27%", left: "75%", size: 3, delay: "0.6s", duration: "6.2s" },
  { top: "35%", left: "7%", size: 2, delay: "3.2s", duration: "9.0s" },
  { top: "43%", left: "91%", size: 2.5, delay: "1.9s", duration: "7.1s" },
  { top: "51%", left: "16%", size: 3, delay: "2.5s", duration: "8.7s" },
  { top: "59%", left: "84%", size: 2, delay: "0.4s", duration: "6.5s" },
  { top: "67%", left: "29%", size: 2.5, delay: "3.6s", duration: "9.2s" },
  { top: "75%", left: "71%", size: 3, delay: "1.8s", duration: "7.4s" },
  { top: "83%", left: "12%", size: 2, delay: "2.1s", duration: "8.1s" },
  { top: "91%", left: "87%", size: 2.5, delay: "0.9s", duration: "6.9s" },
  { top: "17%", left: "48%", size: 2, delay: "3.5s", duration: "8.9s" },
  { top: "49%", left: "51%", size: 2.5, delay: "1.3s", duration: "7.3s" },
  { top: "79%", left: "46%", size: 2, delay: "2.6s", duration: "8.3s" },
];

const MORPHING_PHRASES = [
  "Prove it.",
  "Quantify it.",
  "Verify it.",
  "Co-author it.",
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [mottoIndex, setMottoIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Dedicated in-view observer for the session trace card
  const [traceRef, traceInView] = useInView({ threshold: 0.15, triggerOnce: true });
  const [connectionStatus, setConnectionStatus] = useState<"initializing..." | "connected">("initializing...");

  // Switch from initializing... to connected after 4 seconds
  useEffect(() => {
    if (traceInView) {
      const timer = setTimeout(() => {
        setConnectionStatus("connected");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [traceInView]);

  // Fluid kinetic motto phrase rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setMottoIndex((prev) => (prev + 1) % MORPHING_PHRASES.length);
        setIsFading(false);
      }, 300);
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  const handleTabChange = (index: 0 | 1 | 2) => {
    setActiveTab(index);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-zinc-900 selection:bg-emerald-100 selection:text-emerald-950 font-sans relative overflow-x-hidden">
      {/* Fine Ledger Paper Grid Texture */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-55"
        style={{
          backgroundImage: `
            radial-gradient(#d6d3d1 0.75px, transparent 0.75px),
            linear-gradient(to right, #f5f5f4 1px, transparent 1px),
            linear-gradient(to bottom, #f5f5f4 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px, 140px 140px, 140px 140px",
        }}
      />

      {/* Creeping Polka Dots Constellation (Ambient breathing) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {CONSTELLATION_DOTS.map((dot, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-emerald-600/40"
            style={{
              top: dot.top,
              left: dot.left,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animation: `creepPulse ${dot.duration} ease-in-out infinite alternate`,
              animationDelay: dot.delay,
            }}
          />
        ))}
      </div>

      {/* Subtle warm atmospheric glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-emerald-600/[0.04] blur-[160px] rounded-full z-0" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-stone-200/90 bg-[#faf9f6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <ResiLogo size={20} className="h-9 w-9 group-hover:border-emerald-500/50" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-zinc-900">
                ResiAgent
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-800 border border-stone-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Studio
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-600">
            <a href="#method" className="hover:text-zinc-950 transition-colors">
              The Method
            </a>
            <a href="#comparison" className="hover:text-zinc-950 transition-colors">
              The Difference
            </a>
            <a href="#workflow" className="hover:text-zinc-950 transition-colors">
              4-Phase System
            </a>
            <a href="#trust" className="hover:text-zinc-950 transition-colors">
              Integrity
            </a>
          </nav>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          {/* Agentic Telemetry Ribbon */}
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/95 px-3.5 py-1 text-xs text-zinc-700 shadow-xs mb-6 backdrop-blur animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-500 font-semibold">
              Agent State: Verified Evidence
            </span>
          </div>

          {/* Main Title with Fluid Kinetic Morphing Motto */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.12]">
            Never fake it.
            <span className="block mt-1 h-[1.25em] overflow-hidden">
              <span
                className={`inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 animate-shimmer transition-all duration-300 ease-out transform ${
                  isFading
                    ? "-translate-y-3 opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
              >
                {MORPHING_PHRASES[mottoIndex]}
              </span>
            </span>
          </h1>

          {/* Lean Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl mx-auto">
            The evidence-based resume studio. ResiAgent audits your experience against target job requirements, interviews you for missing metrics, and surgically rewrites your bullets—with zero hallucination.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-7 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] active:scale-[0.99] cursor-pointer"
            >
              <span>Launch ResiAgent Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#method"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300/90 bg-white/90 px-5 py-3.5 text-sm font-medium text-zinc-700 hover:bg-stone-50 hover:text-zinc-900 transition-all shadow-xs cursor-pointer"
            >
              <span>See Live Agent Telemetry</span>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </a>
          </div>

          {/* Compatibility & Trust Strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200/90 px-3 py-1 shadow-2xs font-medium">
              <FileCode className="h-3.5 w-3.5 text-emerald-700" />
              Native Microsoft Word (.docx)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200/90 px-3 py-1 shadow-2xs font-medium">
              <Briefcase className="h-3.5 w-3.5 text-emerald-700" />
              LinkedIn, Indeed & Workday Scraper
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200/90 px-3 py-1 shadow-2xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Strict Zero-Hallucination Policy
            </span>
          </div>
        </div>

        {/* Visual Anchor: Interactive Telemetry & Redline Studio Card with Scroll-Triggered Elevate & Boot sequence */}
        <div id="method" className="mt-14 scroll-mt-24" ref={traceRef}>
          <div
            className={`rounded-2xl border border-stone-300 bg-white transition-all duration-1000 ease-out transform ${
              traceInView
                ? "opacity-100 translate-y-0 scale-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_20px_50px_-10px_rgba(0,0,0,0.1),0_0_35px_-8px_rgba(16,185,129,0.12)]"
                : "opacity-0 translate-y-12 scale-[0.97] shadow-xs"
            } relative overflow-hidden`}
          >
            {/* Top Bar with Agent Cognition Status & Terminal dots */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-stone-200 bg-stone-50/80">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <div
                    className={`h-2.5 w-2.5 rounded-full bg-amber-400/80 ${
                      connectionStatus === "initializing..." ? "animate-pulse" : ""
                    }`}
                  />
                  <div
                    className={`h-2.5 w-2.5 rounded-full bg-emerald-500/80 ${
                      connectionStatus === "connected" ? "animate-pulse" : ""
                    }`}
                  />
                </div>
                <div className="h-4 w-[1px] bg-stone-300 mx-1" />
                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600">
                  <Terminal className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold text-zinc-800">resiagent_session_trace.log</span>
                  <span className="hidden md:inline text-stone-400">·</span>
                  <span
                    className={`hidden md:inline rounded px-1.5 py-0.5 text-[10px] font-semibold border transition-all duration-500 ${
                      connectionStatus === "connected"
                        ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                        : "bg-amber-100/80 text-amber-900 border-amber-300 animate-pulse"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                </div>
              </div>

              {/* 3 Step Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-stone-200/70 border border-stone-300/80 text-xs">
                <button
                  onClick={() => handleTabChange(0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 0
                      ? "bg-white text-amber-900 shadow-xs border border-amber-300/80"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>1. Gap Flagged</span>
                </button>

                <button
                  onClick={() => handleTabChange(1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 1
                      ? "bg-white text-emerald-900 shadow-xs border border-emerald-300/80"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>2. Context Probe</span>
                </button>

                <button
                  onClick={() => handleTabChange(2)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 2
                      ? "bg-white text-emerald-900 shadow-xs border border-emerald-300/80"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>3. Surgical Rewrite</span>
                </button>
              </div>
            </div>

            {/* Active Session Metadata Bar */}
            <div className="px-5 py-2.5 bg-stone-100/70 border-b border-stone-200/80 flex items-center justify-between text-[11px] font-mono text-zinc-600">
              <div className="flex items-center gap-2">
                <CompanyLogo company="Microsoft" size={14} />
                <span>
                  <strong className="text-zinc-800 font-semibold">SESSION CONTEXT:</strong> Target: Software Engineering Intern @ Microsoft · Gap: React/TypeScript & User-Facing Impact
                </span>
              </div>

            </div>

            {/* Stage Body */}
            <div className="p-5 sm:p-7">
              {/* State 0: Gap Flagged */}
              {activeTab === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-stone-200 bg-stone-50/70 p-5">
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 font-mono">
                          TARGET ROLE SPECIFICATION
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-2.5 py-0.5 text-[10px] text-zinc-800 font-mono font-medium shadow-2xs">
                          <CompanyLogo company="Microsoft" size={12} />
                          <span>Microsoft · SWE Intern</span>
                        </span>
                      </div>
                      <div className="text-xs text-zinc-800 leading-relaxed font-mono bg-white p-3.5 rounded-lg border border-stone-200 shadow-2xs relative">
                        &quot;Must demonstrate experience developing responsive web applications using React and TypeScript, integrating RESTful APIs, and optimizing client-side performance for real campus or production users.&quot;
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-stone-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 font-mono">
                          BASELINE RESUME ENTRY
                        </span>

                      </div>
                      <div className="text-xs text-zinc-500 font-mono bg-white p-3.5 rounded-lg border border-stone-200 line-through decoration-zinc-400 shadow-2xs">
                        • &quot;Helped build frontend web pages in React for a student club portal and connected backend APIs.&quot;
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-bl-full pointer-events-none" />
                    <div>
                      <div className="flex items-center gap-2 text-amber-900 mb-2.5">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider font-mono">
                          Diagnostic Audit: Context Gap Flagged
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">
                        The student built features for the campus portal, but the bullet is passive (&quot;Helped build...&quot;) and hides their technical ownership. The agent flagged 3 unstated proofs:
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-amber-900">
                        <li className="flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-200/60 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                          <span><strong>Component Architecture:</strong> Did you use TypeScript, reusable hooks, or custom state?</span>
                        </li>
                        <li className="flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-200/60 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                          <span><strong>Data Flow & Speed:</strong> How did you handle API fetching? Any debouncing or caching?</span>
                        </li>
                        <li className="flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-200/60 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                          <span><strong>Real-World Impact:</strong> How many students used it, and did search/load speeds improve?</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-amber-200/80">
                      <span className="text-[11px] text-amber-800 font-mono">
                        Agent Action: Deploying HITL probe
                      </span>
                      <button
                        onClick={() => handleTabChange(1)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 cursor-pointer underline"
                      >
                        <span>Inspect Context Probe</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* State 1: Context Interview */}
              {activeTab === 1 && (
                <div className="space-y-4">
                  {/* Co-Author Message */}
                  <div className="flex items-start gap-3 max-w-2xl">
                    <ResiLogo size={16} className="h-8 w-8 shrink-0" />
                    <div className="rounded-2xl rounded-tl-sm border border-stone-200 bg-white p-4 text-xs shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-emerald-800 font-mono">ResiAgent Interviewer Node</span>

                      </div>
                      <p className="text-zinc-800 leading-relaxed font-sans text-xs">
                        &quot;You mentioned helping build frontend features for the student club portal in React. The target internship requires hands-on experience with TypeScript and optimizing real API data workflows. 
                        <strong className="text-zinc-950"> What specific pages or components did you own, how did you handle data loading, and did you measure campus user adoption or load speeds?</strong>&quot;
                      </p>
                    </div>
                  </div>

                  {/* Candidate Message */}
                  <div className="flex items-start gap-3 max-w-2xl ml-auto flex-row-reverse">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white text-xs font-bold shadow-xs">
                      YOU
                    </div>
                    <div className="rounded-2xl rounded-tr-sm border border-emerald-200 bg-emerald-50/70 p-4 text-xs shadow-2xs text-right">
                      <div className="flex items-center justify-end mb-1.5">
                        <span className="font-semibold text-zinc-700 font-mono text-[10px]">Verified Candidate Answer</span>
                      </div>
                      <p className="text-emerald-950 leading-relaxed text-left font-mono text-[11px]">
                        &quot;I built the student course evaluation dashboard in React and TypeScript. I replaced full-page re-renders with client-side caching and debounced search, which dropped search load times from 2.4s to under 400ms across 1,800+ active campus students.&quot;
                      </p>
                    </div>
                  </div>

                  {/* Extracted Evidence Pill Locker */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-700 font-mono">Facts Verified:</span>
                      <span className="rounded-md bg-white border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-800 font-medium shadow-2xs">
                        React + TypeScript Dashboard
                      </span>
                      <span className="rounded-md bg-white border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-800 font-medium shadow-2xs">
                        1,800+ Active Campus Students
                      </span>
                      <span className="rounded-md bg-white border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-800 font-medium shadow-2xs">
                        Search Latency Cut: 2.4s → 400ms (83% faster)
                      </span>
                    </div>

                    <button
                      onClick={() => handleTabChange(2)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer underline"
                    >
                      <span>Review Tailored Bullet Proposal</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Surgical Rewrite with Fluid Highlighter Animation */}
              {activeTab === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-stone-200 bg-stone-50/70 p-5">
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 font-mono">
                        <span>ORIGINAL BULLET</span>
                        <span className="text-zinc-500">Unmodified</span>
                      </div>
                      <div className="p-4 rounded-lg bg-white border border-stone-200 font-mono text-xs text-zinc-600 leading-relaxed shadow-2xs">
                        • Helped build frontend web pages in React for a student club portal and connected backend APIs.
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-500">
                        Lacks concrete ownership, hides TypeScript usage, and omits the 1,800+ student user impact.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-zinc-600">
                      <span>Baseline Job Fit Match</span>
                      <strong className="text-zinc-700 font-mono">34% Match</strong>
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-emerald-300 bg-emerald-50/30 p-5 relative">
                    {/* Editorial Margin Note */}
                    <div className="mb-3 flex items-center gap-1.5 text-[10px] font-mono text-emerald-900 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-md shadow-2xs">
                      <ResiLogo size={12} className="h-4 w-4 shrink-0" />
                      <span>Co-Author Note: Upgraded passive phrasing (&apos;Helped build...&apos;) to demonstrable ownership, verified TypeScript stack, and quantified 83% latency cut across 1,800+ campus users.</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-emerald-800 mb-2 font-mono">
                        <span>PROPOSAL</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 font-sans font-medium border border-emerald-200">
                          100% Verifiable Context
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-white border border-emerald-300 font-mono text-xs text-zinc-900 leading-relaxed shadow-2xs">
                        • Engineered interactive student evaluation dashboard in <span className="animate-highlighter text-emerald-950 font-semibold px-1 py-0.5 rounded">React and TypeScript</span> with debounced search queries and client-side caching, slashing search response times by <span className="animate-highlighter text-emerald-950 font-semibold px-1 py-0.5 rounded">83% (2.4s → 400ms)</span> for <span className="animate-highlighter text-emerald-950 font-semibold px-1 py-0.5 rounded">1,800+ campus users</span>.
                      </div>
                      <p className="mt-3 text-[11px] text-emerald-800 font-medium">
                        Directly targets internship criteria using only facts verified in the interview. Exact Word formatting preserved.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>ATS Alignment: <strong className="text-emerald-900 font-mono">95%</strong></span>
                      </div>
                      <Link
                        href="/app"
                        className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-semibold underline"
                      >
                        Launch in your workspace &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section: The Core Philosophy (The Difference) with Scroll Reveal Cascade */}
      <section id="comparison" className="relative z-10 py-16 border-t border-stone-200 bg-white/70 backdrop-blur scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 font-semibold">
                The Fundamental Difference
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Why blind AI prompting fails job seekers.
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                Generic ChatGPT prompts and cookie-cutter builders invent skills you don&apos;t have or regurgitate generic buzzwords. ResiAgent works like an investigative executive editor.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <ScrollReveal delay={0}>
              <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 sm:p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-2.5 mb-4 text-red-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 border border-red-200">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Blind AI Prompts (ChatGPT)
                  </h3>
                </div>

                <ul className="space-y-4 text-xs text-zinc-700 mt-6">
                  <li className="flex items-start gap-3">
                    <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">Hallucinates Unverified Experience</strong>
                      Fills gaps by inventing tools and projects you never touched, setting you up to fail the live interview.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">Generic Buzzword Soup</strong>
                      Spams cliches like &quot;spearheaded synergistic paradigms&quot; that modern recruiters immediately recognize and filter out.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">Destroys Formatting & Font Hierarchy</strong>
                      Forces you into rigid HTML templates that break when parsed by real corporate applicant tracking systems.
                    </div>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            {/* The ResiAgent Standard */}
            <ScrollReveal delay={150}>
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/40 p-6 sm:p-8 relative shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-400">
                <div className="absolute top-4 right-4 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  The ResiAgent Standard
                </div>

                <div className="flex items-center gap-2.5 mb-4 text-emerald-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-300">
                    <Check className="h-4 w-4 text-emerald-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Evidence-Based Co-Authoring
                  </h3>
                </div>

                <ul className="space-y-4 text-xs text-zinc-700 mt-6">
                  <li className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">Interviews You For Real Context</strong>
                      Identifies missing metrics and guides you through quick, focused probes to extract the achievements you actually delivered.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">100% Grounded in Truth</strong>
                      Every revised bullet is anchored strictly in facts you confirmed. You can speak to every word with total confidence.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 block">Built for Recruiter Standards</strong>
                      Every resume follows a clean, consistent format built around recruiter expectations and established industry conventions.
                    </div>
                  </li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Section: 4-Phase System Architecture with Staggered Cascading Cards */}
      <section id="workflow" className="relative z-10 py-16 border-t border-stone-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 font-semibold">
                The Architecture
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                How the ResiAgent workflow operates.
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                A calm, structured 4-phase journey designed to give you complete visibility and control over every single adjustment.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Phase 1 */}
            <ScrollReveal delay={0}>
              <div className="h-full rounded-xl border border-stone-200 bg-white p-5 flex flex-col justify-between shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-semibold text-emerald-700">PHASE 01</span>
                    <FileText className="h-4 w-4 text-zinc-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">Ingestion & Fit Audit</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Upload your Word resume and provide any job link (LinkedIn, Indeed, or raw text). ResiAgent extracts requirements and computes a structured alignment matrix.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-stone-100 text-[11px] text-zinc-500 font-mono">
                  Outputs: Fit Rating & Gap List
                </div>
              </div>
            </ScrollReveal>

            {/* Phase 2 */}
            <ScrollReveal delay={100}>
              <div className="h-full rounded-xl border border-stone-200 bg-white p-5 flex flex-col justify-between shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-semibold text-emerald-700">PHASE 02</span>
                    <MessageSquare className="h-4 w-4 text-zinc-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">Evidence Gathering</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    The agent asks surgical, high-yield questions targeting identified gaps. When relevant metrics surface, the interview stops immediately—no endless chatting.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-stone-100 text-[11px] text-zinc-500 font-mono">
                  Outputs: Verified Evidence Locker
                </div>
              </div>
            </ScrollReveal>

            {/* Phase 3 */}
            <ScrollReveal delay={200}>
              <div className="h-full rounded-xl border border-stone-200 bg-white p-5 flex flex-col justify-between shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-semibold text-emerald-700">PHASE 03</span>
                    <Wand2 className="h-4 w-4 text-zinc-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">Tactile Co-Authoring</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Review side-by-side proposal cards on a tactile paper canvas. Accept, reject, or fine-tune individual bullet rewrites before any changes touch your master copy.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-stone-100 text-[11px] text-zinc-500 font-mono">
                  Outputs: Tailored Resume Draft
                </div>
              </div>
            </ScrollReveal>

            {/* Phase 4 */}
            <ScrollReveal delay={300}>
              <div className="h-full rounded-xl border border-stone-200 bg-white p-5 flex flex-col justify-between shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-semibold text-emerald-700">PHASE 04</span>
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">Diff & Export</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Synchronized side-by-side inspection between your baseline resume and the final tailored edition. Export directly to print-ready PDF or copy tailored bullets.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-stone-100 text-[11px] text-zinc-500 font-mono">
                  Outputs: Print-Ready Export
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Section: Built on Trust & Integrity with Cascading Reveals */}
      <section id="trust" className="relative z-10 py-16 border-t border-stone-200 bg-white/70 backdrop-blur scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 font-semibold">
                Integrity & Trust
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Engineered for genuine job seekers.
              </h2>
              <p className="mt-3 text-sm text-zinc-600">
                We believe AI should empower human clarity, not generate synthetic noise.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <ScrollReveal delay={0}>
              <div className="h-full rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-900 mb-2">Zero AI Fabrication</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  ResiAgent never invents qualifications, degrees, or employers. If an experience gap cannot be substantiated by your answers, it remains untouched.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="h-full rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 mb-4">
                  <FileCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-900 mb-2">Recruiter-Ready Resume Formatting</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Transform your experience into a polished, industry-standard resume with consistent formatting, structure, and recruiter-friendly organization.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <div className="h-full rounded-xl border border-stone-200 bg-stone-50/60 p-6 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 mb-4">
                  <Cpu className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-900 mb-2">Full Human-in-the-Loop</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  You retain ultimate editorial discretion. Every revision proposal can be accepted, edited on the live canvas, or dismissed.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Minimalist Closing Call to Action with Reveal & Glow Bloom */}
      <section className="relative z-10 py-16 border-t border-stone-200 bg-[#faf9f6]">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Never fake it. Prove it.
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Drop in your resume and target job listing. Let ResiAgent investigate the gap and co-author verified, high-impact bullet points.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                <span>Launch ResiAgent Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500 font-mono">
              Instant resume analysis · No credit card required
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 bg-white py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ResiLogo size={14} className="h-6 w-6" />
            <span className="font-semibold text-zinc-800 text-sm">ResiAgent</span>
            <span className="text-stone-300">·</span>
            <span>&ldquo;Never fake it. Prove it.&rdquo;</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-600">
            <a href="#method" className="hover:text-zinc-900 transition-colors">
              The Method
            </a>
            <a href="#comparison" className="hover:text-zinc-900 transition-colors">
              The Difference
            </a>
            <a href="#workflow" className="hover:text-zinc-900 transition-colors">
              Workflow
            </a>
            <Link href="/app" className="text-emerald-700 hover:text-emerald-900 transition-colors font-semibold">
              Open App &rarr;
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
