
import { CircleHelp, LogOut, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { platformNavigation } from "../../config/navigation";
import "./AppSidebar.css";

type AppSidebarProps = {
  activePage?: string;
  organizationCount?: number;
  open: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
  onNotice: (message: string) => void;
};

export default function AppSidebar({
  activePage,
  organizationCount = 0,
  open,
  onClose,
  onNavigate,
  onNotice,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const isSuperAdmin =
    user?.platformRoles.some(
      (role) => role.code.toLowerCase() === "super_admin"
    ) ?? false;

  const visibleNavigation = platformNavigation.filter((item) => {
    if (item.platformOnly && !isSuperAdmin) return false;

    if (!item.requiredPermissions?.length) return true;

    return item.requiredPermissions.some((permission) =>
      hasPermission(permission)
    );
  });

  const currentMembership = user?.memberships[0];

  const roleName = isSuperAdmin
    ? "Platform administrator"
    : currentMembership?.role.name ?? "Organization user";

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") ?? "U";

  function handleNavigate(label: string, path: string) {
    if (onNavigate) {
      onNavigate(label);
    } else {
      navigate(path);
    }

    onClose();
  }

  function handleLogout() {
    localStorage.removeItem("boq_access_token");
    clearAuth();
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
          {visibleNavigation.map(({ label, path, icon: Icon }) => {
            const isActive = activePage
              ? activePage === label
              : location.pathname === path ||
              location.pathname.startsWith(`${path}/`);

            return (
              <button
                type="button"
                key={path}
                className={`app-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNavigate(label, path)}
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
            <div className="app-avatar">{initials}</div>

            <div className="app-user-copy">
              <strong>{user?.name ?? "Loading user..."}</strong>
              <span>{roleName}</span>
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
