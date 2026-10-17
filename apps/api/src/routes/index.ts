
import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

// Authentication endpoints
router.use("/auth", authRoutes);

// Add more route groups here later:
// router.use("/organizations", organizationRoutes);
// router.use("/projects", projectRoutes);
// router.use("/users", userRoutes);

export default router;
