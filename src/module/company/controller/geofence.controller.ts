import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { createGeofenceSchema, geofenceIdSchema, updateGeofenceSchema } from "../validator/geofence.validator.js";

/**
 * @desc Create a new geofence
 * @route POST /api/v1/company/geofence
 * @access Private
 */
export const createGeofence = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { employeeIds, ...geofenceData } = createGeofenceSchema.parse(req.body);
  const companyId = req.user.id;

  const geofence = await prisma.geofence.create({
    data: {
      ...geofenceData,
      companyId,
      employees: {
        connect: employeeIds?.map((id) => ({ id })) || [],
      },
    },
    include: {
      employees: true,
    },
  });

  return SuccessResponse(res, "Geofence created successfully", geofence, statusCode.Created);
});

/**
 * @desc Get all geofences for the company
 * @route GET /api/v1/company/geofence
 * @access Private
 */
export const getAllGeofences = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const companyId = req.user.id;

  const geofences = await prisma.geofence.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return SuccessResponse(res, "Geofences fetched successfully", geofences, statusCode.OK);
});

/**
 * @desc Get geofence by ID
 * @route GET /api/v1/company/geofence/:id
 * @access Private
 */
export const getGeofenceById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = geofenceIdSchema.parse(req.params);
  const companyId = req.user.id;

  const geofence = await prisma.geofence.findFirst({
    where: { id, companyId },
    include: {
      employees: true,
    },
  });

  if (!geofence) {
    return next(new ErrorResponse("Geofence not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Geofence fetched successfully", geofence, statusCode.OK);
});

/**
 * @desc Update geofence
 * @route PUT /api/v1/company/geofence/:id
 * @access Private
 */
export const updateGeofence = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = geofenceIdSchema.parse(req.params);
  const { employeeIds, ...geofenceData } = updateGeofenceSchema.parse(req.body);
  const companyId = req.user.id;

  const geofence = await prisma.geofence.findFirst({
    where: { id, companyId },
  });

  if (!geofence) {
    return next(new ErrorResponse("Geofence not found", statusCode.Not_Found));
  }

  const updatedGeofence = await prisma.geofence.update({
    where: { id },
    data: {
      ...geofenceData,
      employees: employeeIds
        ? {
            set: employeeIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      employees: true,
    },
  });

  return SuccessResponse(res, "Geofence updated successfully", updatedGeofence, statusCode.OK);
});

/**
 * @desc Delete geofence
 * @route DELETE /api/v1/company/geofence/:id
 * @access Private
 */
export const deleteGeofence = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = geofenceIdSchema.parse(req.params);
  const companyId = req.user.id;

  const geofence = await prisma.geofence.findFirst({
    where: { id, companyId },
  });

  if (!geofence) {
    return next(new ErrorResponse("Geofence not found", statusCode.Not_Found));
  }

  await prisma.geofence.delete({
    where: { id },
  });

  return SuccessResponse(res, "Geofence deleted successfully", null, statusCode.OK);
});
