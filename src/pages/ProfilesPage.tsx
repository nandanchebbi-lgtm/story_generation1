// src/pages/ProfilesPage.tsx
import React, { useEffect, useState, useContext } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProfiles,
  createProfile,
  deleteProfile,
  selectProfile,
} from "../api/profiles";
import { ProfileContext } from "../context/ProfileContext";

// ✅ Import your SVG as an image
import profileIcon from "../assets/profile_icon.svg";

// ✅ Define default avatars
const DEFAULT_AVATARS = [profileIcon, profileIcon, profileIcon, profileIcon];

export default function ProfilesPage() {
  const { selectedProfile, setSelectedProfile } = useContext(ProfileContext);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [newProfile, setNewProfile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState(false);
  const [openedProfile, setOpenedProfile] = useState<string | null>(null);
  const navigate = useNavigate();

  interface Profile {
    name: string;
  }

  const loadProfiles = async () => {
    try {
      setError(null);
      setLoading(true);
      const data: Profile[] = await fetchProfiles();
      setProfiles(data.map((p: Profile) => p.name));
    } catch (err) {
      console.error("[ProfilesPage] Failed to fetch profiles:", err);
      setError("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    const savedProfile = localStorage.getItem("activeProfile");
    if (savedProfile) setSelectedProfile(savedProfile);
  }, []);

  const handleCreate = async () => {
    if (!newProfile.trim()) return;
    try {
      setLoading(true);
      const profileName = await createProfile(newProfile.trim());
      setSelectedProfile(profileName);
      localStorage.setItem("activeProfile", profileName);
      setNewProfile("");
      await loadProfiles();
      setShowCreate(false);
      navigate("/fortune");
    } catch (err) {
      console.error(err);
      setError("Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      setLoading(true);
      await deleteProfile(name);
      if (selectedProfile === name) {
        setSelectedProfile(null);
        localStorage.removeItem("activeProfile");
      }
      await loadProfiles();
    } catch (err) {
      console.error(err);
      setError("Failed to delete profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (name: string) => {
    try {
      setLoading(true);
      const profileName = await selectProfile(name);
      setSelectedProfile(profileName);
      localStorage.setItem("activeProfile", profileName);
      navigate("/fortune");
    } catch (err) {
      console.error(err);
      setError("Failed to select profile");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // UI
  // --------------------------
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fff4ec 0%, #ffe4dc 50%, #ffd8d0 100%)",
        color: "#3a1f1f",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        fontFamily: "Rubik, sans-serif",
        transition: "background 0.6s ease",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          marginBottom: 30,
          fontWeight: 700,
          color: "#e25b45",
          textShadow: "0 0 20px rgba(226,91,69,0.3)",
        }}
      >
        👥 Choose Your Profile
      </h1>

      {loading && (
        <p style={{ color: "#a57665", marginBottom: 20 }}>Loading profiles...</p>
      )}
      {error && (
        <div style={{ color: "#d64d3a", marginBottom: 20 }}>{error}</div>
      )}

      {/* Profiles Grid */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        {profiles.map((name, index) => (
          <div
            key={name}
            onClick={() =>
              setOpenedProfile(openedProfile === name ? null : name)
            }
            style={{
              backgroundColor:
                openedProfile === name ? "#fcd4c6" : "rgba(255,255,255,0.75)",
              borderRadius: 20,
              width: 160,
              height: 160,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.3s ease",
              transform:
                openedProfile === name ? "scale(1.05)" : "scale(1.0)",
              boxShadow:
                openedProfile === name
                  ? "0 0 20px rgba(226,91,69,0.4)"
                  : "0 2px 10px rgba(0,0,0,0.1)",
            }}
          >
            {/* ✅ Updated Avatar */}
            <img
              src={DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]}
              alt={name}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: 10,
              }}
            />

            <p style={{ fontSize: "1.1rem", color: "#3a1f1f" }}>{name}</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(name);
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(226,91,69,0.8)",
                border: "none",
                borderRadius: "50%",
                width: 26,
                height: 26,
                color: "white",
                cursor: "pointer",
              }}
            >
              ✖
            </button>
          </div>
        ))}

        {/* Add New Profile */}
        <div
          onClick={() => setShowCreate(true)}
          style={{
            backgroundColor: "rgba(255,255,255,0.7)",
            borderRadius: 20,
            width: 160,
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#b76b57",
            fontSize: "2rem",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            transform: "scale(1)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          ➕
        </div>
      </div>

      {/* Profile details when opened */}
      {openedProfile && (
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.85)",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 500,
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          }}
        >
          <h2 style={{ marginBottom: 10, color: "#d64d3a" }}>
            Welcome back,{" "}
            <span style={{ color: "#e25b45" }}>{openedProfile}</span> 👋
          </h2>
          <p style={{ color: "#7b4b3a", marginBottom: 20 }}>
            Ready to unlock today’s fortune? Let’s dive in.
          </p>
          <button
            onClick={() => handleSelect(openedProfile)}
            style={{
              padding: "10px 18px",
              backgroundColor: "#e25b45",
              border: "none",
              borderRadius: 10,
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              boxShadow: "0 0 15px rgba(226,91,69,0.3)",
              transition: "background 0.3s ease",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: 24,
              borderRadius: 16,
              width: 320,
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ marginBottom: 12, color: "#e25b45" }}>
              Create New Profile
            </h2>
            <input
              type="text"
              value={newProfile}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewProfile(e.target.value)
              }
              placeholder="Enter profile name"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #f1c4b8",
                backgroundColor: "#fff8f6",
                color: "#3a1f1f",
                marginBottom: 20,
                fontSize: "1rem",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={handleCreate}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#e25b45",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  cursor: "pointer",
                  boxShadow: "0 0 10px rgba(226,91,69,0.3)",
                }}
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                  onClick={() => setShowCreate(false)}
                  style={{
                      padding: "15px 15px",
                      backgroundColor: "transparent",
                      border: "1px solid #e25b45",
                      borderRadius: 4,
                      color: "#e25b45",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
               }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#ffe8e3")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
              Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}