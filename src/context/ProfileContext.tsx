// src/context/ProfileContext.tsx
import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface ProfileContextType {
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;
  uploadedPhoto: string | null;
  setUploadedPhoto: (photo: string | null) => void;
}

export const ProfileContext = createContext<ProfileContextType>({
  selectedProfile: null,
  setSelectedProfile: () => {},
  uploadedPhoto: null,
  setUploadedPhoto: () => {},
});

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [selectedProfile, setSelectedProfileState] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhotoState] = useState<string | null>(null);

  // ✅ Load both profile and photo from localStorage on app start
  useEffect(() => {
    const savedProfile = localStorage.getItem("activeProfile");
    const savedPhoto = localStorage.getItem("uploadedPhoto");

    if (savedProfile) setSelectedProfileState(savedProfile);
    if (savedPhoto) setUploadedPhotoState(savedPhoto);
  }, []);

  // ✅ When user selects a profile
  const setSelectedProfile = (profile: string | null) => {
    setSelectedProfileState(profile);
    if (profile) localStorage.setItem("activeProfile", profile);
    else localStorage.removeItem("activeProfile");
  };

  // ✅ When user uploads a photo
  const setUploadedPhoto = (photo: string | null) => {
    setUploadedPhotoState(photo);
    if (photo) localStorage.setItem("uploadedPhoto", photo);
    else localStorage.removeItem("uploadedPhoto");
  };

  return (
    <ProfileContext.Provider
      value={{
        selectedProfile,
        setSelectedProfile,
        uploadedPhoto,
        setUploadedPhoto,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};