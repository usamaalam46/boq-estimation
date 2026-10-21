
import { Router } from "express";
import { disciplineController } from "../controllers/discipline.controller.js";

const router = Router();

router.get("/", (req, res, next) =>
    disciplineController.index(req, res, next)
);

router.get("/:id", (req, res, next) =>
    disciplineController.show(req, res, next)
);

router.post("/", (req, res, next) =>
    disciplineController.store(req, res, next)
);

router.put("/:id", (req, res, next) =>
    disciplineController.update(req, res, next)
);

router.patch("/:id/status", (req, res, next) =>
    disciplineController.updateStatus(req, res, next)
);

router.delete("/:id", (req, res, next) =>
    disciplineController.destroy(req, res, next)
);

export default router;
