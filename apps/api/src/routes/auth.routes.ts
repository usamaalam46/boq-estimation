
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

// POST /api/auth/login
router.post("/login", authController.login);

// GET /api/auth/me will be added when token authentication middleware is ready.
// POST /api/auth/logout can be added when the token/session strategy is finalized.

export default router;
