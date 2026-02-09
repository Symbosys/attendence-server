import z from "zod";

export const EmployeeOtpValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid mobile number"),
});

export const EmployeeLoginValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid mobile number"),
  otp: z.string().length(4, "OTP must be 4 digits"),
});
