import { Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import ChatPage from "./pages/ChatPage";
import ProfilesPage from "./pages/ProfilesPage";
import ProfilePage from "./pages/ProfilePage";
import GraphPage from "./pages/GraphPage";
import LandingPage from "./pages/LandingPage";
import FortuneCookiePage from "./pages/FortunePage";
import HowToUsePage from "./pages/HowToUsePage";

// Layout component with Navbar
function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen w-full bg-black text-white">
      <Navbar />
      <div className="flex-1 w-full p-4">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Landing page (no Navbar) */}
      <Route path="/" element={<LandingPage />} />

      {/* HowToUse page */}
      <Route path="/how-to-use" element={<HowToUsePage />} />

      {/* Pages with Navbar */}
      <Route element={<AppLayout />}>
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="profiles/:id" element={<ProfilePage />} />
        <Route path="cookies" element={<FortuneCookiePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="graph" element={<GraphPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}