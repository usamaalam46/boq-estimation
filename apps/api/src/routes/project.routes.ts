import { Router } from "express";
import { ProjectsController } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePlatformPermission } from "../middleware/authorize.js";
const router = Router();

router.use(authenticate);

router.get("/", ProjectsController.index);
router.post("/", ProjectsController.store);
router.put("/:id", ProjectsController.update);
router.delete("/:id", ProjectsController.destroy);

export default router;