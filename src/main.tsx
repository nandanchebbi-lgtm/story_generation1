// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
// ✅ Context providers
import { AppProvider } from "./context/AppContext"; // app-wide state
import { ProfileProvider } from "./context/ProfileContext"; // profile-specific state

// ✅ Global styles
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Outer provider for app-wide shared state */}
      <AppProvider>
        {/* Nested provider for profile-related state */}
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);