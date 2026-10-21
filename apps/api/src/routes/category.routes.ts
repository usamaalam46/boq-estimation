
import { Router } from "express";
import { categoryController } from "../controllers/category.controller.js";

const router = Router();

router.get("/", categoryController.index);
router.get("/:id", categoryController.show);
router.post("/", categoryController.store);
router.put("/:id", categoryController.update);
router.patch("/:id/status", categoryController.updateStatus);
router.delete("/:id", categoryController.destroy);

export default router;
