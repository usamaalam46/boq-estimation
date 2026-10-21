import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/auth/login
router.post("/login", authController.login);
// Protected endpoints
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

export default router;
