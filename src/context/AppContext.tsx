// src/context/AppContext.tsx
import React, { createContext, useState, useContext } from "react";

interface SelectedImage {
  filename: string;
  public_url: string;
}

interface AppContextType {
  selectedImage: SelectedImage | null;
  updateImage: (image: SelectedImage | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {

  // Restore previous image only if localStorage contains both fields
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    () => {
      const storedUrl = localStorage.getItem("uploadedPhoto");
      const storedFilename = localStorage.getItem("uploadedFilename");

      if (storedUrl && storedFilename) {
        return { filename: storedFilename, public_url: storedUrl };
      }
      return null;
    }
  );

  // 🔥 NEW — centralised safe update with cleanup
  const updateImage = (image: SelectedImage | null) => {
    if (image === null) {
      // Clear old data fully
      localStorage.removeItem("uploadedPhoto");
      localStorage.removeItem("uploadedFilename");
      setSelectedImage(null);
      return;
    }

    // Write new data
    localStorage.setItem("uploadedPhoto", image.public_url);
    localStorage.setItem("uploadedFilename", image.filename);

    setSelectedImage(image);
  };

  return (
    <AppContext.Provider value={{ selectedImage, updateImage }}>
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