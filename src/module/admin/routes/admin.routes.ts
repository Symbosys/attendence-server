import { Router } from "express";
import {
    createAdmin,
    getCompanies,
    getDashboardStats,
    loginAdmin
} from "../controller/admin.controller.js";

import { protectAdmin } from "../../../middleware/auth.middleware.js";

const router = Router();

router.post("/login", loginAdmin);
router.post("/create", createAdmin); // Usually should be protected, but for first setup keep it or protect with SuperAdmin

// Protected Admin Routes
router.use(protectAdmin);
router.get("/companies", getCompanies);
router.get("/dashboard-stats", getDashboardStats);

export default router;
