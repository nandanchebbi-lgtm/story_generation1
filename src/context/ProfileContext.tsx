// src/context/ProfileContext.tsx
import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

/** Context type */
export interface ProfileContextType {
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;

  /** Base64 preview for UI only (optional) */
  uploadedPhotoBase64: string | null;
  setUploadedPhotoBase64: (base64: string | null) => void;

  /** The REAL image URL from backend (public_url) */
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
  // Restore selectedProfile from localStorage if exists
  const [selectedProfile, setSelectedProfile] = useState<string | null>(() => {
    return localStorage.getItem("activeProfile") || null;
  });

  /** Base64 for UI preview (optional) */
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(
    null
  );

  /** Full backend public URL (required for ChatPage image display) */
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);

  // Persist selectedProfile to localStorage whenever it changes
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem("activeProfile", selectedProfile);
    } else {
      localStorage.removeItem("activeProfile");
    }
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