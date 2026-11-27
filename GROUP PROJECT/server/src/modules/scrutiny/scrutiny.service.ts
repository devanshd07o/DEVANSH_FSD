import { prisma } from "../../db/prisma";

export interface RaiseDefectInput {
  documentId?: string;
  fieldPath?: string;
  reasonCode: string;
  studentComment: string;
  internalNote?: string;
  dueDays?: number;
}

export class ScrutinyService {
  /**
   * Fetch queue of applications needing review
   */
  static async getQueue(reviewerId?: string, programFilter?: string) {
    const where: any = {
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"] },
    };

    if (programFilter) {
      where.admissionTrack = {
        program: { code: programFilter },
      };
    }

    return prisma.application.findMany({
      where,
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        admissionTrack: {
          include: { program: true },
        },
        assignments: {
          where: { status: "ACTIVE" },
          include: { reviewer: { select: { id: true, name: true } } },
        },
        defects: { where: { status: "OPEN" } },
        revisions: { orderBy: { revisionNo: "desc" }, take: 1 },
      },
      orderBy: { submittedAt: "asc" },
    });
  }

  /**
   * Atomically claim an application for review
   */
  static async claimApplication(applicationId: string, reviewerId: string) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: { assignments: { where: { status: "ACTIVE" } } },
      });

      if (!app) throw new Error("Application not found.");
      if (app.status !== "SUBMITTED" && app.status !== "RESUBMITTED" && app.status !== "UNDER_REVIEW") {
        throw new Error(`Cannot claim application in ${app.status} status.`);
      }

      const activeClaim = app.assignments[0];
      if (activeClaim && activeClaim.reviewerId !== reviewerId) {
        throw new Error("Application has already been claimed by another reviewer.");
      }

      if (!activeClaim) {
        await tx.scrutinyAssignment.create({
          data: {
            applicationId,
            reviewerId,
            status: "ACTIVE",
          },
        });
      }

      // Transition to UNDER_REVIEW
      return tx.application.update({
        where: { id: applicationId },
        data: {
          status: "UNDER_REVIEW",
          version: { increment: 1 },
        },
      });
    });
  }

  /**
   * Raise actionable defect and move application to CORRECTION_REQUIRED
   */
  static async raiseDefects(
    applicationId: string,
    reviewerId: string,
    defects: RaiseDefectInput[],
    reviewerNotes: string
  ) {
    if (!defects || defects.length === 0) {
      throw new Error("At least one defect must be specified.");
    }

    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: { assignments: { where: { status: "ACTIVE" } } },
      });

      if (!app) throw new Error("Application not found.");
      if (app.status !== "UNDER_REVIEW") {
        throw new Error("Application must be in UNDER_REVIEW status to raise defects.");
      }

      const activeClaim = app.assignments[0];
      if (activeClaim && activeClaim.reviewerId !== reviewerId) {
        const userRoles = await tx.userRole.findMany({
          where: { userId: reviewerId },
          include: { role: true },
        });
        const isSuperAdmin = userRoles.some((ur) => ur.role.code === "SUPER_ADMIN");
        if (!isSuperAdmin) {
          throw new Error("UNAUTHORIZED_REVIEWER: Reviewer not assigned to this application.");
        }
      }

      // Record Scrutiny Review
      const review = await tx.scrutinyReview.create({
        data: {
          applicationId,
          reviewerId,
          revisionNo: app.currentRevisionNo,
          decision: "CORRECTION_REQUESTED",
          reviewerNotes,
        },
      });

      // Default due 3 days from now
      for (const d of defects) {
        const days = d.dueDays ?? 3;
        const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await tx.defect.create({
          data: {
            applicationId,
            reviewId: review.id,
            documentId: d.documentId,
            fieldPath: d.fieldPath,
            reasonCode: d.reasonCode,
            studentComment: d.studentComment,
            internalNote: d.internalNote,
            status: "OPEN",
            dueAt,
          },
        });
      }

      // Transition Application to CORRECTION_REQUIRED
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: "CORRECTION_REQUIRED",
          version: { increment: 1 },
        },
      });

      // Release active assignment
      await tx.scrutinyAssignment.updateMany({
        where: { applicationId, status: "ACTIVE" },
        data: { status: "COMPLETED", releasedAt: new Date() },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: "DEFECTS_RAISED",
          entityType: "Application",
          entityId: applicationId,
          applicationId,
          afterState: JSON.stringify({ defectCount: defects.length, reason: defects[0].reasonCode }),
        },
      });

      // Student notification
      await tx.notification.create({
        data: {
          userId: app.applicantId,
          title: `Action Required: Defects Reported on Application ${app.applicationNumber}`,
          message: defects[0].studentComment,
          linkUrl: `/student/applications/${app.id}/corrections`,
        },
      });

      return updated;
    });
  }

  /**
   * Approve scrutiny review and transition to VERIFIED
   */
  static async approveApplication(applicationId: string, reviewerId: string, reviewerNotes?: string) {
    return prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          defects: { where: { status: "OPEN" } },
          assignments: { where: { status: "ACTIVE" } },
        },
      });

      if (!app) throw new Error("Application not found.");
      if (app.status !== "UNDER_REVIEW") {
        throw new Error("Application must be in UNDER_REVIEW status to approve.");
      }

      const activeClaim = app.assignments[0];
      if (activeClaim && activeClaim.reviewerId !== reviewerId) {
        const userRoles = await tx.userRole.findMany({
          where: { userId: reviewerId },
          include: { role: true },
        });
        const isSuperAdmin = userRoles.some((ur) => ur.role.code === "SUPER_ADMIN");
        if (!isSuperAdmin) {
          throw new Error("UNAUTHORIZED_REVIEWER: Reviewer not assigned to this application.");
        }
      }

      if (app.defects.length > 0) {
        throw new Error("Cannot approve application with open unresolved defects.");
      }

      // Record Review
      await tx.scrutinyReview.create({
        data: {
          applicationId,
          reviewerId,
          revisionNo: app.currentRevisionNo,
          decision: "APPROVED",
          reviewerNotes: reviewerNotes || "All documents and academic qualifications verified.",
        },
      });

      // Transition to VERIFIED
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: "VERIFIED",
          version: { increment: 1 },
        },
      });

      // Complete assignment
      await tx.scrutinyAssignment.updateMany({
        where: { applicationId, status: "ACTIVE" },
        data: { status: "COMPLETED", releasedAt: new Date() },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: "SCRUTINY_APPROVED",
          entityType: "Application",
          entityId: applicationId,
          applicationId,
        },
      });

      // Student notification
      await tx.notification.create({
        data: {
          userId: app.applicantId,
          title: `Application ${app.applicationNumber} Verified!`,
          message: "Congratulations! Your application documents have been verified by the faculty committee.",
          linkUrl: `/student/applications/${app.id}/tracker`,
        },
      });

      return updated;
    });
  }
}
