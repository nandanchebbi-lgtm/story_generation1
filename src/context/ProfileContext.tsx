// src/context/ProfileContext.tsx
import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

/** Context type */
export interface ProfileContextType {
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;

  /** Base64 preview for UI only (not persisted in localStorage) */
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

  /** Base64 preview (UI-only, not persisted) */
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(
    null
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
   * Persist image URL
   * ---------------------------- */
  useEffect(() => {
    if (uploadedPhotoURL === null) {
      localStorage.removeItem("profileUploadedURL");
    } else {
      localStorage.setItem("profileUploadedURL", uploadedPhotoURL);
    }
  }, [uploadedPhotoURL]);

  /** ---------------------------
   * Optional: Safe setter for Base64
   * Never persists to localStorage to avoid quota issues
   * ---------------------------- */
  const safeSetUploadedPhotoBase64 = (base64: string | null) => {
    setUploadedPhotoBase64(base64);
  };

  /** ---------------------------
   * When switching profiles:
   * Reset all image data completely
   * ---------------------------- */
  useEffect(() => {
    setUploadedPhotoBase64(null);
    setUploadedPhotoURL(null);

    localStorage.removeItem("profileUploadedURL");
  }, [selectedProfile]);

  return (
    <ProfileContext.Provider
      value={{
        selectedProfile,
        setSelectedProfile,

        uploadedPhotoBase64,
        setUploadedPhotoBase64: safeSetUploadedPhotoBase64,

        uploadedPhotoURL,
        setUploadedPhotoURL,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};