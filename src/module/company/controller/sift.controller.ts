import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { createShiftSchema, shiftIdSchema, updateShiftSchema } from "../validator/shift.validator.js";

/**
 * @desc Create a new shift
 * @route POST /api/v1/company/shift
 * @access Private
 */
export const createShift = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const validatedData = createShiftSchema.parse(req.body);
  const companyId = req.user.id;

  const shift = await prisma.shift.create({
    data: {
      ...validatedData,
      companyId,
    },
  });

  return SuccessResponse(res, "Shift created successfully", shift, statusCode.Created);
});

/**
 * @desc Get all shifts for the company
 * @route GET /api/v1/company/shift
 * @access Private
 */
export const getAllShifts = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const companyId = req.user.id;

  const shifts = await prisma.shift.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return SuccessResponse(res, "Shifts fetched successfully", shifts, statusCode.OK);
});

/**
 * @desc Get shift by ID
 * @route GET /api/v1/company/shift/:id
 * @access Private
 */
export const getShiftById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = shiftIdSchema.parse(req.params);
  const companyId = req.user.id;

  const shift = await prisma.shift.findFirst({
    where: { id, companyId },
  });

  if (!shift) {
    return next(new ErrorResponse("Shift not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Shift fetched successfully", shift, statusCode.OK);
});

/**
 * @desc Update shift
 * @route PUT /api/v1/company/shift/:id
 * @access Private
 */
export const updateShift = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = shiftIdSchema.parse(req.params);
  const validatedData = updateShiftSchema.parse(req.body);
  const companyId = req.user.id;

  const shift = await prisma.shift.findFirst({
    where: { id, companyId },
  });

  if (!shift) {
    return next(new ErrorResponse("Shift not found", statusCode.Not_Found));
  }

  const updatedShift = await prisma.shift.update({
    where: { id },
    data: validatedData,
  });

  return SuccessResponse(res, "Shift updated successfully", updatedShift, statusCode.OK);
});

/**
 * @desc Delete shift
 * @route DELETE /api/v1/company/shift/:id
 * @access Private
 */
export const deleteShift = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = shiftIdSchema.parse(req.params);
  const companyId = req.user.id;

  const shift = await prisma.shift.findFirst({
    where: { id, companyId },
  });

  if (!shift) {
    return next(new ErrorResponse("Shift not found", statusCode.Not_Found));
  }

  await prisma.shift.delete({
    where: { id },
  });

  return SuccessResponse(res, "Shift deleted successfully", null, statusCode.OK);
});
