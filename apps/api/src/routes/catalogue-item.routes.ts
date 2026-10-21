import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { indexCatalogueItems } from "../controllers/catalogue-item.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", indexCatalogueItems);
export default router;
