import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { getDistance } from "../../../utils/haversine.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { CheckInValidator, CheckOutValidator, GetAttendanceValidator } from "../validator/attendance.validator.js";

/**
 * App timezone fallback when client timezone is unavailable.
 */
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE ?? "UTC";

const isValidTimezone = (timezone: string) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const getRequestTimezone = (req: Request) => {
  const timezoneHeader = req.headers["x-timezone"];
  const requestedTimezone = typeof timezoneHeader === "string" ? timezoneHeader : DEFAULT_TIMEZONE;
  return isValidTimezone(requestedTimezone) ? requestedTimezone : DEFAULT_TIMEZONE;
};

const getDatePartsForTimezone = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
};

/**
 * Converts a timestamp to date-only value (00:00 UTC).
 * This keeps DB date comparison stable across server/client timezone differences.
 */
const getDateOnlyForTimezone = (date: Date, timezone: string) => {
  const { year, month, day } = getDatePartsForTimezone(date, timezone);
  return new Date(Date.UTC(year, month - 1, day));
};

const parseDateOnlyInput = (input: string) => {
  const trimmedInput = input.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedInput);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsedDate = new Date(trimmedInput);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }

  return new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
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
  const timezone = getRequestTimezone(req);
  const today = getDateOnlyForTimezone(now, timezone);

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
  const timezone = getRequestTimezone(req);
  const today = getDateOnlyForTimezone(now, timezone);

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

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = parseDateOnlyInput(startDate);
    if (endDate) dateFilter.lte = parseDateOnlyInput(endDate);
    where.date = dateFilter;
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
  const timezone = getRequestTimezone(req);
  const targetDate = dateStr ? parseDateOnlyInput(dateStr) : getDateOnlyForTimezone(new Date(), timezone);

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
