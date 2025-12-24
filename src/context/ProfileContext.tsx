// src/context/ProfileContext.tsx
import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

/** Context type */
export interface ProfileContextType {
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;

  /** Base64 preview for UI only */
  uploadedPhotoBase64: string | null;
  setUploadedPhotoBase64: (base64: string | null) => void;

  /** Real backend public URL */
  uploadedPhotoURL: string | null;
  setUploadedPhotoURL: (url: string | null) => void;
}

/** Create context */
export const ProfileContext = createContext<ProfileContextType>({
  selectedProfile: null,
  setSelectedProfile: () => {},

  uploadedPhotoBase64: null,
  setUploadedPhotoBase64: () => {},

  uploadedPhotoURL: null,
  setUploadedPhotoURL: () => {},
});

/** Provider */
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  /** ---------------------------
   *  Restore selected profile
   * ---------------------------- */
  const [selectedProfile, setSelectedProfile] = useState<string | null>(() => {
    return localStorage.getItem("activeProfile") || null;
  });

  /** Base64 preview (not persisted) */
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(
    () => {
      return localStorage.getItem("profileUploadedBase64") || null;
    }
  );

  /** Real URL (persisted) */
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(() => {
    return localStorage.getItem("profileUploadedURL") || null;
  });

  /** ---------------------------
   * Persist selected profile
   * ---------------------------- */
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem("activeProfile", selectedProfile);
    } else {
      localStorage.removeItem("activeProfile");
    }
  }, [selectedProfile]);

  /** ---------------------------
   * Sync image URL + Base64 preview
   * ---------------------------- */
  useEffect(() => {
    if (uploadedPhotoURL === null) {
      // Cleanup stale data
      localStorage.removeItem("profileUploadedURL");
    } else {
      localStorage.setItem("profileUploadedURL", uploadedPhotoURL);
    }
  }, [uploadedPhotoURL]);

  useEffect(() => {
    if (uploadedPhotoBase64 === null) {
      localStorage.removeItem("profileUploadedBase64");
    } else {
      localStorage.setItem("profileUploadedBase64", uploadedPhotoBase64);
    }
  }, [uploadedPhotoBase64]);

  /** ---------------------------
   * When switching profiles:
   * Reset all image data completely
   * ---------------------------- */
  useEffect(() => {
    // Reset state
    setUploadedPhotoBase64(null);
    setUploadedPhotoURL(null);

    // Reset localStorage
    localStorage.removeItem("profileUploadedURL");
    localStorage.removeItem("profileUploadedBase64");
  }, [selectedProfile]);

  return (
    <ProfileContext.Provider
      value={{
        selectedProfile,
        setSelectedProfile,

        uploadedPhotoBase64,
        setUploadedPhotoBase64,

        uploadedPhotoURL,
        setUploadedPhotoURL,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};