import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import {
    createHolidaySchema,
    getHolidaysQuerySchema,
    holidayIdSchema,
    updateHolidaySchema,
} from "../validator/holiday.validator.js";

/**
 * @desc Create a new holiday
 * @route POST /api/v1/holiday
 * @access Private (Company)
 */
export const createHoliday = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const validatedData = createHolidaySchema.parse(req.body);
  const companyId = req.user.id; // Company Admin

  const holiday = await prisma.holiday.create({
    data: {
      ...validatedData,
      date: new Date(validatedData.date),
      companyId,
    },
  });

  return SuccessResponse(res, "Holiday created successfully", holiday, statusCode.Created);
});

/**
 * @desc Get all holidays for a company
 * @route GET /api/v1/holiday
 * @access Private/Public
 */
export const getAllHolidays = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const { year, month, startDate, endDate } = getHolidaysQuerySchema.parse(req.query);
  const companyId = req.user?.id || req.params.companyId;

  if (!companyId) {
    return next(new ErrorResponse("Company ID is required", statusCode.Bad_Request));
  }

  const where: any = { companyId };

  if (year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    where.date = { gte: startOfYear, lte: endOfYear };
  }

  if (month && year) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    where.date = { gte: startOfMonth, lte: endOfMonth };
  }

  if (startDate || endDate) {
    where.date = {
      ...(where.date || {}),
      gte: startDate ? new Date(startDate) : where.date?.gte,
      lte: endDate ? new Date(endDate) : where.date?.lte,
    };
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return SuccessResponse(res, "Holidays fetched successfully", holidays, statusCode.OK);
});

/**
 * @desc Get holiday by ID
 * @route GET /api/v1/holiday/:id
 * @access Private
 */
export const getHolidayById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = holidayIdSchema.parse(req.params);
  const companyId = req.user.id;

  const holiday = await prisma.holiday.findFirst({
    where: { id, companyId },
  });

  if (!holiday) {
    return next(new ErrorResponse("Holiday not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Holiday fetched successfully", holiday, statusCode.OK);
});

/**
 * @desc Update holiday
 * @route PUT /api/v1/holiday/:id
 * @access Private (Company)
 */
export const updateHoliday = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = holidayIdSchema.parse(req.params);
  const validatedData = updateHolidaySchema.parse(req.body);
  const companyId = req.user.id;

  const holiday = await prisma.holiday.findFirst({
    where: { id, companyId },
  });

  if (!holiday) {
    return next(new ErrorResponse("Holiday not found", statusCode.Not_Found));
  }

  const updatedHoliday = await prisma.holiday.update({
    where: { id },
    data: {
      ...validatedData,
      date: validatedData.date ? new Date(validatedData.date) : undefined,
    },
  });

  return SuccessResponse(res, "Holiday updated successfully", updatedHoliday, statusCode.OK);
});

/**
 * @desc Delete holiday
 * @route DELETE /api/v1/holiday/:id
 * @access Private (Company)
 */
export const deleteHoliday = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = holidayIdSchema.parse(req.params);
  const companyId = req.user.id;

  const holiday = await prisma.holiday.findFirst({
    where: { id, companyId },
  });

  if (!holiday) {
    return next(new ErrorResponse("Holiday not found", statusCode.Not_Found));
  }

  await prisma.holiday.delete({
    where: { id },
  });

  return SuccessResponse(res, "Holiday deleted successfully", null, statusCode.OK);
});
