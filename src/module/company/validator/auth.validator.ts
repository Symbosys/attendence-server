import z from "zod"

export const OtpValidator = z.object({
  mobile: z.string().regex(/^\+?\d{10,15}$/, "Invalid mobile number"),
});

export const LoginValidator = z.object({
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(10, "Mobile number must be at most 10 digits"),
  otp: z.string().length(4, "OTP must be 4 digits"),
});