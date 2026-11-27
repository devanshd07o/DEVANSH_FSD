import { prisma } from "../../db/prisma";

export interface SaveDraftInput {
  personalInfo?: {
    dob?: string;
    gender?: string;
    fatherName?: string;
    motherName?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  categoryCode?: string;
  qualifications?: Array<{
    examName: string;
    boardUniversity: string;
    passingYear: number;
    rollNumber: string;
    maxMarks: number;
    obtainedMarks: number;
    percentage: number;
  }>;
  preferences?: string[]; // Program IDs in order of preference
}

export class ApplicationService {
  /**
   * Create a new draft application if window is open and user has no duplicate for this track
   */
  static async createDraft(userId: string, trackId: string) {
    const track = await prisma.admissionTrack.findUnique({
      where: { id: trackId },
      include: {
        academicYear: { include: { institution: true } },
        windows: { where: { isPublished: true } },
      },
    });

    if (!track) {
      throw new Error("Admission track not found.");
    }

    const window = track.windows[0];
    const now = new Date();
    if (window && (now < window.openDate || now > window.closeDate)) {
      throw new Error("Admission window is currently closed for this program.");
    }

    // Check for existing application
    const existing = await prisma.application.findFirst({
      where: {
        applicantId: userId,
        academicYearId: track.academicYearId,
        admissionTrackId: track.id,
      },
    });

    if (existing) {
      return existing;
    }

    const count = await prisma.application.count({
      where: { academicYearId: track.academicYearId },
    });
    const instPrefix = track.academicYear.institution.code.split("-")[0] || "CLG";
    let seq = count + 1;
    let appNumber = `${instPrefix}-${track.academicYear.code.split("-")[0]}-${String(seq).padStart(4, "0")}`;
    while (await prisma.application.findUnique({ where: { applicationNumber: appNumber } })) {
      seq += 1;
      appNumber = `${instPrefix}-${track.academicYear.code.split("-")[0]}-${String(seq).padStart(4, "0")}`;
    }

    return prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          applicationNumber: appNumber,
          applicantId: userId,
          institutionId: track.academicYear.institutionId,
          academicYearId: track.academicYearId,
          admissionTrackId: track.id,
          status: "DRAFT",
          currentRevisionNo: 1,
        },
      });

      // Create initial empty draft revision
      await tx.applicationRevision.create({
        data: {
          applicationId: app.id,
          revisionNo: 1,
          snapshotJson: JSON.stringify({}),
          isFrozen: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "APPLICATION_DRAFT_CREATED",
          entityType: "Application",
          entityId: app.id,
          applicationId: app.id,
        },
      });

      return app;
    });
  }

  /**
   * Save draft data with optimistic concurrency check
   */
  static async saveDraft(applicationId: string, userId: string, data: SaveDraftInput, expectedVersion?: number) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { revisions: { where: { revisionNo: 1 } } },
    });

    if (!app) throw new Error("Application not found.");
    if (app.applicantId !== userId) throw new Error("Unauthorized access to application.");
    if (app.status !== "DRAFT") throw new Error("Application has already been submitted and cannot be modified as a draft.");

    if (expectedVersion !== undefined && app.version !== expectedVersion) {
      throw new Error("CONCURRENCY_CONFLICT: Application was updated in another session. Please reload.");
    }

    return prisma.$transaction(async (tx) => {
      // Save profile if personal info provided
      if (data.personalInfo) {
        await tx.applicantProfile.upsert({
          where: { userId },
          update: {
            dob: data.personalInfo.dob ? new Date(data.personalInfo.dob) : new Date("2005-01-01"),
            gender: data.personalInfo.gender || "Unspecified",
            fatherName: data.personalInfo.fatherName || "",
            motherName: data.personalInfo.motherName || "",
            address: data.personalInfo.address || "",
            city: data.personalInfo.city || "",
            state: data.personalInfo.state || "",
            pincode: data.personalInfo.pincode || "",
          },
          create: {
            userId,
            dob: data.personalInfo.dob ? new Date(data.personalInfo.dob) : new Date("2005-01-01"),
            gender: data.personalInfo.gender || "Unspecified",
            fatherName: data.personalInfo.fatherName || "",
            motherName: data.personalInfo.motherName || "",
            address: data.personalInfo.address || "",
            city: data.personalInfo.city || "",
            state: data.personalInfo.state || "",
            pincode: data.personalInfo.pincode || "",
          },
        });
      }

      // Update current revision snapshot
      const currentRev = await tx.applicationRevision.findFirst({
        where: { applicationId: app.id, revisionNo: app.currentRevisionNo },
      });

      if (currentRev && !currentRev.isFrozen) {
        await tx.applicationRevision.update({
          where: { id: currentRev.id },
          data: {
            snapshotJson: JSON.stringify(data),
          },
        });

        // If qualifications provided, store records
        if (data.qualifications && data.qualifications.length > 0) {
          await tx.academicRecord.deleteMany({ where: { revisionId: currentRev.id } });
          for (const q of data.qualifications) {
            await tx.academicRecord.create({
              data: {
                revisionId: currentRev.id,
                examName: q.examName,
                boardUniversity: q.boardUniversity,
                passingYear: q.passingYear,
                rollNumber: q.rollNumber,
                maxMarks: q.maxMarks,
                obtainedMarks: q.obtainedMarks,
                percentage: q.percentage,
              },
            });
          }
        }

        // Category claim
        if (data.categoryCode) {
          await tx.categoryClaim.deleteMany({ where: { revisionId: currentRev.id } });
          await tx.categoryClaim.create({
            data: {
              revisionId: currentRev.id,
              categoryCode: data.categoryCode,
              verificationStatus: "PENDING",
            },
          });
        }
      }

      const updated = await tx.application.update({
        where: { id: applicationId },
        data: { version: { increment: 1 } },
      });

      return updated;
    });
  }

  /**
   * Submit an application
   */
  static async submitApplication(applicationId: string, userId: string) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        admissionTrack: {
          include: { requiredDocs: true },
        },
        revisions: {
          orderBy: { revisionNo: "desc" },
          take: 1,
          include: { records: true, claims: true },
        },
        documents: true,
      },
    });

    if (!app) throw new Error("Application not found.");
    if (app.applicantId !== userId) throw new Error("Unauthorized.");
    if (app.status !== "DRAFT") throw new Error(`Application already in ${app.status} status.`);

    // Ensure active revision exists
    let rev = app.revisions[0];
    if (!rev) {
      rev = await prisma.applicationRevision.create({
        data: {
          applicationId: app.id,
          revisionNo: 1,
          snapshotJson: JSON.stringify({}),
          isFrozen: false,
        },
        include: { records: true, claims: true },
      });
    }

    // Validate required documents exist and are READY
    const mandatoryDocTypes = app.admissionTrack.requiredDocs.filter((d) => d.isRequired);
    for (const reqDoc of mandatoryDocTypes) {
      const uploaded = app.documents.find(
        (doc) => doc.documentTypeId === reqDoc.id && doc.uploadStatus === "READY"
      );
      if (!uploaded) {
        throw new Error(`Missing required document: ${reqDoc.label}. Please upload before submitting.`);
      }
    }

    return prisma.$transaction(async (tx) => {
      // Freeze revision 1
      await tx.applicationRevision.update({
        where: { id: rev.id },
        data: {
          isFrozen: true,
          submittedAt: new Date(),
        },
      });

      // Update application to SUBMITTED
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Write audit
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "APPLICATION_SUBMITTED",
          entityType: "Application",
          entityId: app.id,
          applicationId: app.id,
        },
      });

      // Notification
      await tx.notification.create({
        data: {
          userId,
          title: `Application ${app.applicationNumber} Submitted`,
          message: "Your application has been received and queued for faculty document scrutiny.",
          linkUrl: `/student/applications/${app.id}/tracker`,
        },
      });

      return updated;
    });
  }

  /**
   * Resubmit after defect resolution
   */
  static async resubmitCorrection(
    applicationId: string,
    userId: string,
    corrections: {
      studentNotes?: string;
      replacementDocTypeId?: string;
      newFile?: { originalName: string; storageKey: string; byteSize: number; mimeType: string; checksumSha256?: string };
    }
  ) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        defects: { where: { status: "OPEN" } },
        revisions: {
          orderBy: { revisionNo: "desc" },
          take: 1,
          include: { records: true, claims: true },
        },
      },
    });

    if (!app) throw new Error("Application not found.");
    if (app.applicantId !== userId) throw new Error("Unauthorized.");
    if (app.status !== "CORRECTION_REQUIRED") {
      throw new Error("Application is not in CORRECTION_REQUIRED status.");
    }

    const openDefects = app.defects;
    if (openDefects.length === 0) {
      throw new Error("No open defects found on this application.");
    }

    // Check deadline
    const earliestDue = openDefects.reduce(
      (min, d) => (d.dueAt < min ? d.dueAt : min),
      openDefects[0].dueAt
    );
    if (new Date() > earliestDue) {
      throw new Error("Correction window has expired. Please contact admissions support.");
    }

    return prisma.$transaction(async (tx) => {
      const nextRevNo = app.currentRevisionNo + 1;
      const latestRev = app.revisions[0];

      // Handle replacement doc if provided
      if (corrections.replacementDocTypeId && corrections.newFile) {
        // Mark old docs of this type not current
        await tx.document.updateMany({
          where: {
            applicationId: app.id,
            documentTypeId: corrections.replacementDocTypeId,
          },
          data: { isCurrent: false },
        });

        // Create new replacement doc
        const newDoc = await tx.document.create({
          data: {
            applicationId: app.id,
            documentTypeId: corrections.replacementDocTypeId,
            originalName: corrections.newFile.originalName,
            storageKey: corrections.newFile.storageKey,
            byteSize: corrections.newFile.byteSize,
            mimeType: corrections.newFile.mimeType,
            checksumSha256: corrections.newFile.checksumSha256 || "sha256_verified",
            uploadStatus: "READY",
            isCurrent: true,
          },
        });

        await tx.defect.updateMany({
          where: {
            applicationId: app.id,
            status: "OPEN",
            OR: [
              { documentId: { not: null } },
              { fieldPath: { contains: corrections.replacementDocTypeId } },
              { fieldPath: "documents" },
            ],
          },
          data: {
            status: "FIXED",
            resolvedAt: new Date(),
          },
        });
      } else if (corrections.studentNotes) {
        await tx.defect.updateMany({
          where: { applicationId: app.id, status: "OPEN" },
          data: { status: "FIXED", resolvedAt: new Date() },
        });
      }

      const newRev = await tx.applicationRevision.create({
        data: {
          applicationId: app.id,
          revisionNo: nextRevNo,
          snapshotJson: latestRev ? latestRev.snapshotJson : "{}",
          changeSummary: corrections.studentNotes || "Defect corrections submitted by applicant.",
          isFrozen: true,
          submittedAt: new Date(),
        },
      });

      if (latestRev?.records?.length) {
        for (const rec of latestRev.records) {
          await tx.academicRecord.create({
            data: {
              revisionId: newRev.id,
              examName: rec.examName,
              boardUniversity: rec.boardUniversity,
              passingYear: rec.passingYear,
              rollNumber: rec.rollNumber,
              maxMarks: rec.maxMarks,
              obtainedMarks: rec.obtainedMarks,
              percentage: rec.percentage,
            },
          });
        }
      }

      if (latestRev?.claims?.length) {
        for (const claim of latestRev.claims) {
          await tx.categoryClaim.create({
            data: {
              revisionId: newRev.id,
              categoryCode: claim.categoryCode,
              certificateNo: claim.certificateNo,
              issuingAuthority: claim.issuingAuthority,
              verificationStatus: claim.verificationStatus,
            },
          });
        }
      }

      // Update application status to RESUBMITTED
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: "RESUBMITTED",
          currentRevisionNo: nextRevNo,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "APPLICATION_RESUBMITTED",
          entityType: "Application",
          entityId: app.id,
          applicationId: app.id,
          afterState: JSON.stringify({ revisionNo: nextRevNo }),
        },
      });

      return updated;
    });
  }
}
