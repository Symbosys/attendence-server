import { Router } from "express";
import * as attendanceController from "../controller/attendance.controller";

const attendanceRoutes = Router();

// Check-in for today's attendance
attendanceRoutes.post("/check-in", attendanceController.checkIn);

// Check-out for today's attendance
attendanceRoutes.post("/check-out", attendanceController.checkOut);

// Get attendance history (can filter by employeeId, startDate, endDate)
attendanceRoutes.get("/", attendanceController.getAttendance);

// Get a summary of attendance for a specific date
attendanceRoutes.get("/summary", attendanceController.getDailyAttendanceSummary);

export default attendanceRoutes;
