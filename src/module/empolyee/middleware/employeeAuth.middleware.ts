import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { verifyToken } from "../../../utils/jwt.js";
import { ErrorResponse } from "../../../utils/response.util.js";

export interface EmployeeAuthRequest extends Request {
  employee?: {
    id: string;
    phone: string;
    userId: string;
  };
}

export const protectEmployee = asyncHandler(async (req: EmployeeAuthRequest, res: Response, next: NextFunction) => {
  let token;

  // 1. Check Authorization Header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } 
  // 2. Check for token in cookies
  else if (req.cookies?.employee_token) {
    token = req.cookies.employee_token;
  }

  if (!token) {
    return next(new ErrorResponse("Authentication token is missing. Please login first.", statusCode.Unauthorized));
  }

  try {
    const decoded = verifyToken(token) as any;
    
    if (decoded instanceof Error || (decoded && decoded.name === "JsonWebTokenError")) {
        return next(new ErrorResponse("Invalid or expired token. Please login again.", statusCode.Unauthorized));
    }

    if (!decoded || !decoded.id) {
        return next(new ErrorResponse("Token payload is invalid.", statusCode.Unauthorized));
    }

    req.employee = decoded;
    next();
  } catch (error) {
    console.error("Employee Auth Middleware Error:", error);
    return next(new ErrorResponse("Authentication failed", statusCode.Unauthorized));
  }
});
