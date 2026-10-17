import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import WorkspacePage from "../pages/workspace/WorkspacePage";
import AppLayout from "../layouts/AppLayout";

const TOKEN_KEY = "boq_access_token";

function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestRoute() {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated() ? "/dashboard" : "/login"}
            replace
          />
        }
      />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/organizations" element={<WorkspacePage />} />
          <Route path="/projects" element={<WorkspacePage />} />
          <Route path="/estimates" element={<WorkspacePage />} />
          <Route path="/settings" element={<WorkspacePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
