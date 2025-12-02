// src/api/chat.ts
import axiosInstance from "./axiosConfig";

export interface ChatResponse {
  reply: string;
  selected_image?: string;
}

// Sends message to GPT, including the profile
export async function sendMessage(
  profile: string,
  userMessage: string
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("user_message", userMessage);
  formData.append("profile", profile);

  const res = await axiosInstance.post<ChatResponse>(`/api/gpt4v/chat`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}