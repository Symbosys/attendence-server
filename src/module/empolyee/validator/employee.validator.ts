import { z } from "zod";

export const EmployeeOnboardValidator = z.object({
  // Company ID
  companyId: z.string().cuid("Invalid Company ID"),
  // Employee Basic Details
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  employeeCode: z.number().int().optional(),
  designation: z.string().optional(),
  phoneNumber: z.string().regex(/^\+?\d{10,15}$/, "Invalid phone number"),
  Country: z.string().optional(),
  salary: z.number().int().optional(),
  birthDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  bloodGroup: z.enum([
    "A_POSITIVE",
    "A_NEGATIVE",
    "B_POSITIVE",
    "B_NEGATIVE",
    "AB_POSITIVE",
    "AB_NEGATIVE",
    "O_POSITIVE",
    "O_NEGATIVE"
  ]).optional().nullable(),

  // Employee Settings
  weekOffExtraPayment: z.boolean().default(true),
  weekOffDay: z.string().optional().nullable(),
  applicableToOvertime: z.boolean().default(true),
  shiftwiseAttendance: z.boolean().default(true),
  payrollConfiguration: z.string().min(1, "Payroll configuration is required"),
  numberOfCasualLeaves: z.number().int().default(0),
  numberOfSickLeaves: z.number().int().default(0),
  numberOfPrivilegeLeaves: z.number().int().default(0),
  numberOfEmergencyLeaves: z.number().int().default(0),
  addDocument: z.any().optional(), // Json
  multipleAttendance: z.boolean().default(true),
  liveTracking: z.boolean().default(true),
  mobileAttendance: z.boolean().default(true),
  aiFingerprintVerification: z.boolean().default(true),
  selfCustomDaywiseSalary: z.boolean().default(true),
  viewSelfSalary: z.boolean().default(true),
  selfOdometerReading: z.boolean().default(true),
  dateOfJoining: z.string().transform((val) => new Date(val)),
  punchFromGeofence: z.enum(["PUNCH_FROM_GEOFENCE", "PUNCH_FROM_ANYWHERE"]).default("PUNCH_FROM_GEOFENCE"),

  // Bank Details
  panNumber: z.string().min(1, "PAN number is required"),
  bankAccountNumber: z.string().min(1, "Bank account number is required"),
  bankIfscCode: z.string().min(1, "Bank IFSC code is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankBranchName: z.string().min(1, "Bank branch name is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  address: z.string().min(1, "Address is required"),
});

export const EmployeeIdValidator = z.object({
  id: z.string().cuid("Invalid ID format"),
});

export const GetEmployeesQueryValidator = z.object({
  companyId: z.string().cuid("Invalid Company ID").optional(),
  search: z.string().optional(),
  designation: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});
