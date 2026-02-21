import type { NextFunction, Request, Response } from "express";
import { statusCode } from "../types/type.js";
import { verifyToken } from "../utils/jwt.js";
import { ErrorResponse } from "../utils/response.util.js";
import { asyncHandler } from "./error.middleware.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const protectCompany = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  // 1. Check Authorization Header (Bearer or Raw)
  if (req.headers.authorization) {
    if (req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else {
      token = req.headers.authorization;
    }
  } 
  // 2. Check for token in headers (alternative names)
  else if (req.headers.token) {
    token = req.headers.token as string;
  }
  else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"] as string;
  }
  // 3. Check for token in cookies
  else if (req.cookies?.company_token) {
    token = req.cookies.company_token;
  }

  if (!token) {
    return next(new ErrorResponse("Authentication token is missing. Please login first.", statusCode.Unauthorized));
  }

  try {
    const decoded = verifyToken(token) as any;
    
    // Check if verifyToken returned an error
    if (decoded instanceof Error || (decoded && decoded.name === "JsonWebTokenError")) {
        return next(new ErrorResponse("Invalid or expired token. Please login again.", statusCode.Unauthorized));
    }

    if (!decoded || !decoded.id) {
        return next(new ErrorResponse("Token payload is invalid.", statusCode.Unauthorized));
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return next(new ErrorResponse("Authentication failed", statusCode.Unauthorized));
  }
});

export const protectAdmin = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return next(new ErrorResponse("Admin access denied. Please login.", statusCode.Unauthorized));
  }

  try {
    const decoded = verifyToken(token) as any;
    
    if (decoded instanceof Error || (decoded && decoded.name === "JsonWebTokenError")) {
      return next(new ErrorResponse("Invalid or expired session.", statusCode.Unauthorized));
    }

    if (!decoded || !decoded.id || !decoded.role) {
      return next(new ErrorResponse("Invalid admin credentials.", statusCode.Unauthorized));
    }

    req.user = decoded;
    next();
  } catch (error) {
    return next(new ErrorResponse("Admin authentication failed", statusCode.Unauthorized));
  }
});
