import { Router } from "express";
import { upload } from "../../../middleware/multer.middleware.js";
import { getCompanyById, onboard } from "../controller/company.controller.js";

const router = Router();

// Route for company onboarding (Create or Update)
// Using upload.single('logo') to handle image upload
router.post("/onboard", upload.single("logo"), onboard);

// Route to get company by ID
router.get("/:id", getCompanyById);

export default router;
