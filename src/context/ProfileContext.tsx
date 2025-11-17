// src/context/ProfileContext.tsx
import { createContext, useState } from "react";
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
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  /** Base64 for UI preview (optional) */
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);

  /** Full backend public URL (required for ChatPage image display) */
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);

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