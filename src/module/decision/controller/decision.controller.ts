import type { NextFunction, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";
import { statusCode } from "../../../types/type.js";
import { ErrorResponse, SuccessResponse } from "../../../utils/response.util.js";
import {
  companyApprovalSchema,
  createDecisionSchema,
  decisionIdSchema,
  getDecisionsQuerySchema,
  participantApprovalSchema,
  updateDecisionSchema,
} from "../validator/decision.validator.js";

/**
 * @desc Create a new decision
 * @route POST /api/v1/decision/create/:companyId
 * @access Public
 */
export const createDecision = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const validatedData = createDecisionSchema.parse(req.body);
  const { companyId } = req.params;

  const decision = await prisma.decision.create({
    data: {
      title: validatedData.title,
      description: validatedData.description,
      companyId,
      creatorId: null, // Publicly created
      participants: validatedData.participantIds ? {
        create: validatedData.participantIds.map((empId) => ({
          employeeId: empId,
        })),
      } : undefined,
    },
    include: {
      participants: {
        include: {
          employee: {
            select: { id: true, firstname: true, lastname: true, email: true },
          },
        },
      },
    },
  });

  return SuccessResponse(res, "Decision created successfully", decision, statusCode.Created);
});

/**
 * @desc Get all decisions for a company
 * @route GET /api/v1/decision/all/:companyId
 * @access Public
 */
export const getAllDecisions = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
  const { page, limit, status, creatorId, startDate, endDate } = getDecisionsQuerySchema.parse(req.query);
  const { companyId } = req.params;

  const skip = (page - 1) * limit;

  const where: any = {
    companyId,
    ...(status && { status }),
    ...(creatorId && { creatorId }),
  };

  if (startDate || endDate) {
    where.createdAt = {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    };
  }

  const [decisions, total] = await Promise.all([
    prisma.decision.findMany({
      where,
      include: {
        creator: { select: { id: true, firstname: true, lastname: true } },
        participants: {
          include: {
            employee: { select: { id: true, firstname: true, lastname: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.decision.count({ where }),
  ]);

  return SuccessResponse(res, "Decisions fetched successfully", {
    decisions,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }, statusCode.OK);
});

/**
 * @desc Get decision by ID
 * @route GET /api/v1/decision/:id
 * @access Private
 */
export const getDecisionById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = decisionIdSchema.parse(req.params);
  const companyId = req.user.companyId || req.user.id;

  const decision = await prisma.decision.findFirst({
    where: { id, companyId },
    include: {
      creator: { select: { id: true, firstname: true, lastname: true } },
      participants: {
        include: {
          employee: { select: { id: true, firstname: true, lastname: true } },
        },
      },
    },
  });

  if (!decision) {
    return next(new ErrorResponse("Decision not found", statusCode.Not_Found));
  }

  return SuccessResponse(res, "Decision fetched successfully", decision, statusCode.OK);
});

/**
 * @desc Update decision (Title/Description)
 * @route PUT /api/v1/decision/:id
 * @access Private (Creator/Company)
 */
export const updateDecision = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = decisionIdSchema.parse(req.params);
  const validatedData = updateDecisionSchema.parse(req.body);
  const companyId = req.user.companyId || req.user.id;

  const decision = await prisma.decision.findFirst({
    where: { id, companyId },
  });

  if (!decision) {
    return next(new ErrorResponse("Decision not found", statusCode.Not_Found));
  }

  const updatedDecision = await prisma.decision.update({
    where: { id },
    data: validatedData,
  });

  return SuccessResponse(res, "Decision updated successfully", updatedDecision, statusCode.OK);
});

/**
 * @desc Delete decision
 * @route DELETE /api/v1/decision/:id
 * @access Private (Company)
 */
export const deleteDecision = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = decisionIdSchema.parse(req.params);
  const companyId = req.user.companyId || req.user.id;

  const decision = await prisma.decision.findFirst({
    where: { id, companyId },
  });

  if (!decision) {
    return next(new ErrorResponse("Decision not found", statusCode.Not_Found));
  }

  await prisma.decision.delete({
    where: { id },
  });

  return SuccessResponse(res, "Decision deleted successfully", null, statusCode.OK);
});

/**
 * @desc Participant approval/rejection
 * @route POST /api/v1/decision/:id/approve
 * @access Private (Employee)
 */
export const giveParticipantApproval = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = decisionIdSchema.parse(req.params);
  const { status, comment } = participantApprovalSchema.parse(req.body);
  const employeeId = req.user.id;

  const participant = await prisma.decisionParticipant.findFirst({
    where: { decisionId: id, employeeId },
  });

  if (!participant) {
    return next(new ErrorResponse("You are not a participant in this decision", statusCode.Forbidden));
  }

  const updatedParticipant = await prisma.decisionParticipant.update({
    where: { id: participant.id },
    data: {
      status,
      comment,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });

  // Check if all participants and company have approved to update main decision status
  await checkAndUpdateDecisionStatus(id);

  return SuccessResponse(res, "Approval submitted successfully", updatedParticipant, statusCode.OK);
});

/**
 * @desc Company/Admin approval
 * @route POST /api/v1/decision/:id/company-approve
 * @access Private (Company Admin)
 */
export const giveCompanyApproval = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = decisionIdSchema.parse(req.params);
  const { status } = companyApprovalSchema.parse(req.body);
  const companyId = req.user.id; 

  const decision = await prisma.decision.findFirst({
    where: { id, companyId },
  });

  if (!decision) {
    return next(new ErrorResponse("Decision not found", statusCode.Not_Found));
  }

  await prisma.decision.update({
    where: { id },
    data: { companyApproval: status },
  });

  await checkAndUpdateDecisionStatus(id);

  return SuccessResponse(res, "Company approval updated successfully", null, statusCode.OK);
});

/**
 * Helper to update Decision status based on all approvals
 */
async function checkAndUpdateDecisionStatus(decisionId: string) {
  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    include: { participants: true },
  });

  if (!decision) return;

  const allParticipantsApproved = decision.participants.length > 0 
    ? decision.participants.every(p => p.status === "APPROVED")
    : true;

  const companyApproved = decision.companyApproval === "APPROVED";

  if (allParticipantsApproved && companyApproved) {
    await prisma.decision.update({
      where: { id: decisionId },
      data: { status: "APPROVED" },
    });
  } else if (decision.companyApproval === "REJECTED" || decision.participants.some(p => p.status === "REJECTED")) {
    await prisma.decision.update({
      where: { id: decisionId },
      data: { status: "REJECTED" },
    });
  }
}
