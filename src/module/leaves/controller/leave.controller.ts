import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import type { EmployeeAuthRequest } from "../../empolyee/middleware/employeeAuth.middleware.js";
import {
    ApplyLeaveValidator,
    GetLeavesValidator,
    LeaveIdValidator,
    UpdateLeaveStatusValidator,
} from "../validator/leaves.validator.js";

/**
 * @desc Apply for a leave
 * @route POST /api/v1/leaves/apply
 * @access Private/Employee
 */
export const applyLeave = asyncHandler(async (req: EmployeeAuthRequest, res: Response, next: NextFunction) => {
  const validatedData = ApplyLeaveValidator.parse(req.body);
  const { type, startDate, endDate, reason } = validatedData;
  const employeeId = validatedData.employeeId || req.employee?.id;

  if (!employeeId) {
    return next(new ErrorResponse("Employee ID is required", statusCode.Bad_Request));
  }

  // 1. Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  // 2. Check for overlapping leaves
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return next(new ErrorResponse("Start date cannot be after end date", statusCode.Bad_Request));
  }

  const overlappingLeave = await prisma.leave.findFirst({
    where: {
      employeeId,
      status: { not: "REJECTED" },
      OR: [
        {
          startDate: { lte: end },
          endDate: { gte: start },
        },
      ],
    },
  });

  if (overlappingLeave) {
    return next(new ErrorResponse("Leave request overlaps with an existing leave", statusCode.Conflict));
  }

  // 3. Create leave request
  const leave = await prisma.leave.create({
    data: {
      employeeId,
      type,
      startDate: start,
      endDate: end,
      reason,
      status: "PENDING",
    },
  });

  return SuccessResponse(res, "Leave applied successfully", leave, statusCode.Created);
});

/**
 * @desc Update leave status (Approve/Reject)
 * @route PATCH /api/v1/leaves/:id/status
 * @access Private/Admin
 */
export const updateLeaveStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = LeaveIdValidator.parse(req.params);
  const { status } = UpdateLeaveStatusValidator.parse(req.body);

  const leave = await prisma.leave.findUnique({
    where: { id },
  });

  if (!leave) {
    return next(new ErrorResponse("Leave request not found", statusCode.Not_Found));
  }

  const updatedLeave = await prisma.leave.update({
    where: { id },
    data: { status },
  });

  const action = status === 'PENDING' ? 'reset to pending' : status.toLowerCase() + 'ed';
  return SuccessResponse(res, `Leave request ${action} successfully`, updatedLeave, statusCode.OK);
});

/**
 * @desc Get leaves
 * @route GET /api/v1/leaves
 * @access Private
 */
export const getLeaves = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, status, type } = GetLeavesValidator.parse(req.query);

  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (type) where.type = type;

  const leaves = await prisma.leave.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  return SuccessResponse(res, "Leaves fetched successfully", leaves, statusCode.OK);
});

/**
 * @desc Get leave by ID
 * @route GET /api/v1/leaves/:id
 * @access Private
 */
export const getLeaveById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = LeaveIdValidator.parse(req.params);

  const leave = await prisma.leave.findUnique({
    where: { id },
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

  if (!leave) {
    return next(new ErrorResponse("Leave request not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Leave record fetched successfully", leave, statusCode.OK);
});

/**
 * @desc Delete leave request
 * @route DELETE /api/v1/leaves/:id
 * @access Private/Employee
 */
export const deleteLeave = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = LeaveIdValidator.parse(req.params);

  const leave = await prisma.leave.findUnique({
    where: { id },
  });

  if (!leave) {
    return next(new ErrorResponse("Leave request not found", statusCode.Not_Found));
  }

  if (leave.status !== "PENDING") {
    return next(new ErrorResponse("Cannot delete a leave request that is already processed", statusCode.Conflict));
  }

  await prisma.leave.delete({
    where: { id },
  });

  return SuccessResponse(res, "Leave request deleted successfully", null, statusCode.OK);
});
