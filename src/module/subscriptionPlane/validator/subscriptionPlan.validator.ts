import { z } from "zod";

export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.number().positive(),
  employeeLimit: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  employeeLimit: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const subscriptionPlanIdSchema = z.object({
  id: z.string().cuid(),
});
