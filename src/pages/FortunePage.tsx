// src/pages/FortuneCookiePage.tsx
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileContext } from "../context/ProfileContext";

export default function FortuneCookiePage() {
  const { selectedProfile, setUploadedPhotoBase64, setUploadedPhotoURL } =
    useContext(ProfileContext);
  const navigate = useNavigate();

  const [openedIndex, setOpenedIndex] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [yearReview, setYearReview] = useState<string>(
    "Loading your year in review..."
  );

  const [completedCookies, setCompletedCookies] = useState<number[]>([]);
  const [previousPhotoURL, setPreviousPhotoURL] = useState<string | null>(null);
  const [conversationSummary, setConversationSummary] = useState<string | null>(
    null
  );

  const API_BASE = `${import.meta.env.VITE_API_BASE}/api/gpt4v`;

  const cookies = [
    { label: "Fortune Cookie 1", message: "Some calm moments hide entire stories. Find a picture that feels like silence — maybe a window view, a cup of tea, or a quiet sky. Let’s see what peace looks like for you." },
    { label: "Fortune Cookie 2", message: "Every color holds a memory. Show me an image whose colors remind you of warmth, nostalgia, or joy — even if you can’t explain why." },
    { label: "Fortune Cookie 3", message: "Sometimes our feelings look like mess — and that’s okay. Upload an image that feels a little wild, imperfect, or full of energy. I’ll help you find the meaning in its movement." },
    { label: "Fortune Cookie 4", message: "Beauty often hides in the smallest gestures. Maybe it’s a hand on a shoulder, an old note, or something that reminds you of care. Share a picture that holds quiet affection." },
    { label: "Fortune Cookie 5", message: "Every dream leaves a visual echo. Pick an image that feels like something between waking and sleeping — soft light, reflections, shadows, or surreal forms." },
    { label: "Fortune Cookie 6", message: "Curiosity is the start of connection. Upload something that sparks your curiosity — a texture, a place, or an object that makes you pause and look closer." },
    { label: "Fortune Cookie 7", message: "Change is a kind of art. Show me an image that captures transformation — a sunrise, falling leaves, or something that reminds you that nothing stays still forever." },
    { label: "Fortune Cookie 8", message: "Every shadow has its story. Find a picture where light and dark meet — a play of contrast that feels like emotion made visible." },
    { label: "Fortune Cookie 9", message: "Wonder often hides in the ordinary. Capture something familiar — a street corner, a favorite object, a passing glance — and let’s look at it as if for the first time." },
    { label: "Fortune Cookie 10", message: "Your perspective is a poem. Share an image that feels like your way of seeing — something only you would notice, something quietly yours." },
  ];

  const handleCookieClick = (index: number) => {
    setOpenedIndex(index === openedIndex ? null : index);
    setFile(null);
    setReply("");

    if (selectedProfile != null) {
      const savedPhoto = localStorage.getItem(
        `previousPhotoURL_${selectedProfile}_${index}`
      );
      const savedSummary = localStorage.getItem(
        `conversationSummary_${selectedProfile}_${index}`
      );

      setPreviousPhotoURL(savedPhoto || null);
      setConversationSummary(savedSummary || null);
    }
  };

  useEffect(() => {
    if (!selectedProfile) return;
    const saved = localStorage.getItem(`completedCookies_${selectedProfile}`);
    if (saved) {
      setCompletedCookies(JSON.parse(saved));
    } else {
      setCompletedCookies([]);
    }
  }, [selectedProfile]);

  useEffect(() => {
    if (!selectedProfile) return;

    const fetchYearReview = async () => {
      try {
        const formData = new FormData();
        formData.append("profile", selectedProfile);

        const res = await fetch(`${API_BASE}/year_in_review`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setYearReview(data.reply || "No highlights yet — start your journey!");
      } catch {
        setYearReview("⚠️ Could not load year-in-review.");
      }
    };

    fetchYearReview();
  }, [selectedProfile]);

  const handleUpload = async () => {
    if (!file || !selectedProfile) {
      alert("Select a profile and image first!");
      return;
    }

    setLoading(true);

    try {
      const toBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const base64 = await toBase64(file);
      setUploadedPhotoBase64(base64);
      localStorage.setItem("uploadedPhotoBase64", base64);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(
        `${API_BASE}/upload?profile=${encodeURIComponent(selectedProfile)}`,
        { method: "POST", body: formData }
      );

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const filename = uploadData.filename;

      if (uploadData.public_url) {
        setUploadedPhotoURL(uploadData.public_url);
        localStorage.setItem("uploadedPhotoURL", uploadData.public_url);

        if (openedIndex !== null) {
          localStorage.setItem(
            `previousPhotoURL_${selectedProfile}_${openedIndex}`,
            uploadData.public_url
          );
        }
      }

      const selectRes = await fetch(
        `${API_BASE}/select?profile=${encodeURIComponent(
          selectedProfile
        )}&image_name=${encodeURIComponent(filename)}`,
        { method: "POST" }
      );

      const data = await selectRes.json();

      if (data.auto_reply) {
        const initialChat = [
          { role: "user", content: "Let's talk about this photo." },
          { role: "assistant", content: data.auto_reply },
        ];

        localStorage.setItem("initialChat", JSON.stringify(initialChat));
      }

      // ✅ Save full conversation summary
      if (data.conversation_summary && openedIndex !== null) {
        localStorage.setItem(
          `conversationSummary_${selectedProfile}_${openedIndex}`,
          data.conversation_summary
        );
        setConversationSummary(data.conversation_summary);
      }

      if (openedIndex !== null) {
        const updated = Array.from(new Set([...completedCookies, openedIndex]));
        setCompletedCookies(updated);

        localStorage.setItem(
          `completedCookies_${selectedProfile}`,
          JSON.stringify(updated)
        );
      }

      navigate("/chat");
    } catch (err) {
      console.error(err);
      setReply("⚠️ Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProfile)
    return <p style={{ padding: 20 }}>⚠️ Please select a profile first.</p>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        background: "linear-gradient(180deg, #fff7f3 0%, #ffe7e0 100%)",
        minHeight: "100vh",
        fontFamily: "Rubik, sans-serif",
        color: "#3b2a28",
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          flex: "1 1 70%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: 30,
            color: "#e25b45",
            textShadow: "0 2px 10px rgba(226,91,69,0.25)",
          }}
        >
          🥠 Pick a Fortune Cookie
        </h1>

        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {cookies.map((_, index) => (
            <div
              key={index}
              onClick={() => handleCookieClick(index)}
              style={{
                backgroundColor: openedIndex === index ? "#e25b45" : "#fff0ec",
                borderRadius: 14,
                width: 150,
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: openedIndex === index ? "scale(1.05)" : "scale(1)",
                boxShadow:
                  openedIndex === index
                    ? "0 0 15px rgba(226,91,69,0.4)"
                    : "0 4px 10px rgba(0,0,0,0.1)",
                color: openedIndex === index ? "#fff" : "#7a4b3d",
              }}
            >
              {completedCookies.includes(index)
                ? "✓ Completed"
                : openedIndex === index
                ? "🍪 Opened!"
                : "🥠 Click Me"}
            </div>
          ))}
        </div>

        {openedIndex !== null && (
          <div
            style={{
              backgroundColor: "#fff6f2",
              borderRadius: 14,
              padding: 25,
              width: "100%",
              maxWidth: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginBottom: 15, color: "#d6523a" }}>
              Your Fortune Awaits 🍀
            </h2>

            <textarea
              value={cookies[openedIndex].message}
              readOnly
              style={{
                width: "100%",
                height: 100,
                borderRadius: 10,
                padding: 12,
                border: "1px solid #ffd4c9",
                backgroundColor: "#fff0ec",
                color: "#8b4f3d",
                marginBottom: 20,
                resize: "none",
                fontSize: "1rem",
                lineHeight: 1.6,
              }}
            />

            {previousPhotoURL && (
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#7a4b3d",
                    marginBottom: 8,
                  }}
                >
                  Previously used photo:
                </p>
                <img
                  src={previousPhotoURL}
                  alt="Previous"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            )}

            {conversationSummary && (
              <div
                style={{
                  backgroundColor: "#ffe9e2",
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 20,
                  width: "100%",
                  color: "#5a3b32",
                }}
              >
                <b>Last Conversation Summary:</b>
                <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                  {conversationSummary}
                </p>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
                alignItems: "center",
                width: "100%",
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  border: "1px solid #f5b8a5",
                  color: "#5a3b32",
                }}
              />

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#e25b45",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 500,
                  boxShadow: "0 4px 12px rgba(226,91,69,0.3)",
                  transition: "all 0.25s ease",
                }}
              >
                {loading ? "Uploading..." : "Upload & Open Chat"}
              </button>
            </div>

            {reply && (
              <div
                style={{
                  backgroundColor: "#ffe9e2",
                  borderRadius: 10,
                  padding: 15,
                  width: "100%",
                  maxHeight: 300,
                  overflowY: "auto",
                  color: "#5a3b32",
                }}
              >
                <p>
                  <b>System:</b> {reply}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          flex: "0 0 30%",
          background: "linear-gradient(135deg, #fff0eb, #ffe5dd)",
          borderLeft: "2px solid #ffd3c8",
          padding: "24px",
          overflowY: "auto",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            color: "#e25b45",
            marginBottom: "12px",
            fontWeight: 700,
            fontSize: "1.4rem",
          }}
        >
          🌟 Year In Review
        </h2>

        <p
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            color: "#5c4033",
            fontSize: "1rem",
          }}
        >
          {yearReview}
        </p>
      </div>
    </div>
  );
}