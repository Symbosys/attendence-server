import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import {
    createSubscriptionPlanSchema,
    subscriptionPlanIdSchema,
    updateSubscriptionPlanSchema,
} from "../validator/subscriptionPlan.validator.js";

/**
 * @desc Create a new subscription plan
 * @route POST /api/v1/subscription-plan
 * @access Private (Admin only)
 */
export const createSubscriptionPlan = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const validatedData = createSubscriptionPlanSchema.parse(req.body);

  const plan = await prisma.subscriptionPlan.create({
    data: validatedData,
  });

  return SuccessResponse(res, "Subscription plan created successfully", plan, statusCode.Created);
});

/**
 * @desc Get all subscription plans
 * @route GET /api/v1/subscription-plan
 * @access Public/Private
 */
export const getAllSubscriptionPlans = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  return SuccessResponse(res, "Subscription plans fetched successfully", plans, statusCode.OK);
});

/**
 * @desc Get subscription plan by ID
 * @route GET /api/v1/subscription-plan/:id
 * @access Public/Private
 */
export const getSubscriptionPlanById = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const { id } = subscriptionPlanIdSchema.parse(req.params);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    return next(new ErrorResponse("Subscription plan not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Subscription plan fetched successfully", plan, statusCode.OK);
});

/**
 * @desc Update subscription plan
 * @route PUT /api/v1/subscription-plan/:id
 * @access Private (Admin only)
 */
export const updateSubscriptionPlan = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = subscriptionPlanIdSchema.parse(req.params);
  const validatedData = updateSubscriptionPlanSchema.parse(req.body);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    return next(new ErrorResponse("Subscription plan not found", statusCode.Not_Found));
  }

  const updatedPlan = await prisma.subscriptionPlan.update({
    where: { id },
    data: validatedData,
  });

  return SuccessResponse(res, "Subscription plan updated successfully", updatedPlan, statusCode.OK);
});

/**
 * @desc Delete subscription plan (Soft delete by deactivating)
 * @route DELETE /api/v1/subscription-plan/:id
 * @access Private (Admin only)
 */
export const deleteSubscriptionPlan = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = subscriptionPlanIdSchema.parse(req.params);

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    return next(new ErrorResponse("Subscription plan not found", statusCode.Not_Found));
  }

  // Soft delete by setting isActive to false
  await prisma.subscriptionPlan.update({
    where: { id },
    data: { isActive: false },
  });

  return SuccessResponse(res, "Subscription plan deactivated successfully", null, statusCode.OK);
});
