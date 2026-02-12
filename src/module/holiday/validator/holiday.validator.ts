import { z } from "zod";

export const createHolidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  description: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid holiday date",
  }),
  isPaid: z.boolean().default(true),
});

export const updateHolidaySchema = createHolidaySchema.partial();

export const getHolidaysQuerySchema = z.object({
  year: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  month: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }),
});

export const holidayIdSchema = z.object({
  id: z.string().cuid("Invalid holiday ID"),
});
