"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  AppPhase,
  CandidateAnalysis,
  EvidenceWithDetails,
  Feedbacks,
  InterviewDetails,
  InterviewPlan,
  InterruptPayload,
  JobDetails,
  ResumeStructure,
  TailorAnalysis,
} from "@/lib/types";
import {
  getSessionState,
  sendChatMessage,
  uploadResume,
} from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

export interface ProposalDecision {
  status: "accepted" | "rejected";
  customText?: string;
}

const SESSION_STORAGE_KEY = "resume_agent_active_session";
const PHASE_STORAGE_KEY = "resume_agent_active_phase";

// Helper to reliably extract the inner state dictionary regardless of whether
// backend returns { state: { ... } }, { values: { ... } }, or { result: { ... } }
function extractStateValues(stateObj: unknown): Record<string, unknown> | null {
  if (!stateObj || typeof stateObj !== "object") return null;
  let curr = stateObj as Record<string, unknown>;

  for (let i = 0; i < 5; i++) {
    if (
      curr.job_details ||
      curr.candidate_analysis ||
      curr.resume_data ||
      curr.interview_plan ||
      curr.tailor_analysis
    ) {
      return curr;
    }
    if (curr.state && typeof curr.state === "object" && !Array.isArray(curr.state)) {
      curr = curr.state as Record<string, unknown>;
    } else if (curr.values && typeof curr.values === "object" && !Array.isArray(curr.values)) {
      curr = curr.values as Record<string, unknown>;
    } else if (curr.result && typeof curr.result === "object" && !Array.isArray(curr.result)) {
      curr = curr.result as Record<string, unknown>;
    } else {
      break;
    }
  }
  return curr;
}

export function useTailoringSession() {
  const [phase, setPhaseState] = useState<AppPhase>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PHASE_STORAGE_KEY) as AppPhase | null;
      if (stored && ["setup", "verification", "interview", "tailor", "compare"].includes(stored)) {
        return stored;
      }
    }
    return "setup";
  });

  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("session_id") || localStorage.getItem(SESSION_STORAGE_KEY) || null;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return Boolean(urlParams.get("session_id") || localStorage.getItem(SESSION_STORAGE_KEY));
    }
    return false;
  });
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback state for scraping errors
  const [requiresJobDescriptionFallback, setRequiresJobDescriptionFallback] = useState<boolean>(false);
  const [fallbackErrorMessage, setFallbackErrorMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Domain data
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [resumeData, setResumeData] = useState<ResumeStructure | null>(null);
  const [candidateAnalysis, setCandidateAnalysis] = useState<CandidateAnalysis | null>(null);

  // Interview state
  const [interviewPlan, setInterviewPlan] = useState<InterviewPlan | null>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [evidenceWithDetails, setEvidenceWithDetails] = useState<EvidenceWithDetails[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeInterrupt, setActiveInterrupt] = useState<InterruptPayload | null>(null);
  const [investigationMessages, setInvestigationMessages] = useState<ChatMessage[]>([]);

  // Tailoring & verification
  const [tailorAnalysis, setTailorAnalysis] = useState<TailorAnalysis | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedbacks | null>(null);
  const [proposalDecisions, setProposalDecisions] = useState<Record<string, ProposalDecision>>({});

  const initializedRef = useRef(false);

  // Wrapped phase setter that persists the current phase
  const setPhase = useCallback((newPhase: AppPhase) => {
    setPhaseState(newPhase);
    if (typeof window !== "undefined") {
      localStorage.setItem(PHASE_STORAGE_KEY, newPhase);
    }
  }, []);

  // Helper to sync session_id in URL and localStorage
  const updateSessionPersistence = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) {
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      const url = new URL(window.location.href);
      url.searchParams.set("session_id", id);
      window.history.replaceState({}, "", url.toString());
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(PHASE_STORAGE_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Rehydrate state from backend
  const rehydrateSession = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getSessionState(id);
        setSessionId(id);

        const stateObj = res.state as Record<string, unknown>;
        const values = extractStateValues(stateObj || res);
        const nextNodes: string[] = Array.isArray(stateObj?.next)
          ? (stateObj.next as string[])
          : Array.isArray((res as unknown as Record<string, unknown>)?.next)
          ? ((res as unknown as Record<string, unknown>).next as string[])
          : [];

        if (values) {
          if (values.job_details) setJobDetails(values.job_details as JobDetails);
          if (values.resume_data) setResumeData(values.resume_data as ResumeStructure);
          if (values.candidate_analysis) setCandidateAnalysis(values.candidate_analysis as CandidateAnalysis);
          if (values.interview_plan) setInterviewPlan(values.interview_plan as InterviewPlan);
          if (values.completed_topic_ids) setCompletedTopicIds(values.completed_topic_ids as string[]);
          if (values.evidence_with_details) setEvidenceWithDetails(values.evidence_with_details as EvidenceWithDetails[]);
          if (values.tailor_analysis) setTailorAnalysis(values.tailor_analysis as TailorAnalysis);
          if (values.feedbacks) setFeedbacks(values.feedbacks as Feedbacks);
        }

        // Determine correct phase
        const storedPhase = typeof window !== "undefined" ? (localStorage.getItem(PHASE_STORAGE_KEY) as AppPhase | null) : null;

        if (values?.tailor_analysis) {
          if (storedPhase === "compare") {
            setPhase("compare");
          } else {
            setPhase("tailor");
          }
        } else if (
          nextNodes.includes("human_after_interview_planner") ||
          nextNodes.includes("human_investigate_chat") ||
          nextNodes.includes("interview_planner") ||
          storedPhase === "interview" ||
          values?.interview_plan
        ) {
          setPhase("interview");

          // Reconstruct interview selection interrupt options from interview_plan
          const plan = values?.interview_plan as InterviewPlan | undefined;
          const completed = (values?.completed_topic_ids as string[]) || [];
          if (plan?.interview_plan) {
            const remaining = plan.interview_plan.filter((t) => !completed.includes(t.topic_id));
            setActiveInterrupt({
              type: "investigation_selection",
              message: "Choose an area to start",
              options: [
                ...remaining.map((t) => ({
                  id: t.topic_id,
                  topic: t.topic,
                  priority: t.priority,
                  reason: t.reason,
                  objective: t.objective,
                  job_requirement: t.job_requirement,
                })),
                { id: "end", label: "Done" },
              ],
            });
          }

          if (nextNodes.includes("human_investigate_chat") && values?.topic_id_selection) {
            setActiveTopicId(values.topic_id_selection as string);
            // Restore messages if present
            const msgs = values.investigation_messages as Array<{ content: string; id?: string }> | undefined;
            if (msgs && msgs.length > 0) {
              setInvestigationMessages(
                msgs.map((m, idx) => ({
                  id: m.id || `msg_${idx}`,
                  role: idx % 2 === 0 ? "assistant" : "user",
                  content: m.content,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                }))
              );
            }
          }
        } else if (
          nextNodes.includes("human_after_analysis") ||
          values?.candidate_analysis ||
          storedPhase === "verification" ||
          values?.job_details
        ) {
          setPhase("verification");
          setActiveInterrupt({
            type: "candidate_review",
            message: "What would you like to do?",
            options: [
              { id: "done", label: "Finish Review" },
              { id: "need_more_info", label: "Investigate More" },
              { id: "tailor", label: "Tailor Candidate" },
            ],
          });
        } else {
          setPhase("setup");
        }
      } catch (err: unknown) {
        console.warn("Session rehydration failed:", err);
        updateSessionPersistence(null);
        setSessionId(null);
        setPhase("setup");
      } finally {
        setIsLoading(false);
      }
    },
    [setPhase, updateSessionPersistence]
  );

  // Auto-rehydrate on initial mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlSession = urlParams.get("session_id");
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    const targetSession = urlSession || storedSession;

    if (targetSession) {
      rehydrateSession(targetSession);
    }
  }, [rehydrateSession]);

  // Phase 1: Upload
  const handleUpload = useCallback(
    async (file: File, jobLink?: string, jobDescription?: string) => {
      setIsLoading(true);
      setError(null);
      setRequiresJobDescriptionFallback(false);
      setFallbackErrorMessage(null);
      setPendingFile(file);

      try {
        const res = await uploadResume(file, jobLink, jobDescription);

        if (!res.success && res.requires_job_description) {
          setRequiresJobDescriptionFallback(true);
          setFallbackErrorMessage(res.error || "Scraping failed. Please paste the job description.");
          if (res.session_id) {
            setSessionId(res.session_id);
            updateSessionPersistence(res.session_id);
          }
          return;
        }

        if (res.success) {
          setSessionId(res.session_id);
          updateSessionPersistence(res.session_id);

          // Check direct upload payload first
          if (res.job_details) {
            setJobDetails(res.job_details);
          }
          if (res.resume_data) {
            setResumeData(res.resume_data);
          }

          const aiResp = res.ai_response;
          if (aiResp.candidate_analysis) {
            setCandidateAnalysis(aiResp.candidate_analysis);
          }
          if (aiResp.job_details) {
            setJobDetails(aiResp.job_details);
          }
          if (aiResp.resume_data) {
            setResumeData(aiResp.resume_data);
          }

          // Unpack raw interrupt from initialize_tailoring_session
          if (aiResp.__interrupt__ && aiResp.__interrupt__.length > 0) {
            const raw = aiResp.__interrupt__[0].value;
            setActiveInterrupt(raw);
          }

          // Fetch fresh session state to ensure full state sync
          try {
            const stateRes = await getSessionState(res.session_id);
            const vals = extractStateValues(stateRes.state || stateRes);
            if (vals) {
              if (vals.job_details) setJobDetails(vals.job_details as JobDetails);
              if (vals.resume_data) setResumeData(vals.resume_data as ResumeStructure);
              if (vals.candidate_analysis) setCandidateAnalysis(vals.candidate_analysis as CandidateAnalysis);
            }
          } catch (fetchErr) {
            console.warn("Follow-up session state fetch warning:", fetchErr);
          }

          setPhase("verification");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsLoading(false);
      }
    },
    [setPhase, updateSessionPersistence]
  );

  // Phase 1 verification actions ("need_more_info" | "tailor" | "done")
  const handleSelectAction = useCallback(
    async (action: "need_more_info" | "tailor" | "done") => {
      if (!sessionId) return;
      setIsLoading(true);
      setError(null);

      try {
        if (action === "tailor") {
          setIsSynthesizing(true);
        }

        const res = await sendChatMessage(sessionId, action);

        if (action === "done") {
          setPhase("setup");
          updateSessionPersistence(null);
          setSessionId(null);
          return;
        }

        if (action === "need_more_info") {
          if ("interrupt" in res.ai_response) {
            setActiveInterrupt(res.ai_response.interrupt);
          }
          // Fetch updated session state to populate interviewPlan and cumulative evidence
          const stateRes = await getSessionState(sessionId);
          const vals = extractStateValues(stateRes.state);
          if (vals) {
            if (vals.interview_plan) setInterviewPlan(vals.interview_plan as InterviewPlan);
            if (vals.completed_topic_ids) setCompletedTopicIds(vals.completed_topic_ids as string[]);
            if (vals.evidence_with_details) setEvidenceWithDetails(vals.evidence_with_details as EvidenceWithDetails[]);
            if (vals.job_details) setJobDetails(vals.job_details as JobDetails);
            if (vals.resume_data) setResumeData(vals.resume_data as ResumeStructure);
          }
          setPhase("interview");
        } else if (action === "tailor") {
          // Direct to tailor
          const stateRes = await getSessionState(sessionId);
          const vals = extractStateValues(stateRes.state);
          if (vals) {
            if (vals.tailor_analysis) setTailorAnalysis(vals.tailor_analysis as TailorAnalysis);
            if (vals.feedbacks) setFeedbacks(vals.feedbacks as Feedbacks);
            if (vals.resume_data) setResumeData(vals.resume_data as ResumeStructure);
          }
          setPhase("tailor");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setIsLoading(false);
        setIsSynthesizing(false);
      }
    },
    [sessionId, setPhase, updateSessionPersistence]
  );

  // Phase 2: Select an investigation topic
  const handleSelectTopic = useCallback(
    async (topicId: string) => {
      if (!sessionId) return;
      setIsLoading(true);
      setError(null);
      setActiveTopicId(topicId);
      setInvestigationMessages([]);

      try {
        const res = await sendChatMessage(sessionId, topicId);

        if ("interrupt" in res.ai_response) {
          const intr = res.ai_response.interrupt;
          setActiveInterrupt(intr);
          setInvestigationMessages([
            {
              id: `q_${Date.now()}`,
              role: "assistant",
              content: intr.message,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Topic selection failed");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  // Phase 2: Submit an answer during active probe
  const handleSubmitAnswer = useCallback(
    async (answerText: string) => {
      if (!sessionId || !answerText.trim()) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: answerText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setInvestigationMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const res = await sendChatMessage(sessionId, answerText.trim());

        if ("interrupt" in res.ai_response) {
          const intr = res.ai_response.interrupt;
          setActiveInterrupt(intr);

          if (intr.type === "investigation_chat") {
            setInvestigationMessages((prev) => [
              ...prev,
              {
                id: `q_${Date.now()}`,
                role: "assistant",
                content: intr.message,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          } else if (intr.type === "investigation_selection") {
            // Topic completed! Returning to topic deck selection
            setActiveTopicId(null);
            // Refresh state to fetch updated completed_topic_ids and evidence_with_details
            const stateRes = await getSessionState(sessionId);
            const vals = extractStateValues(stateRes.state);
            if (vals) {
              if (vals.completed_topic_ids) setCompletedTopicIds(vals.completed_topic_ids as string[]);
              if (vals.evidence_with_details) setEvidenceWithDetails(vals.evidence_with_details as EvidenceWithDetails[]);
              if (vals.interview_plan) setInterviewPlan(vals.interview_plan as InterviewPlan);
            }
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to send answer");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  // Phase 2: Proceed to tailoring
  const handleProceedToTailoring = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setIsSynthesizing(true);
    setError(null);

    try {
      const res = await sendChatMessage(sessionId, "end");

      if ("stage" in res.ai_response && res.ai_response.stage === "completed") {
        const result = res.ai_response.result;
        if (result.tailor_analysis) setTailorAnalysis(result.tailor_analysis);
        if (result.feedbacks) setFeedbacks(result.feedbacks);
        if (result.resume_data) setResumeData(result.resume_data);
      } else {
        // Query session state directly
        const stateRes = await getSessionState(sessionId);
        const vals = extractStateValues(stateRes.state);
        if (vals) {
          if (vals.tailor_analysis) setTailorAnalysis(vals.tailor_analysis as TailorAnalysis);
          if (vals.feedbacks) setFeedbacks(vals.feedbacks as Feedbacks);
          if (vals.resume_data) setResumeData(vals.resume_data as ResumeStructure);
        }
      }

      setPhase("tailor");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tailoring synthesis failed");
    } finally {
      setIsLoading(false);
      setIsSynthesizing(false);
    }
  }, [sessionId, setPhase]);

  // Phase 3: Decide on a proposal (Accept / Reject / Custom Edit)
  const handleDecideProposal = useCallback(
    (proposalKey: string, status: "accepted" | "rejected", customText?: string) => {
      setProposalDecisions((prev) => ({
        ...prev,
        [proposalKey]: { status, customText },
      }));
    },
    []
  );

  // Phase 3 -> Phase 4 transition
  const handleFinishProposalReview = useCallback(() => {
    setPhase("compare");
  }, [setPhase]);

  // Back to Phase 3 from Phase 4
  const handleBackToTailoring = useCallback(() => {
    setPhase("tailor");
  }, [setPhase]);

  // Reset entire session
  const handleResetSession = useCallback(() => {
    updateSessionPersistence(null);
    setSessionId(null);
    setPhase("setup");
    setJobDetails(null);
    setResumeData(null);
    setCandidateAnalysis(null);
    setInterviewPlan(null);
    setCompletedTopicIds([]);
    setEvidenceWithDetails([]);
    setActiveTopicId(null);
    setActiveInterrupt(null);
    setInvestigationMessages([]);
    setTailorAnalysis(null);
    setFeedbacks(null);
    setProposalDecisions({});
    setError(null);
    setRequiresJobDescriptionFallback(false);
    setFallbackErrorMessage(null);
    setPendingFile(null);
  }, [setPhase, updateSessionPersistence]);

  return {
    phase,
    setPhase,
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
  };
}
