import { Router } from "express";
import { protectEmployee } from "../../empolyee/middleware/employeeAuth.middleware";
import * as leaveController from "../controller/leave.controller";

const leavesRoutes = Router();

// Apply for a leave
leavesRoutes.post("/apply", protectEmployee, leaveController.applyLeave);

// Get leaves (can filter by employeeId, status, type)
leavesRoutes.get("/", leaveController.getLeaves);

// Get leave by ID
leavesRoutes.get("/:id", leaveController.getLeaveById);

// Update leave status (Approve/Reject)
leavesRoutes.patch("/:id/status", leaveController.updateLeaveStatus);

// Delete a pending leave request
leavesRoutes.delete("/:id", leaveController.deleteLeave);

export default leavesRoutes;
