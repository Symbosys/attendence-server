import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import * as controller from "../controller/sift.controller.js";

const router = Router();

// Apply protection to all shift routes
router.use(protectCompany);

router.post("/", controller.createShift);
router.get("/", controller.getAllShifts);
router.get("/:id", controller.getShiftById);
router.put("/:id", controller.updateShift);
router.delete("/:id", controller.deleteShift);

export default router;
