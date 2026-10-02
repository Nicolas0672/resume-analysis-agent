import {
  AddBulletResponse,
  AddEntryResponse,
  ApplyTailoringResponse,
  ChatResponse,
  CustomTailoringResponse,
  DeleteBulletResponse,
  DeleteEntryResponse,
  EditBulletResponse,
  EditEntryPayload,
  EditEntryResponse,
  EditSkillsResponse,
  ResumeSkills,
  ResumeStructure,
  SessionStateResponse,
  UpdateResumeResponse,
  UploadResponse,
  UserSessionsResponse,
} from "./types";
import { createClient } from "./supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/tailor";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    let {
      data: { session },
    } = await supabase.auth.getSession();

    // If session is temporarily pending hydration right after page navigation, retry once
    if (!session?.access_token) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const retry = await supabase.auth.getSession();
      session = retry.data.session;
    }

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch {
    // Supabase client may not be initialized if env vars are unset
  }
  return {};
}

export async function uploadResume(
  file: File,
  jobLink?: string,
  jobDescription?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (jobLink && jobLink.trim()) {
    formData.append("job_link", jobLink.trim());
  }

  if (jobDescription && jobDescription.trim()) {
    formData.append("job_description", jobDescription.trim());
  }

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to upload and analyze resume";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function sendChatMessage(
  sessionId: string,
  userMessage: string
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("user_message", userMessage);

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to send message to resume agent";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function getSessionState(sessionId: string): Promise<SessionStateResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    let errorDetail = "Failed to retrieve session state";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function applyTailoring(
  sessionId: string,
  topicId: string
): Promise<ApplyTailoringResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("topic_id", topicId);

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/apply-tailoring`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to apply tailoring for topic";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function customTailoring(
  sessionId: string,
  topicId: string,
  sentenceId: number,
  newText: string
): Promise<CustomTailoringResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("topic_id", topicId);
  formData.append("sentence_id", sentenceId.toString());
  formData.append("new_text", newText);

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/custom-tailoring`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to update custom tailored bullet";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function editResumeBullet(
  sessionId: string,
  sentenceId: number,
  newText: string
): Promise<EditBulletResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("sentence_id", sentenceId.toString());
  formData.append("new_text", newText);

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/edit-resume-bullets`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to edit resume bullet";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function deleteBullet(
  sessionId: string,
  sentenceId: number
): Promise<DeleteBulletResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("sentence_id", sentenceId.toString());

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/delete-bullet`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to delete bullet";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function deleteEntry(
  sessionId: string,
  entryId: number
): Promise<DeleteEntryResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("entry_id", entryId.toString());

  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/delete-entry`, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to delete resume entry";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function getUserSessions(): Promise<UserSessionsResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    let errorDetail = "Failed to retrieve user sessions";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function editResumeEntry(
  payload: EditEntryPayload
): Promise<EditEntryResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/edit-entry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = "Failed to edit resume entry";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function addResumeBullet(
  sessionId: string,
  entryId: number,
  text: string
): Promise<AddBulletResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/add-bullet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ session_id: sessionId, entry_id: entryId, text }),
  });

  if (!response.ok) {
    let errorDetail = "Failed to add resume bullet";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function editResumeSkills(
  sessionId: string,
  skills: ResumeSkills
): Promise<EditSkillsResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/edit-skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ session_id: sessionId, skills }),
  });

  if (!response.ok) {
    let errorDetail = "Failed to edit resume skills";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function updateFullResume(
  sessionId: string,
  resumeToEdit: ResumeStructure
): Promise<UpdateResumeResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/update-resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ session_id: sessionId, resume_to_edit: resumeToEdit }),
  });

  if (!response.ok) {
    let errorDetail = "Failed to update full resume";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export async function addResumeEntry(
  sessionId: string,
  sectionType: string,
  entryData: Record<string, any>
): Promise<AddEntryResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/add-entry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      session_id: sessionId,
      section_type: sectionType,
      entry: entryData,
    }),
  });

  if (!response.ok) {
    let errorDetail = "Failed to add resume entry";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

/**
 * Downloads the exported PDF or DOCX file directly from the backend.
 */
export async function downloadResumeFile(
  endpoint: "pdf" | "docx",
  sessionId: string,
  candidateName?: string | null
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE}/export/${endpoint}?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: {
        ...authHeaders,
      },
    }
  );

  if (!response.ok) {
    let errorDetail = `Failed to export ${endpoint.toUpperCase()}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  const disposition = response.headers.get("Content-Disposition");
  let filename = `${candidateName ? candidateName.replace(/\s+/g, "_") : "Resume"}_Tailored_Resume.${endpoint}`;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function exportResumePdf(
  sessionId: string,
  candidateName?: string | null
): Promise<void> {
  return downloadResumeFile("pdf", sessionId, candidateName);
}

export async function exportResumeDocx(
  sessionId: string,
  candidateName?: string | null
): Promise<void> {
  return downloadResumeFile("docx", sessionId, candidateName);
}



