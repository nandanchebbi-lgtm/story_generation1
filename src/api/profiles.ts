import type { Profile } from "./types";
import { api } from "./axiosConfig";

// Generic response handler
async function handleResponse<T>(promise: Promise<any>, errorMessage: string): Promise<T> {
  try {
    const res = await promise;
    return res.data;
  } catch (err: any) {
    const msg = err.response?.data?.detail || err.message || "Unknown error";
    throw new Error(`${errorMessage}: ${msg}`);
  }
}

// Fetch all profiles
export async function fetchProfiles(): Promise<Profile[]> {
  return handleResponse<Profile[]>(api.get("/profiles/list"), "Failed to load profiles");
}

// Create a new profile
export async function createProfile(name: string): Promise<Profile> {
  return handleResponse<Profile>(api.post("/profiles/create", { name }), "Failed to create profile");
}

// Delete a profile
export async function deleteProfile(name: string): Promise<{ message: string }> {
  return handleResponse<{ message: string }>(
    api.delete("/profiles/delete", { data: { name } }),
    "Failed to delete profile"
  );
}

// Select a profile
export async function selectProfile(name: string): Promise<string> {
  await handleResponse<null>(api.post("/profiles/select", { name }), "Failed to select profile");
  return name;
}

export default api;