"use client";

import { Header } from "@/components/header";
import { Dropzone } from "@/components/phase-setup/dropzone";
import { SplitVerification } from "@/components/phase-setup/split-verification";
import { InterviewWorkspace } from "@/components/phase-interview/interview-workspace";
import { TailoringWorkspace } from "@/components/phase-tailor/tailoring-workspace";
import { FinalComparison } from "@/components/phase-compare/final-comparison";
import { useTailoringSession } from "@/hooks/use-tailoring-session";
import { AlertCircle } from "lucide-react";

export default function Home() {
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
    candidateAnalysis,
    interviewPlan,
    completedTopicIds,
    evidenceWithDetails,
    activeTopicId,
    activeInterrupt,
    investigationMessages,
    tailorAnalysis,
    feedbacks,
    proposalDecisions,
    handleUpload,
    handleSelectAction,
    handleSelectTopic,
    handleSubmitAnswer,
    handleProceedToTailoring,
    handleDecideProposal,
    handleFinishProposalReview,
    handleBackToTailoring,
    handleResetSession,
  } = useTailoringSession();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50 dark:bg-zinc-950">
      {/* Top Header */}
      <Header
        phase={phase}
        sessionId={sessionId}
        jobDetails={jobDetails}
        onResetSession={handleResetSession}
      />

      {/* Global Error Banner */}
      {error && (
        <div className="w-full max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => handleResetSession()}
              className="font-semibold underline text-red-700 hover:text-red-900 dark:text-red-400"
            >
              Reset Session
            </button>
          </div>
        </div>
      )}

      {/* Adaptive Phase Workspace */}
      <main className="flex-1 flex flex-col justify-center">
        {phase === "setup" && (
          <Dropzone
            isLoading={isLoading}
            requiresFallback={requiresJobDescriptionFallback}
            fallbackError={fallbackErrorMessage}
            pendingFile={pendingFile}
            onUpload={handleUpload}
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
            tailorAnalysis={tailorAnalysis}
            feedbacks={feedbacks}
            proposalDecisions={proposalDecisions}
            isSynthesizing={isSynthesizing}
            onDecideProposal={handleDecideProposal}
            onFinishReview={handleFinishProposalReview}
          />
        )}

        {phase === "compare" && (
          <FinalComparison
            originalResume={resumeData}
            tailorAnalysis={tailorAnalysis}
            proposalDecisions={proposalDecisions}
            onBackToTailoring={handleBackToTailoring}
          />
        )}
      </main>
    </div>
  );
}
