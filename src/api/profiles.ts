// src/api/profiles.ts
import type { Profile } from "./types";
import api from "./axiosConfig";

async function handleResponse<T>(promise: Promise<any>, errorMessage: string): Promise<T> {
  try {
    const res = await promise;
    return res.data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.message || "Unknown error";
    throw new Error(`${errorMessage}: ${msg}`);
  }
}

export async function fetchProfiles(): Promise<Profile[]> {
  return handleResponse<Profile[]>(api.get("/api/profiles/list"), "Failed to load profiles");
}

export async function createProfile(name: string): Promise<Profile> {
  return handleResponse<Profile>(
    api.post("/api/profiles/create", { name }),
    "Failed to create profile"
  );
}

export async function deleteProfile(name: string): Promise<{ message: string }> {
  return handleResponse<{ message: string }>(
    api.delete("/api/profiles/delete", { data: { name } }),
    "Failed to delete profile"
  );
}

export async function selectProfile(name: string) {
  localStorage.setItem("selectedProfile", name);
  return name;
}

export default api;