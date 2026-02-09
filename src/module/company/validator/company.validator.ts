import { z } from "zod";

export const OnboardValidator = z.object({
  name: z.string().min(1, "Company name is required").optional(),
  code: z.string().optional(),
  phone: z.string().optional(),
  numberOfEmployees: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
  address: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  website: z.string().url("Invalid website URL").optional(),
  gstNumber: z.string().optional(),
  estiblishedDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  payPeriod: z.enum(["FIXED_30_DAYS", "WEEK_OFF_PAID", "WEEK_OFF_UNPAID"]).optional(),
});

export const CompanyIdValidator = z.object({
  id: z.string().min(1, "Company ID is required"),
});
