import { z } from "zod";

export const DecisionStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
export const ApprovalStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createDecisionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  participantIds: z.array(z.string().cuid("Invalid employee ID")).optional(),
});

export const updateDecisionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: DecisionStatusEnum.optional(),
});

export const participantApprovalSchema = z.object({
  status: ApprovalStatusEnum,
  comment: z.string().optional(),
});

export const companyApprovalSchema = z.object({
  status: ApprovalStatusEnum,
});

export const decisionIdSchema = z.object({
  id: z.string().cuid("Invalid decision ID"),
});

export const getDecisionsQuerySchema = z.object({
  status: DecisionStatusEnum.optional(),
  creatorId: z.string().cuid("Invalid creator ID").optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }).optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});
