import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ChatPage from "./pages/ChatPage";
import PhotosPage from "./pages/PhotosPage";
import ProfilesPage from "./pages/ProfilesPage";
import GraphPage from "./pages/GraphPage";
import LandingPage from "./pages/LandingPage";
import FortuneCookiePage from "./pages/FortunePage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Routes>
        {/* Landing Page (no Navbar) */}
        <Route path="/" element={<LandingPage />} />

        {/* All other pages include Navbar */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen w-full bg-black text-white">
              <Navbar />
              <div className="flex-1 w-full p-4">
                <Routes>
                  <Route path="/profiles" element={<ProfilesPage />} />
                  <Route path="/fortune" element={<FortuneCookiePage />} />
                  <Route path="/photos" element={<PhotosPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/graph" element={<GraphPage />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}