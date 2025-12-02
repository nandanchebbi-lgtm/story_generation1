// src/pages/ProfilePage.tsx
import { useParams } from "react-router-dom";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Profile Details</h1>
      <p>Profile ID: {id}</p>
    </div>
  );
}