import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import {
    createSubscriptionPlan,
    deleteSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
} from "../controller/subscriptionPlan.controller.js";

const router = Router();

// Publicly available routes to view plans
router.get("/", getAllSubscriptionPlans);
router.get("/:id", getSubscriptionPlanById);

// Protected routes for plan management (Creation, Update, Deletion)
router.use(protectCompany);

router.post("/", createSubscriptionPlan);
router.put("/:id", updateSubscriptionPlan);
router.delete("/:id", deleteSubscriptionPlan);

export default router;
