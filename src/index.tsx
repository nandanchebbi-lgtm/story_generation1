import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { ProfileProvider } from "./context/ProfileContext";

<ProfileProvider>
  <App />
</ProfileProvider>


const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);