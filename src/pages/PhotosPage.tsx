import React, { useEffect, useState, useContext } from "react";
import type { ChangeEvent } from "react";
import type { Photo, PhotosListResponse } from "../api/photos";
import { uploadPhoto, listUploadedPhotos, selectPhoto } from "../api/photos";
import { ProfileContext } from "../context/ProfileContext";

export default function PhotosPage() {
  const { selectedProfile } = useContext(ProfileContext);
  const [images, setImages] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all photos on profile change
  useEffect(() => {
    if (!selectedProfile) return;
    loadPhotos();
  }, [selectedProfile]);

  async function loadPhotos() {
    if (!selectedProfile) return;
    try {
      setLoading(true);
      const res: PhotosListResponse = await listUploadedPhotos(selectedProfile);
      setImages(res.uploaded_images || []);
      setSelected(res.selected_image || null);
    } catch {
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file || !selectedProfile) return;
    try {
      setLoading(true);
      await uploadPhoto(selectedProfile, file);
      setFile(null);
      await loadPhotos();
    } catch {
      setError("Failed to upload photo");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(photo: Photo) {
    if (!selectedProfile) return;
    try {
      setLoading(true);
      await selectPhoto(selectedProfile, photo.filename);
      setSelected(photo);
    } catch {
      setError("Failed to select photo");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedProfile)
    return <p style={{ padding: 20 }}>⚠️ Please select a profile first.</p>;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "auto",
        padding: 40,
        fontFamily: "Rubik, sans-serif",
        color: "white",
        backgroundColor: "#121212",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>🖼️ Manage Photos</h1>
      <p style={{ color: "#ff4b4b", marginBottom: 20 }}>
        Active Profile: <strong>{selectedProfile}</strong>
      </p>

      {/* Upload new photo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="file"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files ? e.target.files[0] : null)
          }
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 6,
            backgroundColor: "#1e1e1e",
            color: "white",
          }}
        />
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            padding: "10px 16px",
            backgroundColor: "#ff4b4b",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 10,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* List of uploaded images */}
      {loading ? (
        <p>Loading...</p>
      ) : images.length === 0 ? (
        <p>No uploaded images yet.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {images.map((photo) => (
            <li
              key={photo.filename}
              style={{
                width: "80%",
                background:
                  selected?.filename === photo.filename
                    ? "#1e293b"
                    : "#1a1a1a",
                padding: 12,
                borderRadius: 8,
                textAlign: "center",
                border:
                  selected?.filename === photo.filename
                    ? "2px solid #ff4b4b"
                    : "1px solid #333",
              }}
            >
              <p style={{ margin: "4px 0", fontWeight: 500, fontSize: 14 }}>
                {photo.filename}
              </p>
              <img
                src={photo.public_url}
                alt={photo.filename}
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: 8,
                  objectFit: "cover",
                  marginTop: 6,
                  marginBottom: 8,
                }}
              />
              <button
                onClick={() => handleSelect(photo)}
                disabled={loading}
                style={{
                  backgroundColor: "#ff4b4b",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "#ff4b4b" }}>
            ✅ Selected image: <b>{selected.filename}</b>
          </p>
        </div>
      )}
    </div>
  );
}