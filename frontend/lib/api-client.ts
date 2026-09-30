import {
  ApplyTailoringResponse,
  ChatResponse,
  CustomTailoringResponse,
  DeleteBulletResponse,
  DeleteEntryResponse,
  EditBulletResponse,
  SessionStateResponse,
  UploadResponse,
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
