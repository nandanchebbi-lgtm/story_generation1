import React, { useState, useEffect, useContext } from "react";
import type { Photo, PhotosListResponse } from "../api/photos";
import { uploadPhoto, listUploadedPhotos, selectPhoto } from "../api/photos";
import { ProfileContext } from "../context/ProfileContext";

const PhotosPage: React.FC = () => {
  const { selectedProfile } = useContext(ProfileContext);
  const [uploadedPhotos, setUploadedPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Fetch uploaded photos whenever selectedProfile changes
  useEffect(() => {
    if (!selectedProfile) return;

    const fetchPhotos = async () => {
      try {
        const response: PhotosListResponse = await listUploadedPhotos(selectedProfile);
        setUploadedPhotos(response.uploaded_images || []);

        // Ensure selected_image is the full object
        if (response.selected_image) {
          setSelectedPhoto(response.selected_image);
        }
      } catch (err) {
        console.error("Failed to fetch photos:", err);
      }
    };

    fetchPhotos();
  }, [selectedProfile]);

  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProfile) return;

    try {
      const uploaded: Photo = await uploadPhoto(selectedProfile, file);
      console.log("Uploaded:", uploaded);

      // Refresh the photo list
      const updated: PhotosListResponse = await listUploadedPhotos(selectedProfile);
      setUploadedPhotos(updated.uploaded_images || []);

      // Set newly uploaded photo as selected
      const newlyUploaded = updated.uploaded_images.find((p) => p.filename === uploaded.filename);
      if (newlyUploaded) setSelectedPhoto(newlyUploaded);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload photo");
    }
  };

  // Handle selecting an existing photo
  const handleSelectPhoto = async (photo: Photo) => {
    if (!selectedProfile) return;

    try {
      await selectPhoto(selectedProfile, photo.filename);
      setSelectedPhoto(photo);
      console.log("Selected photo:", photo.filename);
    } catch (err) {
      console.error("Select photo failed:", err);
      alert("Failed to select photo");
    }
  };

  if (!selectedProfile) return <p>⚠️ Select a profile to manage photos.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Photos for {selectedProfile}</h1>

      {/* File upload */}
      <input type="file" onChange={handleFileChange} className="mb-4" />

      {/* Uploaded Photos List */}
      {uploadedPhotos.length > 0 ? (
        <ul>
          {uploadedPhotos.map((photo) => (
            <li key={photo.filename} className="mb-4">
              <p className="font-medium">{photo.filename}</p>
              <img
                src={photo.public_url}
                alt={photo.filename}
                className="max-w-xs rounded shadow mb-2"
              />
              <button
                onClick={() => handleSelectPhoto(photo)}
                className="px-2 py-1 bg-blue-500 text-white rounded"
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No uploaded photos yet.</p>
      )}

      {/* Selected Photo Preview */}
      {selectedPhoto && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Selected Photo</h2>
          <img
            src={selectedPhoto.public_url}
            alt={selectedPhoto.filename}
            className="max-w-md rounded shadow"
          />
          <p className="mt-1 font-medium">{selectedPhoto.filename}</p>
        </div>
      )}
    </div>
  );
};

export default PhotosPage;