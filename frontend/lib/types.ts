export interface JobDetails {
  is_valid: boolean;
  job_title: string;
  job_requirements: string[];
  job_company: string;
  job_location: string;
  job_responsibilities: string[];
}

export interface ResumeBullet {
  text: string;
  sentence_id: string;
}

export interface ResumeExperience {
  entry_id: string;
  company?: string | null;
  job_title?: string | null;
  location?: string | null;
  duration?: string | null;
  bullets: ResumeBullet[];
}

export interface ResumeLeadership {
  entry_id: string;
  title: string;
  position?: string | null;
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  entry_id: string;
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  location?: string | null;
  duration?: string | null;
  gpa?: string | null;
  coursework?: string[] | null;
  sentence_ids?: string[];
}

export interface ResumeProject {
  entry_id: string;
  project_name?: string | null;
  technologies?: string[] | null;
  bullets: ResumeBullet[];
}

export interface ResumeCertification {
  entry_id: string;
  name: string;
  date?: string | null;
  sentence_ids?: string[];
}

export interface ResumeSkills {
  programming_languages?: string[];
  frameworks?: string[];
  libraries?: string[];
  databases?: string[];
  cloud?: string[];
  tools?: string[];
  other?: string[];
  sentence_ids?: string[];
}

export interface ResumeStructure {
  name?: string | null;
  contact?: string | null;
  leadership?: ResumeLeadership[] | null;
  work_experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  skills?: ResumeSkills | null;
}

export interface CandidateStrength {
  requirement: string;
  evidence: string[];
  explanation: string;
}

export type CandidateGapStatus = "missing" | "partial" | "unclear" | "transferable";

export interface CandidateGap {
  requirement: string;
  status: CandidateGapStatus;
  evidence?: string[] | null;
  gap: string;
}

export interface CandidateAnalysis {
  score: "weak match" | "good match" | "strong match";
  relevant_experience?: string | null;
  strengths?: Array<CandidateStrength | string> | null;
  gaps?: Array<CandidateGap | string> | null;
  user_message: string;
}

export interface ResumeReference {
  type: "projects" | "work_experience" | "leadership";
  entry_id: string;
}

export interface InterviewDetails {
  topic_id: string;
  priority: "Low" | "Medium" | "High";
  relevant_experience?: string[];
  relevant_experience_from_resume?: ResumeReference[] | null;
  topic: string;
  reason: string;
  objective: string;
  job_requirement: string;
}

export interface InterviewPlan {
  interview_plan: InterviewDetails[];
}

export interface Evidence {
  project_name?: string | null;
  experience_found?: string[] | null;
  technologies?: string[] | null;
  ownership?: string[] | null;
  scope?: string[] | null;
  metrics?: string[] | null;
  impact?: string[] | null;
  company?: string | null;
  job_title?: string | null;
  job_location?: string | null;
  duration?: string | null;
}

export interface EvidenceWithDetails {
  evidence?: Evidence | null;
  job_requirement: string;
  topic_id: string;
}

export interface EvidenceMapping {
  evidence_with_details: EvidenceWithDetails;
  resume_reference: ResumeReference;
  mapping_status: "MATCHED" | "UNMATCHED";
  reasoning?: string | null;
}

export interface EvidenceMappingResult {
  evidence_mappings: EvidenceMapping[];
}

export interface TailorMatched {
  next_action: "KEEP" | "MODIFY" | "ADD";
  old_bullet_points?: ResumeBullet[] | null;
  new_bullet_points?: ResumeBullet[] | null;
  reasoning: string;
  evidence: string[];
  resume_reference: ResumeReference;
  topic_id: string;
}

export interface TailorUnmatched {
  next_action: "ADD";
  new_bullet_points: ResumeBullet[];
  company_name?: string | null;
  duration?: string | null;
  job_location?: string | null;
  job_title?: string | null;
  skills?: string[] | null;
  project_name?: string | null;
  reasoning: string;
  evidence: string[];
  topic_id: string;
}

export interface TailorAnalysis {
  tailor_matched_list: TailorMatched[];
  tailor_unmatched_list: TailorUnmatched[];
}

export interface Feedback {
  valid: boolean;
  suggestions: string;
  topic_id: string;
}

export interface Feedbacks {
  feedbacks: Feedback[];
}

export interface InterruptOption {
  id: string;
  label?: string;
  topic?: string;
  priority?: "High" | "Medium" | "Low";
  reason?: string;
  objective?: string;
  job_requirement?: string;
}

export interface InterruptPayload {
  type: "candidate_review" | "investigation_selection" | "investigation_chat" | string;
  message: string;
  options: InterruptOption[];
}

export interface RawInterrupt {
  value: InterruptPayload;
  resumable?: boolean;
  ns?: string[];
}

export interface UploadSuccessResponse {
  success: true;
  session_id: string;
  requires_job_description: false;
  job_details?: JobDetails;
  resume_data?: ResumeStructure;
  ai_response: {
    __interrupt__?: RawInterrupt[];
    candidate_analysis?: CandidateAnalysis;
    resume_data?: ResumeStructure;
    job_details?: JobDetails;
  };
}

export interface UploadFallbackResponse {
  success: false;
  session_id: string;
  requires_job_description: true;
  error: string;
}

export type UploadResponse = UploadSuccessResponse | UploadFallbackResponse;

export interface ChatInterruptResponse {
  message: string;
  ai_response: {
    interrupt: InterruptPayload;
  };
}

export interface CompletedStateResult {
  resume_data?: ResumeStructure;
  job_details?: JobDetails;
  candidate_analysis?: CandidateAnalysis;
  interview_plan?: InterviewPlan;
  completed_topic_ids?: string[];
  evidence_with_details?: EvidenceWithDetails[];
  evidence_mapping?: EvidenceMappingResult;
  tailor_analysis?: TailorAnalysis;
  feedbacks?: Feedbacks;
  [key: string]: unknown;
}

export interface ChatCompletedResponse {
  message: string;
  ai_response: {
    stage: "completed";
    result: CompletedStateResult;
  };
}

export type ChatResponse = ChatInterruptResponse | ChatCompletedResponse;

export interface SessionStateResponse {
  message: string;
  state: {
    stage?: string;
    interrupt?: InterruptPayload;
    result?: CompletedStateResult;
    values?: CompletedStateResult;
    next?: string[];
    [key: string]: unknown;
  };
}

export type AppPhase = "setup" | "verification" | "interview" | "tailor" | "compare";
