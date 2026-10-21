import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import AppLayout from "../layouts/AppLayout";
import Organizations from "../pages/organizations/Organizations";
import Projects from "../pages/projects/Projects";
import Estimates from "../pages/estimates/Estimates";
import EstimateBuilder from "../pages/estimates/EstimateBuilder";
import Disciplines from "../pages/disciplines/Disciplines";
import Categories from "../pages/categories/Categories";
import Units from "../pages/units/Units";
import CatalogueItems from "../pages/catalogue-items/CatalogueItems";
import EstimateEdit from "../pages/estimates/EstimateEdit";
import RolesPermissions from "../pages/roles-permissions/RolesPermissions";
import Profile from "../pages/profile/Profile";
import { useAuthStore } from "../store/authStore";

const TOKEN_KEY = "boq_access_token";

function AuthInitializer() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return null;
}

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (isLoading || !isInitialized) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated || !localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function GuestRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (isLoading || !isInitialized) {
    return <div className="app-loading">Loading...</div>;
  }

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Outlet />;
}

function RolesPermissionsRoute() {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const canManageAnyOrganization = useAuthStore((state) => {
    const user = state.user;
    if (!user) return false;

    return user.memberships.some((membership) =>
      membership.role.permissions.includes("organization.roles.manage")
    );
  });

  if (!isSuperAdmin && !canManageAnyOrganization) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <RolesPermissions />;
}

function Unauthorized() {
  return (
    <section className="unauthorized-page">
      <h1>Access denied</h1>
      <p>You do not have permission to access this page.</p>
      <a href="/dashboard">Return to dashboard</a>
    </section>
  );
}

export default function AppRoutes() {
  return (
    <>
      <AuthInitializer />
      <Routes>
      <Route path="/" element={<Navigate to={localStorage.getItem(TOKEN_KEY) ? "/dashboard" : "/login"} replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/estimate-builder" element={<EstimateBuilder />} />
          <Route path="/estimates/:estimateId/edit" element={<EstimateEdit />} />
          <Route path="/disciplines" element={<Disciplines />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/roles-permissions" element={<RolesPermissionsRoute />} />
          <Route path="/units" element={<Units />} />
          <Route path="/global-boq-catalogue" element={<CatalogueItems />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
