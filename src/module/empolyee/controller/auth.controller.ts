import bcrypt from "bcryptjs";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type";
import { generateToken } from "../../../utils/jwt";
import { generateOtp } from "../../../utils/otp";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import {
  EmployeeLoginValidator,
  EmployeeOtpValidator,
} from "../validator/auth.validator";

const OTP_LENGTH = 4;
const OTP_EXPIRATION_MINUTES = 5;
const MAX_DAILY_OTP_REQUESTS = 50;

// Controller: Request OTP for Employee Login
export const requestOtp = asyncHandler(async (req, res, next) => {
  const validData = EmployeeOtpValidator.parse(req.body);

  // Validate mobile number format
  if (!/^\+?\d{10,15}$/.test(validData.mobile)) {
    return next(new ErrorResponse("Invalid mobile number format", statusCode.Bad_Request));
  }

  // Check if employee exists in the database (onboarded employee)
  console.log("Searching for employee with phone:", validData.mobile);
  
  const employee = await prisma.employee.findUnique({
    where: { phoneNumber: validData.mobile },
  });

  console.log("Employee found:", employee);

  if (!employee) {
    // Also try to find all employees to debug
    const allEmployees = await prisma.employee.findMany({
      select: { phoneNumber: true }
    });
    console.log("All employee phone numbers in DB:", allEmployees.map(e => e.phoneNumber));
    
    return next(new ErrorResponse("Mobile number not registered. Please contact your employer.", statusCode.Not_Found));
  }

  const existingOtp = await prisma.otp.findUnique({
    where: { mobile: validData.mobile },
  });

  // Check if record is from a previous day (reset attempts if so)
  let attempts = 0;
  if (existingOtp) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const isSameDay = existingOtp.createdAt >= startOfDay;
    attempts = isSameDay ? existingOtp.attempts : 0;
  }

  // Enforce daily OTP request limit
  if (attempts >= MAX_DAILY_OTP_REQUESTS) {
    return next(new ErrorResponse(
      `Maximum ${MAX_DAILY_OTP_REQUESTS} OTP requests per day reached`,
      statusCode.Too_Many_Requests
    ));
  }

  // Generate OTP and validate length
  const otp = generateOtp();
  console.log(otp);
  if (otp.length !== OTP_LENGTH) {
    return next(new ErrorResponse("Invalid OTP generated", statusCode.Bad_Request));
  }

  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  const hashedOtp = await bcrypt.hash(otp, 10);

  // Create or update OTP record
  await prisma.otp.upsert({
    where: { mobile: validData.mobile },
    update: {
      otp: hashedOtp,
      expiresAt,
      attempts: attempts + 1,
      isUsed: false,
      lastAttemptedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      mobile: validData.mobile,
      otp: hashedOtp,
      expiresAt,
      attempts: 1,
      lastAttemptedAt: new Date(),
    },
  });

  return SuccessResponse(
    res,
    "OTP sent successfully",
    { mobile: validData.mobile, otp },
    statusCode.OK
  );
});

// Controller: Verify OTP and Login for Employee
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const validData = EmployeeLoginValidator.parse(req.body);

  // Check if employee exists in the database
  const employee = await prisma.employee.findUnique({
    where: { phoneNumber: validData.mobile },
    include: {
      company: true,
    },
  });

  if (!employee) {
    return next(new ErrorResponse("Mobile number not registered. Please contact your employer.", statusCode.Not_Found));
  }

  const storedOtp = await prisma.otp.findUnique({
    where: { mobile: validData.mobile },
  });

  if (!storedOtp) {
    return next(new ErrorResponse("OTP not found. Please request a new OTP.", statusCode.Not_Found));
  }

  // Check expiration
  if (new Date() > storedOtp.expiresAt) {
    await prisma.otp.delete({ where: { id: storedOtp.id } });
    return next(new ErrorResponse("OTP has expired", statusCode.Bad_Request));
  }

  // Check if already used
  if (storedOtp.isUsed) {
    return next(new ErrorResponse("OTP already used", statusCode.Bad_Request));
  }

  // Verify OTP
  const isMatch = await bcrypt.compare(validData.otp, storedOtp.otp);
  if (!isMatch) {
    return next(new ErrorResponse("Invalid OTP", statusCode.Bad_Request));
  }

  // Mark OTP as used
  await prisma.otp.update({
    where: { id: storedOtp.id },
    data: {
      isUsed: true,
      lastAttemptedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Generate JWT token
  const token = generateToken({ phone: validData.mobile, id: employee.id.toString(), userId: employee.userId });

  return res
    .status(statusCode.OK)
    .cookie("employee_token", token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
    .header("Authorization", `Bearer ${token}`)
    .json({
      success: true,
      message: "Login successfully",
      token,
      employee: {
        id: employee.id,
        userId: employee.userId,
        firstname: employee.firstname,
        lastname: employee.lastname,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        designation: employee.designation,
        employeeCode: employee.employeeCode,
      },
      company: employee.company
    });
});
