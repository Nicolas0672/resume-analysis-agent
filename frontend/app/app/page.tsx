"use client";

import { Header } from "@/components/header";
import { Dropzone } from "@/components/phase-setup/dropzone";
import { SplitVerification } from "@/components/phase-setup/split-verification";
import { InterviewWorkspace } from "@/components/phase-interview/interview-workspace";
import { TailoringWorkspace } from "@/components/phase-tailor/tailoring-workspace";
import { FinalComparison } from "@/components/phase-compare/final-comparison";
import { useTailoringSession } from "@/hooks/use-tailoring-session";
import { AlertCircle, Loader2 } from "lucide-react";

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

export default function WorkspacePage() {
  const {
    phase,
    sessionId,
    isLoading,
    isSynthesizing,
    error,
    requiresJobDescriptionFallback,
    fallbackErrorMessage,
    pendingFile,
    jobDetails,
    resumeData,
    resumeToEdit,
    candidateAnalysis,
    interviewPlan,
    completedTopicIds,
    evidenceWithDetails,
    activeTopicId,
    activeInterrupt,
    investigationMessages,
    tailorAnalysis,
    feedbacks,
    appliedTopicIds,
    handleUpload,
    handleSelectAction,
    handleSelectTopic,
    handleSubmitAnswer,
    handleProceedToTailoring,
    handleApplyTailoring,
    handleCustomTailoring,
    handleEditResumeBullet,
    handleDeleteBullet,
    handleDeleteEntry,
    handleEditEntry,
    handleAddBullet,
    handleEditSkills,
    handleFinishProposalReview,
    handleBackToTailoring,
    handleResetSession,
    rehydrateSession,
  } = useTailoringSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-zinc-900 selection:bg-emerald-100 selection:text-emerald-950 font-sans relative overflow-x-hidden print:min-h-0 print:bg-white print:p-0 print:m-0">
      {/* Fine Ledger Paper Grid Texture */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-55 print:hidden"
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
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
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
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-emerald-600/[0.04] blur-[160px] rounded-full z-0 print:hidden" />

      {/* Contextual Minimalist Top Header */}
      <Header
        phase={phase}
        sessionId={sessionId}
        jobDetails={jobDetails}
        onResetSession={handleResetSession}
      />

      {/* Global Error Banner */}
      {error && (
        <div className="relative z-10 w-full max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => handleResetSession()}
              className="font-semibold underline text-red-700 hover:text-red-900 cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </div>
      )}

      {/* Adaptive Phase Workspace */}
      <main className="relative z-10 flex-1 flex flex-col justify-center print:block print:w-full print:m-0 print:p-0">
        {isLoading && sessionId && !jobDetails ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-zinc-900">Rehydrating Agent Session</p>
              <p className="text-xs font-mono text-stone-500">
                Retrieving state from checkpointer thread #{sessionId.slice(0, 8)}...
              </p>
            </div>
          </div>
        ) : (
          <>
            {phase === "setup" && (
              <Dropzone
                isLoading={isLoading}
                requiresFallback={requiresJobDescriptionFallback}
                fallbackError={fallbackErrorMessage}
                pendingFile={pendingFile}
                onUpload={handleUpload}
                onSelectSession={rehydrateSession}
              />
            )}

            {phase === "verification" && (
              <SplitVerification
                jobDetails={jobDetails}
                candidateAnalysis={candidateAnalysis}
                isLoading={isLoading}
                onSelectAction={handleSelectAction}
              />
            )}

            {phase === "interview" && (
              <InterviewWorkspace
                jobDetails={jobDetails}
                candidateAnalysis={candidateAnalysis}
                interviewPlan={interviewPlan}
                activeInterrupt={activeInterrupt}
                completedTopicIds={completedTopicIds}
                evidenceWithDetails={evidenceWithDetails}
                activeTopicId={activeTopicId}
                investigationMessages={investigationMessages}
                isLoading={isLoading}
                onSelectTopic={handleSelectTopic}
                onSubmitAnswer={handleSubmitAnswer}
                onProceedToTailoring={handleProceedToTailoring}
              />
            )}

            {phase === "tailor" && (
              <TailoringWorkspace
                resumeData={resumeData}
                resumeToEdit={resumeToEdit}
                tailorAnalysis={tailorAnalysis}
                feedbacks={feedbacks}
                appliedTopicIds={appliedTopicIds}
                interviewPlan={interviewPlan}
                isSynthesizing={isSynthesizing}
                onApplyTopic={handleApplyTailoring}
                onCustomTailoring={handleCustomTailoring}
                onEditResumeBullet={handleEditResumeBullet}
                onDeleteBullet={handleDeleteBullet}
                onDeleteEntry={handleDeleteEntry}
                onEditEntry={handleEditEntry}
                onAddBullet={handleAddBullet}
                onEditSkills={handleEditSkills}
                onFinishReview={handleFinishProposalReview}
              />
            )}

            {phase === "compare" && (
              <FinalComparison
                sessionId={sessionId}
                originalResume={resumeData}
                tailoredResume={resumeToEdit}
                appliedTopicCount={appliedTopicIds.length}
                onBackToTailoring={handleBackToTailoring}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
