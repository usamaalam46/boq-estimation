
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  FolderKanban,
  Calculator,
  ClipboardList,
  BookOpen,
  Layers3,
  FolderTree,
  Ruler,
  PackageSearch,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  platformOnly?: boolean;
}

export const platformNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    requiredPermissions: [
      "platform.dashboard.view",
      "organization.dashboard.view",
    ],
  },
  {
    label: "Organizations",
    path: "/organizations",
    icon: Building2,
    requiredPermissions: ["platform.organizations.view"],
    platformOnly: true,
  },
  {
    label: "Platform Users",
    path: "/platform-users",
    icon: Users,
    requiredPermissions: ["platform.users.view"],
    platformOnly: true,
  },
  {
    label: "Roles & Permissions",
    path: "/roles-permissions",
    icon: ShieldCheck,
    requiredPermissions: [
      "platform.roles.manage",
      "platform.permissions.manage",
      "organization.roles.manage",
    ],
  },
  {
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    requiredPermissions: ["projects.view"],
  },
  {
    label: "BOQ Estimates",
    path: "/estimates",
    icon: Calculator,
    requiredPermissions: ["estimates.view"],
  },
  {
    label: "Estimate Builder",
    path: "/estimate-builder",
    icon: ClipboardList,
    requiredPermissions: ["estimates.create"],
  },
  {
    label: "Disciplines",
    path: "/disciplines",
    icon: Layers3,
    requiredPermissions: ["platform.catalogue.manage"],
    platformOnly: true,
  },
  {
    label: "Categories",
    path: "/categories",
    icon: FolderTree,
    requiredPermissions: ["platform.catalogue.manage"],
    platformOnly: true,
  },
  {
    label: "Units",
    path: "/units",
    icon: Ruler,
    requiredPermissions: ["platform.catalogue.manage"],
    platformOnly: true,
  },
  {
    label: "Global BOQ Catalogue",
    path: "/global-boq-catalogue",
    icon: PackageSearch,
    requiredPermissions: ["platform.catalogue.manage"],
    platformOnly: true,
  },
  {
    label: "My Profile",
    path: "/profile",
    icon: UserRound,
  },
];

export const estimatePermissions = {
  view: "estimates.view",
  create: "estimates.create",
  edit: "estimates.edit",
  delete: "estimates.delete",
} as const;
