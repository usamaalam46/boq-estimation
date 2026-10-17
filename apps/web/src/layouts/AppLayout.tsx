import { useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppHeader from "../components/layout/AppHeader";
import "./AppLayout.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function showNotice(message: string) {
    setNotice(message);
  }

  return (
    <div className="app-shell">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNotice={showNotice}
      />

      <div className="app-main">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          onNotice={showNotice}
        />

        <main className="app-content">
          {notice && (
            <div className="app-notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} BOQ Estimation</span>
          <span>Plan better. Build smarter.</span>
        </footer>
      </div>
    </div>
  );
}
