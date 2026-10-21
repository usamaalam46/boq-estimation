import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createEstimate, deleteEstimate, duplicateEstimate, indexEstimates, showEstimate, updateEstimate } from "../controllers/estimate.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", indexEstimates);
router.post("/", createEstimate);
router.get("/:id", showEstimate);
router.put("/:id", updateEstimate);
router.delete("/:id", deleteEstimate);
router.post("/:id/duplicate", duplicateEstimate);
export default router;
