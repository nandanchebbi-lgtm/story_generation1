// src/components/ProfilePanel.tsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProfiles,
  createProfile,
  deleteProfile,
  selectProfile,
} from "../api/profiles";
import { ProfileContext } from "../context/ProfileContext";

interface Profile {
  name: string;
}

const ProfilePanel: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfile, setNewProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedProfile, setSelectedProfile } = useContext(ProfileContext);
  const navigate = useNavigate();

  // Load profiles from backend
  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Profile[] = await fetchProfiles();
      setProfiles(data);
    } catch (err: any) {
      console.error("Failed to fetch profiles", err);
      setError("Failed to fetch profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Create a new profile
  const handleCreate = async () => {
    if (!newProfile.trim()) return;
    setError(null);
    try {
      await createProfile(newProfile.trim());
      setNewProfile("");
      await loadProfiles();
    } catch (err: any) {
      console.error("Failed to create profile", err);
      setError(err?.message || "Failed to create profile");
    }
  };

  // Delete an existing profile
  const handleDelete = async (name: string) => {
    setError(null);
    try {
      await deleteProfile(name);
      if (selectedProfile === name) setSelectedProfile(null);
      await loadProfiles();
    } catch (err: any) {
      console.error("Failed to delete profile", err);
      setError(err?.message || "Failed to delete profile");
    }
  };

  // Select a profile and redirect
  const handleSelect = async (name: string) => {
    setError(null);
    try {
      await selectProfile(name);
      setSelectedProfile(name);
      console.log(`[PROFILE] Selected: ${name}`);
      navigate("/fortune-cookie");
    } catch (err: any) {
      console.error("Failed to select profile", err);
      setError(err?.message || "Failed to select profile");
    }
  };

  return (
    <div className="p-4 border rounded shadow bg-white">
      <h2 className="text-xl font-bold mb-4">Profiles</h2>

      {/* Create profile */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New profile name"
          value={newProfile}
          onChange={(e) => setNewProfile(e.target.value)}
          className="border p-1 flex-1 rounded"
        />
        <button
          onClick={handleCreate}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
        >
          Create
        </button>
      </div>

      {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}

      {/* Profiles list */}
      {loading ? (
        <p className="text-gray-500">Loading profiles...</p>
      ) : profiles.length === 0 ? (
        <p className="text-gray-500">No profiles yet. Create one above!</p>
      ) : (
        <ul>
          {profiles.map((p) => (
            <li
              key={p.name}
              className={`flex justify-between items-center mb-2 p-2 rounded ${
                selectedProfile === p.name ? "bg-green-100" : "bg-gray-50"
              }`}
            >
              <span>{p.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelect(p.name)}
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition"
                >
                  Select
                </button>
                <button
                  onClick={() => handleDelete(p.name)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedProfile && (
        <div className="mt-4 text-sm text-gray-600">
          Selected Profile: <strong>{selectedProfile}</strong>
        </div>
      )}
    </div>
  );
};

export default ProfilePanel;