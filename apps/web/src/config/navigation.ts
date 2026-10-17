
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Calculator,
  Settings,
} from "lucide-react";

export const platformNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Organizations",
    path: "/organizations",
    icon: Building2,
  },
  {
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Estimates",
    path: "/estimates",
    icon: Calculator,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];
