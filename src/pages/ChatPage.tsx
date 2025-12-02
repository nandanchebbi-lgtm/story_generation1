// src/pages/ChatPage.tsx
import { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { ProfileContext } from "../context/ProfileContext";

/** Normalize backend image URL (LAN + Docker safe) */
function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_BASE.replace(/\/api$/, "");
  return `${apiBase}/${url.replace(/^\/+/, "")}`;
}

export default function ChatPage() {
  const { selectedProfile, uploadedPhotoURL } = useContext(ProfileContext);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const API_BASE = `${import.meta.env.VITE_API_BASE}/api/gpt4v`;

  /** Load uploaded image URL (public URL for display) */
  useEffect(() => {
    if (uploadedPhotoURL) {
      setImageUrl(normalizeImageUrl(uploadedPhotoURL));
    }
  }, [uploadedPhotoURL]);

  /** Load initial messages (from Fortune Page) */
  useEffect(() => {
    const stored = localStorage.getItem("initialChat");
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (err) {
        console.error("Initial chat parse error:", err);
      } finally {
        localStorage.removeItem("initialChat");
      }
    }
  }, []);

  /** Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Send message */
  const handleSend = async () => {
    if (!input.trim() || !selectedProfile) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const form = new FormData();
      form.append("profile", selectedProfile);
      form.append("user_message", input);

      // ⭐ NEW: Send the displayed image to GPT so it can "see" it
      if (imageUrl) {
        const imgRes = await fetch(imageUrl);
        const imgBlob = await imgRes.blob();
        form.append("image", imgBlob, "photo.jpg");
      }

      const res = await axios.post(`${API_BASE}/chat`, form);
      const reply = res.data.reply || "⚠️ No response from server.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Failed to send message." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Year-in-Review button */
  const handleYearInReview = async () => {
    if (!selectedProfile) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "✨ Show me my year in review!" },
    ]);

    try {
      const form = new FormData();
      form.append("profile", selectedProfile);

      const res = await axios.post(`${API_BASE}/year_in_review`, form);
      const reply = res.data.reply || "⚠️ No review available.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Unable to load review.",
        },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  if (!selectedProfile)
    return <p style={{ padding: 20 }}>⚠️ Select a profile first.</p>;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "linear-gradient(180deg, #fff7f3 0%, #ffe7e0 100%)",
        fontFamily: "Rubik, sans-serif",
        color: "#3b2a28",
      }}
    >
      {/* LEFT: image panel */}
      <div
        style={{
          flex: 1,
          borderRight: "1px solid #ffd4c9",
          backgroundColor: "#fff6f2",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Selected"
            style={{
              maxWidth: "85%",
              maxHeight: "85%",
              borderRadius: "16px",
              objectFit: "contain",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            }}
          />
        ) : (
          <p style={{ color: "#c27b6b" }}>No image selected yet.</p>
        )}
      </div>

      {/* RIGHT: chat panel */}
      <div style={{ flex: 1.5, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            backgroundColor: "#e25b45",
            color: "white",
            padding: "16px 24px",
            fontSize: "1.2rem",
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          }}
        >
          <span>💬 Chat with Your Visual Companion</span>
          <button
            onClick={handleYearInReview}
            style={{
              backgroundColor: "white",
              color: "#e25b45",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "0.25s",
            }}
          >
            Year in Review
          </button>
        </div>

        {/* Chat area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            backgroundColor: "#fff7f3",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor:
                  msg.role === "user" ? "#e25b45" : "#fff0ec",
                color: msg.role === "user" ? "white" : "#3b2a28",
                padding: "12px 16px",
                borderRadius: "16px",
                maxWidth: "80%",
                lineHeight: 1.6,
                boxShadow:
                  msg.role === "user"
                    ? "0 4px 12px rgba(255,253,252,1)"
                    : "0 3px 8px rgba(0,0,0,0.1)",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            display: "flex",
            padding: 16,
            backgroundColor: "#fff6f2",
            borderTop: "1px solid #ffd4c9",
            gap: 10,
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #f5b8a5",
              backgroundColor: "white",
              fontSize: "1rem",
              outline: "none",
              color: "#3b2a28",
            }}
          />

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#f3b5aa" : "#e25b45",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 10px rgba(226,91,69,0.3)",
              transition: "0.2s",
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}