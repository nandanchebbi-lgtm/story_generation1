import React, { useEffect, useState } from "react";

interface YearInReviewPanelProps {
  messages: { role: string; content: string }[];
  profile: string | null;
}

export default function YearInReviewPanel({ messages, profile }: YearInReviewPanelProps) {
  const [summary, setSummary] = useState("Loading your year-in-review...");

  // Fetch updated summary whenever messages change
  useEffect(() => {
    if (!profile || messages.length === 0) return;

    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/yearinreview?profile=${profile}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });

        const data = await res.json();
        setSummary(data.summary || "No highlights yet — keep chatting!");
      } catch (err) {
        console.error("YearInReview fetch failed:", err);
        setSummary("⚠️ Could not load review. Try again later.");
      }
    };

    fetchSummary();
  }, [messages, profile]);

  return (
    <div
      style={{
        flex: "0 0 30%",
        background: "linear-gradient(135deg, #fff0eb, #ffe5dd)",
        borderLeft: "2px solid #ffd3c8",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "20px 0 0 20px",
        boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
        overflowY: "auto",
        fontFamily: "Rubik, sans-serif",
      }}
    >
      <h2 style={{ color: "#e25b45", marginBottom: "10px", fontWeight: 700 }}>
        🌟 Year In Review
      </h2>
      <p style={{ color: "#5c4033", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
        {summary}
      </p>
    </div>
  );
}