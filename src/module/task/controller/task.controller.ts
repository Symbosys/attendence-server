import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { createTaskSchema, getTasksQuerySchema, taskIdSchema, updateTaskSchema } from "../validator/task.validator.js";

/**
 * @desc Create a new task
 * @route POST /api/v1/task
 * @access Private (Company)
 */
export const createTask = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const validatedData = createTaskSchema.parse(req.body);
  const companyId = req.user.id;

  const task = await prisma.task.create({
    //@ts-ignore
    data: {
      ...validatedData,
      companyId,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  });

  return SuccessResponse(res, "Task created successfully", task, statusCode.Created);
});

/**
 * @desc Get all tasks for the company
 * @route GET /api/v1/task/:companyId
 * @access Public
 */
export const getAllTasks = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const { startDate, endDate, status, priority, employeeId } = getTasksQuerySchema.parse(req.query);
  const { companyId } = req.params;

  const where: any = { companyId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (employeeId) where.employeeId = employeeId;

  if (startDate || endDate) {
    where.createdAt = {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return SuccessResponse(res, "Tasks fetched successfully", tasks, statusCode.OK);
});

/**
 * @desc Get task by ID
 * @route GET /api/v1/task/:id
 * @access Private (Company)
 */
export const getTaskById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = taskIdSchema.parse(req.params);
  const companyId = req.user.id;

  const task = await prisma.task.findFirst({
    where: { id, companyId },
    include: {
      employee: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  });

  if (!task) {
    return next(new ErrorResponse("Task not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Task fetched successfully", task, statusCode.OK);
});

/**
 * @desc Update task
 * @route PUT /api/v1/task/:id
 * @access Private (Company)
 */
export const updateTask = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = taskIdSchema.parse(req.params);
  const validatedData = updateTaskSchema.parse(req.body);
  const companyId = req.user.id;

  const task = await prisma.task.findFirst({
    where: { id, companyId },
  });

  if (!task) {
    return next(new ErrorResponse("Task not found", statusCode.Not_Found));
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    //@ts-ignore
    data: {
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  });

  return SuccessResponse(res, "Task updated successfully", updatedTask, statusCode.OK);
});

/**
 * @desc Delete task
 * @route DELETE /api/v1/task/:id
 * @access Private (Company)
 */
export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = taskIdSchema.parse(req.params);
  const companyId = req.user.id;

  const task = await prisma.task.findFirst({
    where: { id, companyId },
  });

  if (!task) {
    return next(new ErrorResponse("Task not found", statusCode.Not_Found));
  }

  await prisma.task.delete({
    where: { id },
  });

  return SuccessResponse(res, "Task deleted successfully", null, statusCode.OK);
});
