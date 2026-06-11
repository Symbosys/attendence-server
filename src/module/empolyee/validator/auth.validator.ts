import z from "zod";

export const EmployeeOtpValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid mobile number"),
});

export const EmployeeLoginValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid mobile number"),
  otp: z.string().length(4, "OTP must be 4 digits"),
});

export const EmployeePasswordLoginValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid phone number"),
  password: z.string().min(1, "Password is required"),
});
