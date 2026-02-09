import { z } from "zod";

export const createShiftSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:mm)"),
  latePunchInLimit: z.number().int().min(0, "Limit must be non-negative").default(0),
});

export const updateShiftSchema = createShiftSchema.partial();

export const shiftIdSchema = z.object({
  id: z.string().cuid("Invalid shift ID"),
});
