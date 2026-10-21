
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppHeader from "../components/layout/AppHeader";
import { useAuthStore } from "../store/authStore";
import authService from "../services/auth.service";
import "./AppLayout.css";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("boq_access_token");

    if (!token || user) return;

    let cancelled = false;

    authService
      .me()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("boq_access_token");
          clearAuth();
          navigate("/login", { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, setUser, clearAuth, navigate]);

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
