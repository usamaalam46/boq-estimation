import {Router} from "express";
import {createOrganization,getOrganization,getOrganizations,setOrganizationStatus,updateOrganization} from "../controllers/organization.controller.js";
const router=Router();router.get("/",getOrganizations);router.get("/:organizationId",getOrganization);router.post("/",createOrganization);router.put("/:organizationId",updateOrganization);router.patch("/:organizationId/status",setOrganizationStatus);export default router;
// Mount with app.use("/api/organization", router)
