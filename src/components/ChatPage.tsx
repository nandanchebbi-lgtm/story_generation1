// src/pages/ChatPage.tsx
import { useState, useEffect, useContext } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ProfileContext } from "../context/ProfileContext";
import { listUploadedPhotos, uploadPhoto, selectPhoto } from "../api/photos";
import type { Photo, PhotosListResponse } from "../api/photos";

export default function ChatPage() {
  const { selectedProfile } = useContext(ProfileContext);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load photos when profile changes
  useEffect(() => {
    if (!selectedProfile) return;
    loadPhotos();
  }, [selectedProfile]);

  const loadPhotos = async () => {
    try {
      const res: PhotosListResponse = await listUploadedPhotos(selectedProfile!);
      setPhotos(res.uploaded_images || []);
      setSelectedPhoto(res.selected_image || null);
    } catch (e) {
      console.error(e);
      setError("Failed to load photos");
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  /** ✅ Send a chat message to /api/gpt4v/chat */
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    try {
      const body = new URLSearchParams({
        profile: selectedProfile,
        user_message: userMessage,
      });

      const res = await fetch("http://127.0.0.1:8000/api/gpt4v/chat", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setError("Failed to send message");
    }
  };

  /** ✅ Upload photo via backend */
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!selectedProfile || !e.target.files?.length) return;
    const file = e.target.files[0];

    try {
      setUploading(true);
      await uploadPhoto(selectedProfile, file);
      await loadPhotos();
    } catch (e) {
      console.error(e);
      setError("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /** ✅ Select photo (and initiate chat automatically) */
  const handleSelect = async (photo: Photo) => {
    if (!selectedProfile) return;

    try {
      const res = await selectPhoto(selectedProfile, photo.filename);
      setSelectedPhoto(res);

      // Start a chat about this photo
      const intro = `Let's talk about this photo`;
      setMessages(prev => [...prev, { role: "user", content: intro }]);

      const body = new URLSearchParams({
        profile: selectedProfile,
        user_message: intro,
      });

      const chatRes = await fetch("http://127.0.0.1:8000/api/gpt4v/chat", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!chatRes.ok) throw new Error("Failed to start photo chat");
      const chatData = await chatRes.json();

      setMessages(prev => [...prev, { role: "assistant", content: chatData.reply }]);
    } catch (e) {
      console.error(e);
      setError("Failed to select photo");
    }
  };

  if (!selectedProfile) return <p>Please select a profile first.</p>;

  // ✅ --- UI Render ---
  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto", fontFamily: "sans-serif" }}>
      <h1>💬 Chat with {selectedProfile}</h1>

      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

      <input type="file" onChange={handleUpload} disabled={uploading} style={{ marginBottom: 10 }} />

      <ul>
        {photos.map(p => (
          <li key={p.filename} style={{ margin: "8px 0", display: "flex", justifyContent: "space-between" }}>
            <span>{p.filename}</span>
            <button onClick={() => handleSelect(p)}>Select</button>
          </li>
        ))}
      </ul>

      {/* ✅ Display selected photo clearly above chat */}
      {selectedPhoto && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fafafa",
            textAlign: "center",
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: 8 }}>
            🖼️ Talking about: {selectedPhoto.filename}
          </p>
          <img
            src={selectedPhoto.public_url}
            alt="Selected"
            style={{
              maxWidth: "100%",
              maxHeight: 300,
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* ✅ Chat messages */}
      <div
        style={{
          marginTop: 20,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 10,
          maxHeight: 400,
          overflowY: "auto",
          background: "#fff",
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === "user" ? "right" : "left", marginBottom: 8 }}>
            <span
              style={{
                display: "inline-block",
                background: msg.role === "user" ? "#1976D2" : "#e0e0e0",
                color: msg.role === "user" ? "white" : "black",
                padding: "6px 12px",
                borderRadius: 12,
                maxWidth: "70%",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: "#1976D2",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}