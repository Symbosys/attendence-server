import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { generateToken } from "../../../utils/jwt.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import {
  adminLoginSchema,
  CompanyQueryValidator,
  createAdminSchema,
} from "../validator/admin.validator.js";

/**
 * @desc Get all companies with pagination and filtering
 * @route GET /api/v1/admin/companies
 * @access Private/Admin
 */
export const getCompanies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { page, limit, search } = CompanyQueryValidator.parse(req.query);

  const skip = (page - 1) * limit;

  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { employees: true, tasks: true },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return SuccessResponse(
    res,
    "Companies fetched successfully",
    {
      companies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    statusCode.OK
  );
});

/**
 * @desc Get admin dashboard statistics
 * @route GET /api/v1/admin/dashboard-stats
 * @access Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const [
    totalCompanies,
    totalEmployees,
    activeTasks,
    totalAttendance,
    recentCompanies,
    recentTasks,
    recentAttendance,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.employee.count(),
    prisma.task.count({ where: { status: "PENDING" } }),
    prisma.attendance.count({
      where: {
        date: new Date(),
      },
    }),
    prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.task.findMany({
      take: 5,
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        employee: { select: { firstname: true, lastname: true } },
      },
    }),
    prisma.attendance.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstname: true, lastname: true } } },
    }),
  ]);

  // Combine into a unified activity feed
  const activities = [
    ...recentCompanies.map((c) => ({
      id: c.id,
      type: "COMPANY",
      content: `New company "${c.name}" onboarded.`,
      time: c.createdAt,
    })),
    ...recentTasks.map((t) => ({
      id: t.id,
      type: "TASK",
      content: `${t.employee?.firstname || "Employee"} completed "${t.title}".`,
      time: t.updatedAt,
    })),
    ...recentAttendance.map((a) => ({
      id: a.id,
      type: "ATTENDANCE",
      content: `${a.employee?.firstname || "Employee"} punched in.`,
      time: a.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  // Mock revenue and productivity as they aren't fully in schema yet or need complex logic
  const stats = {
    totalRevenue: totalCompanies * 500, // Example logic
    activeCompanies: totalCompanies,
    totalEmployees,
    activeTasks,
    productivity: 85, // Example static/calculated value
    attendanceToday: totalAttendance,
    recentActivities: activities,
  };

  return SuccessResponse(res, "Dashboard stats fetched successfully", stats, statusCode.OK);
});

/**
 * @desc Admin Login
 * @route POST /api/v1/admin/login
 * @access Public
 */
export const loginAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = adminLoginSchema.parse(req.body);

  const admin = await (prisma as any).admin.findUnique({
    where: { email },
  });

  if (!admin) {
    return next(new ErrorResponse("Invalid email or password", statusCode.Unauthorized));
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return next(new ErrorResponse("Invalid email or password", statusCode.Unauthorized));
  }

  const token = generateToken({ id: admin.id, email: admin.email, role: admin.role });

  return res
    .status(statusCode.OK)
    .cookie("admin_token", token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
});

/**
 * @desc Create New Admin
 * @route POST /api/v1/admin/create
 * @access Private/SuperAdmin (or Public for first admin setup)
 */
export const createAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name, role } = createAdminSchema.parse(req.body);

  const existingAdmin = await (prisma as any).admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    return next(new ErrorResponse("Admin with this email already exists", statusCode.Bad_Request));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await (prisma as any).admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || "SUPER_ADMIN",
    },
  });

  return SuccessResponse(
    res,
    "Admin created successfully",
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    statusCode.Created
  );
});
