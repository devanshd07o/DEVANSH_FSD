import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "../../db/prisma";

export class EnrollmentService {
  /**
   * Registrar issues final enrollment number upon confirmed offer & payment
   */
  static async issueEnrollment(offerId: string, registrarId: string) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.allotmentOffer.findUnique({
        where: { id: offerId },
        include: {
          application: {
            include: {
              applicant: true,
              institution: true,
              academicYear: true,
              admissionTrack: { include: { program: true } },
            },
          },
          payments: { where: { status: "PAID" } },
          enrollment: true,
        },
      });

      if (!offer) throw new Error("Seat offer not found.");
      if (offer.status !== "CONFIRMED") {
        throw new Error(`Cannot issue enrollment for offer in ${offer.status} status. Payment must be confirmed.`);
      }

      // If enrollment already exists, return existing (Idempotent)
      if (offer.enrollment) {
        return offer.enrollment;
      }

      const existingByApp = await tx.enrollment.findUnique({
        where: { applicationId: offer.applicationId },
      });
      if (existingByApp) return existingByApp;

      const app = offer.application;
      const program = app.admissionTrack.program;
      const year = app.academicYear;

      // Calculate sequential enrollment number
      const count = await tx.enrollment.count({
        where: {
          institutionId: app.institutionId,
          academicYearId: year.id,
          programId: program.id,
        },
      });

      const nextSeq = String(count + 1).padStart(4, "0");
      const instPrefix = app.institution.code.split("-")[0] || "CLG";
      const progCode = program.code.replace("BTECH-", "").replace("MCA-", "");
      const enrollmentNumber = `${instPrefix}/${year.code.split("-")[0]}/${progCode}/${nextSeq}`;

      const enrollment = await tx.enrollment.create({
        data: {
          enrollmentNumber,
          applicationId: app.id,
          offerId: offer.id,
          userId: app.applicantId,
          institutionId: app.institutionId,
          academicYearId: year.id,
          programId: program.id,
          status: "ACTIVE",
        },
      });

      // Generate Verification Token for QR
      const rawToken = crypto.randomBytes(24).toString("hex");
      const verificationToken = `token_${rawToken}`;

      await tx.generatedDocument.create({
        data: {
          enrollmentId: enrollment.id,
          documentType: "ADMISSION_CONFIRMATION",
          documentNumber: `ADM-${year.code.split("-")[0]}-${progCode}-${nextSeq}`,
          storageKey: `generated/${enrollmentNumber.replace(/\//g, "_")}.pdf`,
          verificationToken,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: registrarId,
          action: "ENROLLMENT_ISSUED",
          entityType: "Enrollment",
          entityId: enrollment.id,
          applicationId: app.id,
          afterState: JSON.stringify({ enrollmentNumber }),
        },
      });

      await tx.notification.create({
        data: {
          userId: app.applicantId,
          title: `Admission Confirmed! Enrollment No: ${enrollmentNumber}`,
          message: `Your enrollment at ${app.institution.name} has been formalized. Download your Admission Letter and Receipt.`,
          linkUrl: "/student/admission",
        },
      });

      return enrollment;
    });
  }

  /**
   * Generate QR Code Data URL for a verification token
   */
  static async generateQRCode(token: string): Promise<string> {
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify/${token}`;
    return QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: "#18181B",
        light: "#FFFFFF",
      },
    });
  }

  /**
   * Minimal Public Verification query with zero PII leakage
   */
  static async verifyPublicDocument(token: string) {
    const doc = await prisma.generatedDocument.findUnique({
      where: { verificationToken: token },
      include: {
        enrollment: {
          include: {
            institution: { select: { name: true, code: true } },
            academicYear: { select: { code: true } },
            program: { select: { name: true, code: true } },
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!doc) {
      return {
        status: "NOT_FOUND",
        message: "No authentic academic record corresponds to this verification token.",
      };
    }

    if (doc.enrollment.status === "CANCELLED" || doc.enrollment.status === "WITHDRAWN") {
      return {
        status: "REVOKED",
        message: "This admission credentials record has been formally cancelled or withdrawn by the Registrar.",
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        institutionName: doc.enrollment.institution.name,
      };
    }

    // Return strictly non-sensitive public validation attributes:
    // Mask applicant name partially (e.g. "A****v S****a") to protect student identity
    const maskedName = doc.enrollment.user.name
      .split(" ")
      .map((part) => (part.length > 2 ? part[0] + "*".repeat(part.length - 2) + part[part.length - 1] : part))
      .join(" ");

    return {
      status: "AUTHENTIC",
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      institutionName: doc.enrollment.institution.name,
      institutionCode: doc.enrollment.institution.code,
      programName: doc.enrollment.program.name,
      academicYear: doc.enrollment.academicYear.code,
      studentMaskedName: maskedName,
      issuedDate: doc.issuedAt.toISOString().split("T")[0],
    };
  }
}
