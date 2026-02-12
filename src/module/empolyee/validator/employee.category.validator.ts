import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  employeeIds: z.array(z.string().cuid()).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").optional(),
  employeeIds: z.array(z.string().cuid()).optional(),
});

export const categoryIdSchema = z.object({
  id: z.string().cuid("Invalid category ID"),
});
