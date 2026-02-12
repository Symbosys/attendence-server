import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import {
  createDecision,
  deleteDecision,
  getAllDecisions,
  getDecisionById,
  giveCompanyApproval,
  giveParticipantApproval,
  updateDecision,
} from "../controller/decision.controller.js";

const router = Router();

// Public route to get all decisions by company ID
router.get("/all/:companyId", getAllDecisions);
router.post("/create/:companyId", createDecision);

// General routes (Protected for company)
router.use(protectCompany);

router.route("/:id")
  .get(getDecisionById)
  .put(updateDecision)
  .delete(deleteDecision);

// Specific approval routes
router.post("/:id/approve", giveParticipantApproval);

// Company only approval route
router.post("/:id/company-approve", protectCompany, giveCompanyApproval);

export default router;
