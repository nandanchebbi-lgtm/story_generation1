import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { ProfileContext } from "../context/ProfileContext";

export default function ChatPage() {
  const { selectedProfile, uploadedPhoto } = useContext(ProfileContext);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const API_BASE = "http://127.0.0.1:8000/api/gpt4v";

  // ✅ Load any initial messages (e.g. from FortunePage)
  useEffect(() => {
    const stored = localStorage.getItem("initialChat");
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse initial chat:", err);
      } finally {
        localStorage.removeItem("initialChat");
      }
    }
  }, []);

  // ✅ Auto-scroll to bottom when new messages appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send chat message
  const handleSend = async () => {
    if (!input.trim()) return;
    if (!selectedProfile) {
      alert("Please select a profile first.");
      return;
    }

    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("profile", selectedProfile);
      formData.append("user_message", input);

      const res = await axios.post(`${API_BASE}/chat`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.reply || "⚠️ No reply received from GPT.",
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ There was an error sending your message. Please check the console or backend logs.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  // ✅ Handle Year in Review
  const handleYearInReview = async () => {
    if (!selectedProfile) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "✨ Show me my year in review!" },
    ]);

    try {
      const formData = new FormData();
      formData.append("profile", selectedProfile);

      const res = await axios.post(`${API_BASE}/year_in_review`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);
    } catch (err) {
      console.error("Year in Review error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Failed to generate year in review. Please try again later.",
        },
      ]);
    }
  };

  if (!selectedProfile)
    return (
      <p style={{ padding: 20 }}>⚠️ Please select a profile first from the main page.</p>
    );

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
      {/* LEFT SIDE — Display the uploaded image */}
      <div
        style={{
          flex: 1,
          borderRight: "1px solid #ffd4c9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff6f2",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {uploadedPhoto ? (
          <img
            src={uploadedPhoto}
            alt="Selected visual"
            style={{
              maxWidth: "85%",
              maxHeight: "85%",
              borderRadius: "16px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              objectFit: "contain",
            }}
          />
        ) : (
          <p style={{ color: "#c27b6b" }}>No image selected yet.</p>
        )}
      </div>

      {/* RIGHT SIDE — Chat interface */}
      <div
        style={{
          flex: 1.5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#e25b45",
            color: "white",
            padding: "16px 24px",
            fontSize: "1.2rem",
            fontWeight: "500",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>💬 Chat with Your Visual Companion</span>
          <button
            onClick={handleYearInReview}
            style={{
              backgroundColor: "white",
              color: "#e25b45",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
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
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            backgroundColor: "#fff7f3",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "#e25b45" : "#fff0ec",
                color: msg.role === "user" ? "white" : "#3b2a28",
                padding: "12px 16px",
                borderRadius: "16px",
                maxWidth: "80%",
                lineHeight: 1.6,
                boxShadow:
                  msg.role === "user"
                    ? "0 4px 12px rgba(255, 253, 252, 1)"
                    : "0 3px 8px rgba(0,0,0,0.1)",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            display: "flex",
            padding: "16px",
            borderTop: "1px solid #ffd4c9",
            backgroundColor: "#fff6f2",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #f5b8a5",
              backgroundColor: "white",
              color: "black",
              fontSize: "1rem",
              outline: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          />

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#f3b5aa" : "#e25b45",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 10px rgba(226,91,69,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}