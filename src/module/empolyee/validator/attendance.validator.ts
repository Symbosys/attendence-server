import { z } from "zod";

export const CheckInValidator = z.object({
  employeeId: z.string().cuid({ message: "Invalid Employee ID" }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  remarks: z.string().optional(),
});

export const CheckOutValidator = z.object({
  employeeId: z.string().cuid({ message: "Invalid Employee ID" }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  remarks: z.string().optional(),
});

export const GetAttendanceValidator = z.object({
  employeeId: z.string().cuid({ message: "Invalid Employee ID" }).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AttendanceIdValidator = z.object({
  id: z.string().cuid({ message: "Invalid Attendance ID" }),
});
