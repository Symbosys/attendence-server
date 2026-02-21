import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { EmployeeIdValidator, EmployeeOnboardValidator, GetEmployeesQueryValidator } from "../validator/employee.validator.js";

/**
 * @desc Onboard a new employee with settings and bank details
 * @route POST /api/v1/employee/onboard
 * @access Private/Admin   
 */
export const onboardEmployee = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const validatedData = EmployeeOnboardValidator.parse(req.body);

  const {
    companyId,
    firstname,
    lastname,
    password,
    email,
    employeeCode,
    designation,
    phoneNumber,
    Country,
    salary,
    birthDate,
    emergencyContactPhone,
    emergencyContactName,
    gender,
    bloodGroup,
    // Settings fields
    weekOffExtraPayment,
    weekOffDay,
    applicableToOvertime,
    shiftwiseAttendance,
    payrollConfiguration,
    numberOfCasualLeaves,
    numberOfSickLeaves,
    numberOfPrivilegeLeaves,
    numberOfEmergencyLeaves,
    addDocument,
    multipleAttendance,
    liveTracking,
    mobileAttendance,
    aiFingerprintVerification,
    selfCustomDaywiseSalary,
    viewSelfSalary,
    selfOdometerReading,
    dateOfJoining,
    punchFromGeofence,
    // Bank fields
    panNumber,
    bankAccountNumber,
    bankIfscCode,
    bankName,
    bankBranchName,
    accountHolderName,
    address,
  } = validatedData;

  // 1. Check if phone number already exists
  const existingEmployee = await prisma.employee.findUnique({
    where: { phoneNumber },
  });

  if (existingEmployee) {
    return next(new ErrorResponse("Employee with this phone number already exists", statusCode.Conflict));
  }

  // 2. Check if email already exists (if provided)
  if (email && email.trim() !== "") {
    const existingEmail = await prisma.employee.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return next(new ErrorResponse("Employee with this email already exists", statusCode.Conflict));
    }
  }

  // 3. Hash password if provided
  let hashedPassword = undefined;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  // 4. Create Employee with nested Settings and Bank Details in a transaction
  const employee = await prisma.$transaction(async (tx) => {
    // Generate a unique userId as it is required by the Prisma schema
    const generatedUserId = `EMP-${randomUUID().slice(0, 8).toUpperCase()}`;

    return await tx.employee.create({
      data: {
        companyId,
        firstname,
        lastname,
        password: hashedPassword,
        email: (email && email.trim() !== "") ? email : null,
        employeeCode,
        designation,
        phoneNumber,
        Country,
        salary,
        birthDate,
        emergencyContactPhone,
        emergencyContactName,
        gender,
        bloodGroup,
        userId: generatedUserId,
        settings: {
          create: {
            weekOffExtraPayment,
            weekOffDay,
            applicableToOvertime,
            shiftwiseAttendance,
            payrollConfiguration,
            numberOfCasualLeaves,
            numberOfSickLeaves,
            numberOfPrivilegeLeaves,
            numberOfEmergencyLeaves,
            addDocument,
            multipleAttendance,
            liveTracking,
            mobileAttendance,
            aiFingerprintVerification,
            selfCustomDaywiseSalary,
            viewSelfSalary,
            selfOdometerReading,
            dateOfJoining,
            punchFromGeofence,
          },
        },
        bank: {
          create: {
            panNumber,
            bankAccountNumber,
            bankIfscCode,
            bankName,
            bankBranchName,
            accountHolderName,
            address: address,
          },
        },
      } as any,
      include: {
        settings: true,
        bank: true,
      },
    });
  });

  return SuccessResponse(res, "Employee onboarded successfully", employee, statusCode.Created);
});

/**
 * @desc Get all employees
 * @route GET /api/v1/employee
 * @access Private/Admin
 */
export const getAllEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { companyId, search, designation, categoryId, page, limit } = GetEmployeesQueryValidator.parse(req.query);

  const skip = (page - 1) * limit;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: Prisma.EmployeeWhereInput = {};

  if (companyId) {
    where.companyId = companyId;
  }

  if(categoryId){
    where.categories = {
      some: {
        id: categoryId,
      },
    }
  }

  if (designation) {
    where.designation = { contains: designation, mode: "insensitive" };
  }

  if (search) {
    where.OR = [
      { firstname: { contains: search, mode: "insensitive" } },
      { lastname: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
    ];

    // If search is a number, also search by employeeCode
    const searchAsInt = parseInt(search);
    if (!isNaN(searchAsInt)) {
      where.OR.push({ employeeCode: searchAsInt });
    }
  }

  const [employees, totalCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        designation: true,
        profilePicture: true,
        attendances: {
          where: {
            date: today,
          },
          select: {
            checkIn: true,
            checkOut: true,
            status: true,
          },
        },
      },
      orderBy: { firstname: "asc" },
    }),
    prisma.employee.count({ where }),
  ]);

  const meta = {
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };

  return SuccessResponse(res, "Employees fetched successfully", { employees, meta }, statusCode.OK);
});

/**
 * @desc Get employee by ID
 * @route GET /api/v1/employee/:id
 * @access Private/Admin
 */
export const getEmployeeById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = EmployeeIdValidator.parse(req.params);

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      settings: true,
      bank: true,
    },
  });

  if (!employee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Employee fetched successfully", employee, statusCode.OK);
});

/**
 * @desc Update employee details
 * @route PUT /api/v1/employee/:id
 * @access Private/Admin
 */
export const updateEmployee = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = EmployeeIdValidator.parse(req.params);
  // Using partial validation for updates
  const validatedData = EmployeeOnboardValidator.partial().parse(req.body);

  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existingEmployee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  // Handle password update if provided
  if (validatedData.password) {
    validatedData.password = await bcrypt.hash(validatedData.password, 10);
  }

  // Separate data for nested updates
  const {
    // Settings fields
    weekOffExtraPayment, weekOffDay, applicableToOvertime, shiftwiseAttendance,
    payrollConfiguration, numberOfCasualLeaves, numberOfSickLeaves,
    numberOfPrivilegeLeaves, numberOfEmergencyLeaves, addDocument,
    multipleAttendance, liveTracking, mobileAttendance, aiFingerprintVerification,
    selfCustomDaywiseSalary, viewSelfSalary, selfOdometerReading,
    dateOfJoining, punchFromGeofence,
    // Bank fields
    panNumber, bankAccountNumber, bankIfscCode, bankName,
    bankBranchName, accountHolderName, address,
    // Basic fields
    ...basicInfo
  } = validatedData as any;

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: {
      ...basicInfo,
      settings: {
        update: {
          weekOffExtraPayment, weekOffDay, applicableToOvertime, shiftwiseAttendance,
          payrollConfiguration, numberOfCasualLeaves, numberOfSickLeaves,
          numberOfPrivilegeLeaves, numberOfEmergencyLeaves, addDocument,
          multipleAttendance, liveTracking, mobileAttendance, aiFingerprintVerification,
          selfCustomDaywiseSalary, viewSelfSalary, selfOdometerReading,
          dateOfJoining, punchFromGeofence,
        },
      },
      bank: {
        update: {
          panNumber, bankAccountNumber, bankIfscCode, bankName,
          bankBranchName, accountHolderName, address: address,
        },
      },
    },
    include: {
      settings: true,
      bank: true,
    },
  });

  return SuccessResponse(res, "Employee updated successfully", updatedEmployee, statusCode.OK);
});

/**
 * @desc Delete employee
 * @route DELETE /api/v1/employee/:id
 * @access Private/Admin
 */
export const deleteEmployee = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = EmployeeIdValidator.parse(req.params);

  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existingEmployee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  await prisma.employee.delete({
    where: { id },
  });

  return SuccessResponse(res, "Employee deleted successfully", null, statusCode.OK);
});

/**
 * @desc Upload or Update profile picture
 * @route POST /api/v1/employee/:id/profile-picture
 * @access Private/Admin
 */
export const updateProfilePicture = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = EmployeeIdValidator.parse(req.params);

  if (!req.file) {
    return next(new ErrorResponse("Please upload an image file", statusCode.Bad_Request));
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    // Delete the file if employee not found to avoid orphan files
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  // Delete old profile picture if exists
  if (employee.profilePicture) {
    const oldPic = employee.profilePicture as any;
    if (oldPic.path) {
      const oldPath = path.join(process.cwd(), oldPic.path);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
  }

  const profilePicture = {
    url: `/uploads/${req.file.filename}`,
    path: req.file.path.replace(/\\/g, "/"), // Multer path is relative to cwd if destination is "uploads/"
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: { profilePicture },
  });

  return SuccessResponse(res, "Profile picture updated successfully", updatedEmployee, statusCode.OK);
});

/**
 * @desc Delete profile picture
 * @route DELETE /api/v1/employee/:id/profile-picture
 * @access Private/Admin
 */
export const deleteProfilePicture = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = EmployeeIdValidator.parse(req.params);

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    return next(new ErrorResponse("Employee not found", statusCode.Not_Found));
  }

  if (!employee.profilePicture) {
    return next(new ErrorResponse("No profile picture to delete", statusCode.Bad_Request));
  }

  const pic = employee.profilePicture as any;
  if (pic.path) {
    const filePath = path.join(process.cwd(), pic.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.employee.update({
    where: { id },
    data: { profilePicture: null as any },
  });

  return SuccessResponse(res, "Profile picture deleted successfully", null, statusCode.OK);
});
