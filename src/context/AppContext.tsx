// src/context/AppContext.tsx
import React, { createContext, useState, useContext } from "react";

interface SelectedImage {
  filename: string;
  public_url: string;
}

interface AppContextType {
  selectedImage: SelectedImage | null;
  setSelectedImage: (image: SelectedImage | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    () => {
      // 🔹 Restore image on refresh (if available)
      const storedUrl = localStorage.getItem("uploadedPhoto");
      const storedFilename = localStorage.getItem("uploadedFilename");
      return storedUrl && storedFilename
        ? { filename: storedFilename, public_url: storedUrl }
        : null;
    }
  );

  // 🔹 Keep in sync with localStorage
  React.useEffect(() => {
    if (selectedImage) {
      localStorage.setItem("uploadedPhoto", selectedImage.public_url);
      localStorage.setItem("uploadedFilename", selectedImage.filename);
    }
  }, [selectedImage]);

  return (
    <AppContext.Provider value={{ selectedImage, setSelectedImage }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
};