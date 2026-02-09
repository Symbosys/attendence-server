import { Router } from "express";
import { upload } from "../../../middleware/multer.middleware.js";
import * as onboardingController from "../controller/employee.controller.js";

const employeeOnboardingRoute = Router();

// Create new employee (onboarding)
employeeOnboardingRoute.post("/onboard", onboardingController.onboardEmployee);

// Get all employees
employeeOnboardingRoute.get("/" , onboardingController.getAllEmployees);

// Get employee by ID
employeeOnboardingRoute.get("/:id", onboardingController.getEmployeeById);

// Update employee
employeeOnboardingRoute.put("/:id", onboardingController.updateEmployee);

// Delete employee
employeeOnboardingRoute.delete("/:id", onboardingController.deleteEmployee);

// Profile picture management
employeeOnboardingRoute.post("/:id/profile-picture", upload.single("profilePicture"), onboardingController.updateProfilePicture);
employeeOnboardingRoute.delete("/:id/profile-picture", onboardingController.deleteProfilePicture);

export default employeeOnboardingRoute;
