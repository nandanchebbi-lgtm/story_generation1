// src/api/photos.ts

/** 🔧 Centralized API base */
const API_BASE = `${import.meta.env.VITE_API_BASE}/api`;

/** 📸 Type definitions */
export interface Photo {
  filename: string;
  uploaded_path: string;
  processed_path: string;
  public_url: string; // Always absolute URL from backend
  local_path?: string;
}

export interface PhotosListResponse {
  uploaded_images: Photo[];
  selected_image: Photo | null;
}

/** 🧩 Normalize public URL if needed */
export function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null;

  // If backend already gave a full URL, trust it.
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // Otherwise prepend backend base
  return `${import.meta.env.VITE_API_BASE.replace(/\/api$/, "")}/${url.replace(/^\/+/, "")}`;
}

/** 🧠 Normalize a photo object */
function normalizePhoto(raw: any): Photo {
  return {
    filename: raw.filename || "",
    uploaded_path: raw.uploaded_path || "",
    processed_path: raw.processed_path || "",
    local_path: raw.local_path || "",
    public_url: normalizeImageUrl(raw.public_url || "") || "",
  };
}

/** 📸 List uploaded photos */
export async function listUploadedPhotos(profile: string): Promise<PhotosListResponse> {
  const res = await fetch(`${API_BASE}/photo/list?profile=${encodeURIComponent(profile)}`);
  if (!res.ok) throw new Error(`Failed to fetch photos (${res.status})`);

  const data = await res.json();

  return {
    uploaded_images: (data.uploaded_images || []).map(normalizePhoto),
    selected_image: data.selected_image ? normalizePhoto(data.selected_image) : null,
  };
}

/** 📤 Upload photo → backend auto-selects it */
export async function uploadPhoto(profile: string, file: File): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/gpt4v/upload?profile=${encodeURIComponent(profile)}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);

  const data = await res.json();
  const filename = data.filename;

  // Auto-select newly uploaded image
  await fetch(
    `${API_BASE}/gpt4v/select?profile=${encodeURIComponent(profile)}&image_name=${encodeURIComponent(filename)}`,
    { method: "POST" }
  ).catch(() => console.warn("Auto-select failed"));

  return normalizePhoto(data);
}

/** 🖼️ Select an existing uploaded image */
export async function selectPhoto(profile: string, filename: string): Promise<Photo> {
  const res = await fetch(
    `${API_BASE}/gpt4v/select?profile=${encodeURIComponent(profile)}&image_name=${encodeURIComponent(filename)}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error(`Select photo failed (${res.status})`);

  const data = await res.json();
  return normalizePhoto({ ...data, filename });
}

/** 💬 Chat with GPT-4V about the selected photo */
export async function sendPhotoChat(profile: string, userMessage: string) {
  const form = new URLSearchParams();
  form.append("profile", profile);
  form.append("user_message", userMessage);

  const res = await fetch(`${API_BASE}/gpt4v/chat`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return await res.json();
}