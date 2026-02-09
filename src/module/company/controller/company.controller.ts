import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import { generateCompanyCode } from "../../../utils/utils.js";
import { CompanyIdValidator, OnboardValidator } from "../validator/company.validator.js";

/**
 * @desc Onboard a new company or update existing one
 * @route POST /api/v1/company/onboard
 * @access Private
 */
export const onboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const validatedData = OnboardValidator.parse(req.body);
  
  const { email, phone, code } = validatedData;
  
  // Handle Logo Upload
  let logoData = undefined;
  if (req.file) {
    logoData = {
      public_id: req.file.filename,
      secure_url: `/uploads/${req.file.filename}`,
    };
  }

  let company;

  // Try to find the company by phone, email or code to update
  if (phone || email || code) {
    company = await prisma.company.findFirst({
      where: {
        OR: [
          phone ? { phone } : {},
          email ? { email } : {},
          code ? { code } : {},
        ].filter(condition => Object.keys(condition).length > 0)
      }
    });
  }

  if (company) {
    // Update existing company
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...validatedData,
        logo: logoData || company.logo || undefined,
      },
    });
  } else {
    // Create new company
    company = await prisma.company.create({
      data: {
        ...validatedData,
        logo: logoData,
        // If code wasn't provided, generate one
        code: code || generateCompanyCode(),
      },
    });
  }

  return SuccessResponse(res, "Company onboarded successfully", company, statusCode.Created);
});

/**
 * @desc Get company details by ID
 * @route GET /api/v1/company/:id
 * @access Private
 */
export const getCompanyById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = CompanyIdValidator.parse(req.params);

  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) {
    return next(new ErrorResponse("Company not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Company fetched successfully", company, statusCode.OK);
});
