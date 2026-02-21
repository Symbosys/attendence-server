import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { getDistance } from "../../../utils/haversine.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { CheckInValidator, CheckOutValidator, GetAttendanceValidator } from "../validator/attendance.validator.js";

/**
 * Helper to get YYYY-MM-DD string from a Date object without timezone shifts.
 * This is crucial for matching records from the database.
 */
const getDateString = (date: Date) => {
  const d = new Date(date);
  // If it's a UTC-locked date from getBusinessDate, we use UTC components
  // If it's a Prisma @db.Date, it comes as local-midnight. 
  // To stay safe, we extract the local components which Prisma preserves.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getUTCDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * @desc Check-in for attendance
 * @route POST /api/v1/attendance/check-in
 * @access Private/Employee
 */
export const checkIn = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  console.log("Check-in payload:", req.body);
  const validatedData = CheckInValidator.parse(req.body);
  const { employeeId, latitude, longitude, remarks } = validatedData;

  // 1. Fetch employee with shift and settings
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      settings: true,
      geofences: true,
      shift: true,
    },
  });

  if (!employee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 2. Check if already checked-in for today
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (existingAttendance && existingAttendance.checkIn) {
    return next(new ErrorResponse("Already checked-in for today", statusCode.Conflict));
  }

  // 3. Geofence Validation
  if (employee.settings?.punchFromGeofence === "PUNCH_FROM_GEOFENCE") {
    if (latitude === undefined || longitude === undefined) {
      return next(new ErrorResponse("Location access required for geofence punch", statusCode.Bad_Request));
    }

    const assignedGeofences = employee.geofences;

    if (assignedGeofences.length === 0) {
      return next(new ErrorResponse("you are not assigned to any geo fence", statusCode.Forbidden));
    }

    let isWithinGeofence = false;
    let minDistance = Infinity;

    for (const geofence of assignedGeofences) {
      const distance = getDistance(latitude, longitude, geofence.latitude, geofence.longitude);
      if (distance < minDistance) minDistance = distance;

      if (distance <= geofence.radius) {
        isWithinGeofence = true;
        break;
      }
    }

    if (!isWithinGeofence) {
      return next(new ErrorResponse(`You are outside the authorized geofence area. Distance: ${Math.round(minDistance)}m`, statusCode.Forbidden));
    }
  }

  // 4. Calculate Attendance Status (LATE or PRESENT)
  let status: "PRESENT" | "LATE" = "PRESENT";
  if (employee.shift) {
    const startTimeParts = employee.shift.startTime.split(":").map(Number);
    const shiftHours = startTimeParts[0] ?? 0;
    const shiftMinutes = startTimeParts[1] ?? 0;
    const shiftStartTime = new Date(now);
    shiftStartTime.setHours(shiftHours, shiftMinutes, 0, 0);

    const diffInMinutes = (now.getTime() - shiftStartTime.getTime()) / (1000 * 60);

    if (diffInMinutes > employee.shift.latePunchInLimit) {
      status = "LATE";
    }
  }

  // 5. Create or Update Attendance Record
  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
    update: {
      checkIn: now,
      checkInLat: latitude,
      checkInLng: longitude,
      status,
      remarks,
    },
    create: {
      employeeId,
      date: today,
      checkIn: now,
      checkInLat: latitude,
      checkInLng: longitude,
      status,
      remarks,
    },
  });

  return SuccessResponse(res, "Checked-in successfully", attendance, statusCode.Created);
});

/**
 * @desc Check-out for attendance
 * @route POST /api/v1/attendance/check-out
 * @access Private/Employee
 */
export const checkOut = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  console.log("Check-out payload:", req.body);
  const validatedData = CheckOutValidator.parse(req.body);
  const { employeeId, latitude, longitude, remarks } = validatedData;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Find today's attendance record
  const attendanceRecord = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
    include: {
      employee: {
        include: {
          settings: true,
          geofences: true,
        },
      },
    },
  });

  if (!attendanceRecord) {
    return next(new ErrorResponse("No attendance record found for today. Please check-in first.", statusCode.Not_Found));
  }

  if (attendanceRecord.checkOut) {
    return next(new ErrorResponse("Already checked-out for today", statusCode.Conflict));
  }

  // 2. Geofence Validation
  if (attendanceRecord.employee.settings?.punchFromGeofence === "PUNCH_FROM_GEOFENCE") {
    if (latitude === undefined || longitude === undefined) {
      return next(new ErrorResponse("Location access required for geofence punch", statusCode.Bad_Request));
    }

    const assignedGeofences = attendanceRecord.employee.geofences;

    if (assignedGeofences.length === 0) {
      return next(new ErrorResponse("you are not assigned to any geo fence", statusCode.Forbidden));
    }

    let isWithinGeofence = false;
    let minDistance = Infinity;

    for (const geofence of assignedGeofences) {
      const distance = getDistance(latitude, longitude, geofence.latitude, geofence.longitude);
      if (distance < minDistance) minDistance = distance;

      if (distance <= geofence.radius) {
        isWithinGeofence = true;
        break;
      }
    }

    if (!isWithinGeofence) {
      return next(new ErrorResponse(`You are outside the authorized geofence area. Distance: ${Math.round(minDistance)}m`, statusCode.Forbidden));
    }
  }

  // 3. Update Attendance Record
  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendanceRecord.id },
    data: {
      checkOut: now,
      checkOutLat: latitude,
      checkOutLng: longitude,
      remarks: remarks || attendanceRecord.remarks,
    },
  });

  return SuccessResponse(res, "Checked-out successfully", updatedAttendance, statusCode.OK);
});

/**
 * @desc Get attendance history
 * @route GET /api/v1/attendance
 * @access Private
 */
export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, startDate, endDate } = GetAttendanceValidator.parse(req.query);

  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const attendance = await prisma.attendance.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      employee: {
        select: {
          firstname: true,
          lastname: true,
          employeeCode: true,
        },
      },
    },
  });

  return SuccessResponse(res, "Attendance history fetched successfully", attendance, statusCode.OK);
});

/**
 * @desc Get daily attendance summary
 * @route GET /api/v1/attendance/summary
 * @access Private/Admin
 */
export const getDailyAttendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const dateStr = req.query.date as string;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findMany({
    where: {
      date: targetDate,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          employeeCode: true,
          designation: true,
        },
      },
    },
  });

  const summary = {
    present: attendance.filter(a => a.status === "PRESENT").length,
    late: attendance.filter(a => a.status === "LATE").length,
    absent: attendance.filter(a => a.status === "ABSENT").length,
    halfDay: attendance.filter(a => a.status === "HALF_DAY").length,
    onLeave: attendance.filter(a => a.status === "ON_LEAVE").length,
    totalRecords: attendance.length,
    records: attendance,
  };

  return SuccessResponse(res, "Daily attendance summary fetched successfully", summary, statusCode.OK);
});
