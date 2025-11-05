// src/components/ProfilePanel.tsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfiles, createProfile, deleteProfile, selectProfile } from "../api/profiles";
import { ProfileContext } from "../context/ProfileContext";

interface Profile {
  name: string;
  // add more fields if your API returns them
}

const ProfilePanel: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfile, setNewProfile] = useState("");
  const { selectedProfile, setSelectedProfile } = useContext(ProfileContext);
  const navigate = useNavigate(); // ✅ for redirecting to cookie page

  // Load profiles from backend
  const loadProfiles = async () => {
    try {
      const data: Profile[] = await fetchProfiles();
      setProfiles(data);
    } catch (err) {
      console.error("Failed to fetch profiles", err);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Create a new profile
  const handleCreate = async () => {
    if (!newProfile.trim()) return;
    try {
      await createProfile(newProfile.trim());
      setNewProfile("");
      loadProfiles();
    } catch (err) {
      console.error("Failed to create profile", err);
    }
  };

  // Delete an existing profile
  const handleDelete = async (name: string) => {
    try {
      await deleteProfile(name);
      if (selectedProfile === name) setSelectedProfile(null);
      loadProfiles();
    } catch (err) {
      console.error("Failed to delete profile", err);
    }
  };

  // Select a profile and go to fortune cookie page
  const handleSelect = async (name: string) => {
    try {
      await selectProfile(name);
      setSelectedProfile(name);
      console.log(`[PROFILE] Selected: ${name}`);
      navigate("/fortune-cookie"); // ✅ Redirect user to fortune cookie page
    } catch (err) {
      console.error("Failed to select profile", err);
    }
  };

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-2">Profiles</h2>

      {/* Create profile */}
      <div className="mb-4 flex">
        <input
          type="text"
          placeholder="New profile name"
          value={newProfile}
          onChange={(e) => setNewProfile(e.target.value)}
          className="border p-1 mr-2 flex-1"
        />
        <button
          onClick={handleCreate}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Create
        </button>
      </div>

      {/* List profiles */}
      <ul>
        {profiles.map((p) => (
          <li
            key={p.name}
            className={`flex justify-between items-center mb-2 p-1 rounded ${
              selectedProfile === p.name ? "bg-green-100" : ""
            }`}
          >
            <span>{p.name}</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleSelect(p.name)}
                className="bg-green-500 text-white px-2 py-1 rounded"
              >
                Select
              </button>
              <button
                onClick={() => handleDelete(p.name)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {selectedProfile && (
        <div className="mt-4 text-sm text-gray-600">
          Selected Profile: <strong>{selectedProfile}</strong>
        </div>
      )}
    </div>
  );
};

export default ProfilePanel;