import { z } from "zod";

export const LeaveTypeEnum = z.enum(["CASUAL", "SICK", "PRIVILEGE", "EMERGENCY"]);
export const LeaveStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const ApplyLeaveValidator = z.object({
  employeeId: z.string().cuid({ message: "Invalid Employee ID" }).optional(),
  type: LeaveTypeEnum,
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }),
  reason: z.string().optional(),
});

export const UpdateLeaveStatusValidator = z.object({
  status: LeaveStatusEnum,
});

export const LeaveIdValidator = z.object({
  id: z.string().cuid({ message: "Invalid Leave ID" }),
});

export const GetLeavesValidator = z.object({
  employeeId: z.string().cuid({ message: "Invalid Employee ID" }).optional(),
  status: LeaveStatusEnum.optional(),
  type: LeaveTypeEnum.optional(),
});
