
import { Menu, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";
import { platformNavigation } from "../../config/navigation";
import "./AppHeader.css";


type AppHeaderProps = {
  onMenuClick: () => void;
  onNotice: (message: string) => void;
};

export default function AppHeader({
  onMenuClick,
  onNotice,
}: AppHeaderProps) {
  const location = useLocation();

  const activeItem = [...platformNavigation]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
    );

  const pageTitle =
    activeItem?.label ??
    (location.pathname === "/" ? "Dashboard" : "Workspace");

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="app-icon-button app-menu-button"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>

        <div className="app-header-title">
          <span>Platform / Workspace</span>
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="app-header-actions">
        <span className="app-environment">Demo environment</span>

        <button
          type="button"
          className="app-icon-button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => onNotice("Notifications will be configured later.")}
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
