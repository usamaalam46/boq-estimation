
import { Router } from "express";
import { unitController } from "../controllers/unit.controller.js";

const router = Router();

router.get("/", unitController.index);
router.get("/:id", unitController.show);
router.post("/", unitController.store);
router.put("/:id", unitController.update);
router.patch("/:id/status", unitController.updateStatus);
router.delete("/:id", unitController.destroy);

export default router;
