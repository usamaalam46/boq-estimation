
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import disciplineRoutes from "./discipline.routes.js"
import CategoryRoutes from "./category.routes.js"
import UnitRoutes from  "./unit.routes.js"
import CatalogueItemRoutes  from "./catalogue-item.routes.js"
import OrganizationRoutes  from "../routes/organization.routes.js";
import ProjectRoutes from "../routes/project.routes.js"
import EstimateRoutes from "../routes/estimate.routes.js";
import RolePremissionRoues from "../routes/role-management.routes.js"
const router = Router();

// Authentication endpoints
router.use("/auth", authRoutes);
router.use("/discipline", disciplineRoutes);
router.use("/category",CategoryRoutes)
router.use("/unit",UnitRoutes)
router.use("/catalogue",CatalogueItemRoutes)
// Add more route groups here later:
router.use("/organization", OrganizationRoutes);
router.use("/estimates", EstimateRoutes);
router.use("/projects", ProjectRoutes);
router.use("/roles-premission", RolePremissionRoues);
// router.use("/users", userRoutes);

export default router;
