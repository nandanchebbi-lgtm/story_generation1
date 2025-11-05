// src/api/profiles.ts
const API_BASE = "http://127.0.0.1:8000/api/profiles"; // ✅ Correct base for all profile routes

async function handleResponse(res: Response, errorMessage: string) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${errorMessage} (${res.status}): ${text}`);
  }
  return await res.json().catch(() => ({}));
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/list`);
  return handleResponse(res, "Failed to load profiles");
}

export async function createProfile(name: string) {
  const res = await fetch(`${API_BASE}/create?name=${encodeURIComponent(name)}`, {
    method: "POST",
  });
  await handleResponse(res, "Failed to create profile");
  return name;
}

export async function deleteProfile(name: string) {
  const res = await fetch(`${API_BASE}/delete?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  await handleResponse(res, "Failed to delete profile");
}

export async function selectProfile(name: string) {
  const res = await fetch(`${API_BASE}/select?name=${encodeURIComponent(name)}`, {
    method: "POST",
  });
  await handleResponse(res, "Failed to select profile");
  return name;
}