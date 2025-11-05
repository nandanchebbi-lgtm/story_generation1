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

const API_BASE = "http://127.0.0.1:8000/api";

/** 📸 List uploaded photos for a profile */
export async function listUploadedPhotos(profile: string): Promise<PhotosListResponse> {
  const res = await fetch(`${API_BASE}/photo/list?profile=${encodeURIComponent(profile)}`);
  if (!res.ok) throw new Error(`Failed to fetch photos (${res.status})`);
  const data = await res.json();
  return {
    uploaded_images: data.uploaded_images || [],
    selected_image: data.selected_image || null,
  };
}

/** 📤 Upload photo (auto-selects uploaded image) */
export async function uploadPhoto(profile: string, file: File): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);

  // 1️⃣ Upload the image
  const res = await fetch(`${API_BASE}/gpt4v/upload?profile=${encodeURIComponent(profile)}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json();
  const filename = data.filename;

  // 2️⃣ Auto-select uploaded image for GPT-4V
  try {
    await fetch(
      `${API_BASE}/gpt4v/select?profile=${encodeURIComponent(profile)}&image_name=${encodeURIComponent(filename)}`,
      { method: "POST" }
    );
    console.log(`[SELECT] Auto-selected ${filename} for ${profile}`);
  } catch (err) {
    console.warn("Auto-select failed:", err);
  }

  return data;
}

/** ✅ Manually select an existing photo */
export async function selectPhoto(profile: string, filename: string): Promise<Photo> {
  const res = await fetch(
    `${API_BASE}/gpt4v/select?profile=${encodeURIComponent(profile)}&image_name=${encodeURIComponent(filename)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Select photo failed (${res.status})`);
  const data = await res.json();
  return {
    filename,
    uploaded_path: "",
    processed_path: "",
    public_url: data.url || "",
    local_path: "",
  };
}

/** 💬 Send a message to GPT-4V */
export async function sendPhotoChat(profile: string, userMessage: string) {
  const form = new URLSearchParams();
  form.append("profile", profile);
  form.append("user_message", userMessage);

  const res = await fetch(`${API_BASE}/gpt4v/chat`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return await res.json();
}