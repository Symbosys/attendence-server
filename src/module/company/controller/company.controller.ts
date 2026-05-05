import type { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import { uploadToCloudinary } from "../../../config/cloudinary.js";
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
  const validatedData = OnboardValidator.parse(req.body) as any;

  // Map any variations of business name to the standard 'name' field
  const resolvedName = validatedData.name || validatedData.businessName || validatedData.companyName || req.body.name || req.body.businessName || req.body.companyName || req.body.business_name || req.body.company_name;
  
  if (resolvedName) {
    validatedData.name = resolvedName;
  }

  // Handle date resolution (matching the misspelled schema field)
  const resolvedDate = validatedData.estiblishedDate || (req.body.establishedDate ? new Date(req.body.establishedDate) : undefined) || (req.body.estiblishedDate ? new Date(req.body.estiblishedDate) : undefined);
  if (resolvedDate) {
    validatedData.estiblishedDate = resolvedDate;
  }

  // Remove alias fields that are not in the Prisma schema
  delete (validatedData as any).businessName;
  delete (validatedData as any).companyName;
  delete (validatedData as any).business_name;
  delete (validatedData as any).company_name;
  delete (validatedData as any).establishedDate;

  const { email, phone, code } = validatedData;
  
  // Handle Logo Upload
  let logoData = undefined;
  if (req.file) {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const result = await uploadToCloudinary(fileBuffer, "company_logos");
      logoData = {
        public_id: result.public_id,
        secure_url: result.secure_url,
      };

      // Cleanup local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (error: any) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return next(new ErrorResponse(error.message || "Failed to upload logo to Cloudinary", statusCode.Internal_Server_Error));
    }
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
        name: validatedData.name, // Explicitly set resolved name
        logo: logoData || company.logo || undefined,
      },
    });
  } else {
    // Create new company
    company = await prisma.company.create({
      data: {
        ...validatedData,
        name: validatedData.name, // Explicitly set resolved name
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
