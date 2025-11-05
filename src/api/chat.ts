import axios from "axios";

export interface ChatResponse {
  reply: string;
  selected_image?: string;
}

// Sends message to GPT, including the profile
export async function sendMessage(profile: string, userMessage: string): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("user_message", userMessage);
  formData.append("profile", profile); // ✅ include profile in form

  const res = await axios.post<ChatResponse>(
    `/api/gpt4v/chat`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return res.data;
}

