import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import * as controller from "../controller/geofence.controller.js";

const router = Router();

// Apply protection to all geofence routes
router.use(protectCompany);

router.post("/", controller.createGeofence);
router.get("/", controller.getAllGeofences);
router.get("/:id", controller.getGeofenceById);
router.put("/:id", controller.updateGeofence);
router.delete("/:id", controller.deleteGeofence);

export default router;
