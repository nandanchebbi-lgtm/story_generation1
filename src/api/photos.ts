import { API_BASE } from "./axiosConfig";

const BASE = API_BASE; // always ends with /api

export interface Photo {
  filename: string;
  uploaded_path: string;
  processed_path: string;
  public_url: string;
  local_path?: string;
}

export interface PhotosListResponse {
  uploaded_images: Photo[];
  selected_image: Photo | null;
}

export function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE.replace(/\/api$/, "")}/${url.replace(/^\/+/, "")}`;
}

function normalizePhoto(raw: any): Photo {
  return {
    filename: raw.filename ?? "",
    uploaded_path: raw.uploaded_path ?? "",
    processed_path: raw.processed_path ?? "",
    local_path: raw.local_path ?? "",
    public_url: normalizeImageUrl(raw.public_url) ?? "",
  };
}

export async function listUploadedPhotos(profile: string) {
  const res = await fetch(`${BASE}/photo/list?profile=${profile}`);
  if (!res.ok) throw new Error(`Failed to fetch photos (${res.status})`);
  const data = await res.json();
  return {
    uploaded_images: (data.uploaded_images || []).map(normalizePhoto),
    selected_image: data.selected_image ? normalizePhoto(data.selected_image) : null,
  };
}

export async function uploadPhoto(profile: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/gpt4v/upload?profile=${profile}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);

  const data = await res.json();
  const filename = data.filename;

  await fetch(`${BASE}/gpt4v/select?profile=${profile}&image_name=${filename}`, {
    method: "POST",
  }).catch(() => {});

  return normalizePhoto(data);
}

export async function selectPhoto(profile: string, filename: string) {
  const res = await fetch(`${BASE}/gpt4v/select?profile=${profile}&image_name=${filename}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Select photo failed (${res.status})`);
  const data = await res.json();
  return normalizePhoto({ ...data, filename });
}

export async function sendPhotoChat(profile: string, userMessage: string) {
  const form = new URLSearchParams();
  form.append("profile", profile);
  form.append("user_message", userMessage);
  const res = await fetch(`${BASE}/gpt4v/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return res.json();
}