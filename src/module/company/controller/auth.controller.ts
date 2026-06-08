import type { Request, Response } from "express";
import {
  LoginValidator,
  OtpValidator,
} from "../validator/auth.validator";
import { generateOtp } from "../../../utils/otp";
import {prisma} from "../../../config/prisma.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { statusCode } from "../../../types/type";
import { generateToken } from "../../../utils/jwt";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { generateCompanyCode } from "../../../utils/utils.js";

const OTP_LENGTH = 4;
const OTP_EXPIRATION_MINUTES = 5;

const MAX_DAILY_OTP_REQUESTS = 50;
const COOLDOWN_MINUTES = 1;

// Controller: Request OTP
export const requestOtp = asyncHandler(async (req, res, next) => {
  const validData = OtpValidator.parse(req.body);

  if (!/^\+?\d{10,15}$/.test(validData.mobile)) {
    return next(new ErrorResponse("Invalid mobile number format", statusCode.Bad_Request));
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

  // Check cooldown period
  // if (existingOtp && existingOtp.lastAttemptedAt) {
  //   const cooldownEnd = new Date(existingOtp.lastAttemptedAt.getTime() + COOLDOWN_MINUTES * 60 * 1000);
  //   if (new Date() < cooldownEnd) {
  //     return next(new ErrorResponse(
  //       `Please wait ${COOLDOWN_MINUTES} minute(s) before requesting a new OTP`,
  //       statusCode.Too_Many_Requests
  //     ));
  //   }
  // }

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
    `OTP sent successfully. Your OTP is ${otp}`,
    { mobile: validData.mobile, otp },
    statusCode.OK
  );
});

const COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

// Controller: Verify OTP and Login
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const validData = LoginValidator.parse(req.body);

  const storedOtp = await prisma.otp.findUnique({
    where: { mobile: validData.mobile },
  });

  if (!storedOtp) {
    return next(new ErrorResponse("OTP not found", statusCode.Not_Found));
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

  // Check cooldown between verification attempts
  // if (storedOtp.lastAttemptedAt) {
  //   const cooldownEnd = new Date(storedOtp.lastAttemptedAt.getTime() + COOLDOWN_SECONDS * 1000);  // 30 seconds cooldown
  //   if (new Date() < cooldownEnd) {
  //     throw new ErrorResponse(
  //       `Please wait ${COOLDOWN_SECONDS} seconds before trying again`,
  //       statusCode.Too_Many_Requests
  //     );
  //   }
  // }

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

  let  company = await prisma.company.findUnique({
    where: { phone: validData.mobile },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {   phone: validData.mobile, code: generateCompanyCode() },
    });
  } 
  const token = generateToken({ phone: validData.mobile, id: company.id.toString() });

  // Generate JWT token

  return res
  .status(statusCode.OK)
  .cookie("company_token", token, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
  .header("Authorization", `Bearer ${token}`)
  .json({
    success: true,
    message: "Login successfully",
    token,
    company
  });
});