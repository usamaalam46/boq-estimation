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

const TOKEN_KEY = "boq_access_token";

function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

function ProtectedRoute() {
  const token = localStorage.getItem("boq_access_token");

  if (!token) {
    alert("now")
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
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
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/estimate-builder" element={<EstimateBuilder />} />
          <Route path="/estimates/:estimateId/edit" element={<EstimateEdit />} />
          <Route path="/disciplines" element={<Disciplines />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/units" element={<Units />} />
          <Route path="/global-boq-catalogue" element={<CatalogueItems />} />
          {/* <Route path="/settings" element={<EstimateBuilder />} /> */}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
