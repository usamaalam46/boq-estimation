
import { CircleHelp, LogOut, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { platformNavigation } from "../../config/navigation";
import "./AppSidebar.css";

type AppSidebarProps = {
  open: boolean;
  onClose: () => void;
  onNotice: (message: string) => void;
};

export default function AppSidebar({
  open,
  onClose,
  onNotice,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Find the navigation item matching the current URL.
  const activeItem = platformNavigation
    .filter((item) => item.path !== "/dashboard")
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
    );

  const activePage =
    activeItem?.label ??
    (location.pathname === "/dashboard" ? "Dashboard" : "");

  // Demo value; replace with API data later.
  const organizationCount = 24;

  function handleNavigate(path: string) {
    navigate(path);
    onClose();
  }

  function handleLogout() {
    localStorage.removeItem("boq_access_token");
    onClose();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="app-sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside className={`app-sidebar ${open ? "is-open" : ""}`}>
        <div className="app-brand">
          <div className="app-brand-logo">B</div>

          <div className="app-brand-copy">
            <strong>BOQ Estimation</strong>
            <span>PLATFORM</span>
          </div>

          <button
            type="button"
            className="app-mobile-close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="app-sidebar-label">WORKSPACE</div>

        <nav className="app-navigation">
          {platformNavigation.map(({ label, path, icon: Icon }) => {
            const isActive = activePage === label;

            return (
              <button
                type="button"
                key={path}
                className={`app-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNavigate(path)}
              >
                <Icon size={18} strokeWidth={1.8} />

                <span>{label}</span>

                {label === "Organizations" && (
                  <span className="app-nav-count">
                    {organizationCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="app-sidebar-bottom">
          <div className="app-support-card">
            <div className="app-support-icon">
              <CircleHelp size={19} />
            </div>

            <strong>Need assistance?</strong>
            <p>Platform support and documentation.</p>

            <button
              type="button"
              onClick={() =>
                onNotice("Support links will be configured later.")
              }
            >
              View support <span>→</span>
            </button>
          </div>

          <div className="app-sidebar-user">
            <div className="app-avatar">SA</div>

            <div className="app-user-copy">
              <strong>Super Admin</strong>
              <span>Platform administrator</span>
            </div>

            <button
              type="button"
              className="app-icon-button"
              aria-label="Log out"
              title="Log out"
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
