
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePlatformPermission } from "../middleware/authorize.js";
import {createOrganization,
  getOrganization,
  getOrganizations,
  setOrganizationStatus,
  updateOrganization,
} from "../controllers/organization.controller.js";

const router = Router();

router.use(authenticate);

// Read access: platform.organizations.view
router.get(
  "/",
  requirePlatformPermission("platform.organizations.view"),
  getOrganizations
);

router.get(
  "/:organizationId",
  requirePlatformPermission("platform.organizations.view"),
  getOrganization
);

// Management access: platform.organizations.manage
router.post(
  "/",
  requirePlatformPermission("platform.organizations.manage"),
  createOrganization
);

router.patch(
  "/:organizationId",
  requirePlatformPermission("platform.organizations.manage"),
  updateOrganization
);

router.patch(
  "/:organizationId/status",
  requirePlatformPermission("platform.organizations.manage"),
  setOrganizationStatus
);

export default router;
