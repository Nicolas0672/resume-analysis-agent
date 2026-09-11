import { ChatResponse, SessionStateResponse, UploadResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/tailor";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
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

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
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

  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
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
  const response = await fetch(`${API_BASE}/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
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
