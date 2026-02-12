import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from "../validator/employee.category.validator.js";

/**
 * @desc Create a new category
 * @route POST /api/v1/employee/category
 * @access Private
 */
export const createCategory = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { employeeIds, ...categoryData } = createCategorySchema.parse(req.body);
  const companyId = req.user.id;

  const category = await prisma.category.create({
    data: {
      ...categoryData,
      companyId,
      employees: {
        connect: employeeIds?.map((id) => ({ id })) || [],
      },
    },
    include: {
      employees: true,
    },
  });

  return SuccessResponse(res, "Category created successfully", category, statusCode.Created);
});

/**
 * @desc Get all categories for the company
 * @route GET /api/v1/employee/category
 * @access Private
 */
export const getAllCategories = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const companyId = req.user.id;

  const categories = await prisma.category.findMany({
    where: { companyId },
    include: {
      employees: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return SuccessResponse(res, "Categories fetched successfully", categories, statusCode.OK);
});

/**
 * @desc Get category by ID
 * @route GET /api/v1/employee/category/:id
 * @access Private
 */
export const getCategoryById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = categoryIdSchema.parse(req.params);
  const companyId = req.user.id;

  const category = await prisma.category.findFirst({
    where: { id, companyId },
    include: {
      employees: true,
    },
  });

  if (!category) {
    return next(new ErrorResponse("Category not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Category fetched successfully", category, statusCode.OK);
});

/**
 * @desc Update category
 * @route PUT /api/v1/employee/category/:id
 * @access Private
 */
export const updateCategory = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = categoryIdSchema.parse(req.params);
  const { employeeIds, ...categoryData } = updateCategorySchema.parse(req.body);
  const companyId = req.user.id;

  const category = await prisma.category.findFirst({
    where: { id, companyId },
  });

  if (!category) {
    return next(new ErrorResponse("Category not found", statusCode.Not_Found));
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      ...categoryData,
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

  return SuccessResponse(res, "Category updated successfully", updatedCategory, statusCode.OK);
});

/**
 * @desc Delete category
 * @route DELETE /api/v1/employee/category/:id
 * @access Private
 */
export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = categoryIdSchema.parse(req.params);
  const companyId = req.user.id;

  const category = await prisma.category.findFirst({
    where: { id, companyId },
  });

  if (!category) {
    return next(new ErrorResponse("Category not found", statusCode.Not_Found));
  }

  await prisma.category.delete({
    where: { id },
  });

  return SuccessResponse(res, "Category deleted successfully", null, statusCode.OK);
});
