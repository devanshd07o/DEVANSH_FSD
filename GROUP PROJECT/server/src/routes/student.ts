import { Router } from "express";
import multer from "multer";
import { prisma } from "../db/prisma";
import { StorageService } from "../integrations/storage";
import { ApplicationService } from "../modules/applications/application.service";
import { AllocationService } from "../modules/allocation/allocation.service";
import { PaymentService } from "../modules/payments/payment.service";
import { EnrollmentService } from "../modules/enrollment/enrollment.service";
import { checkUpload, hasRole, requireUser, STAFF_ROLES } from "../middleware/auth";

export const studentRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

studentRouter.get("/student/dashboard", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const applications = await prisma.application.findMany({
    where: { applicantId: user.userId, institutionId: user.institutionId },
    include: {
      admissionTrack: { include: { program: true } },
      defects: { where: { status: "OPEN" } },
      offers: { orderBy: { offerIssuedAt: "desc" }, take: 1 },
      enrollment: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ applications });
});

studentRouter.get("/student/tracks", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const tracks = await prisma.admissionTrack.findMany({
    where: { academicYear: { institutionId: user.institutionId } },
    include: { program: true },
  });
  res.json({ tracks });
});

studentRouter.post("/applications", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const track = await prisma.admissionTrack.findUnique({ where: { id: req.body.trackId }, include: { academicYear: true } });
    if (!track || track.academicYear.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ application: await ApplicationService.createDraft(user.userId, req.body.trackId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.get("/applications/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: {
      applicant: { include: { profile: true } },
      admissionTrack: { include: { program: true, requiredDocs: true } },
      documents: { where: { isCurrent: true } },
      defects: { orderBy: { createdAt: "desc" }, include: { document: { include: { documentType: true } } } },
      revisions: { orderBy: { revisionNo: "desc" }, include: { records: true, claims: true } },
      assignments: { where: { status: "ACTIVE" }, include: { reviewer: { select: { id: true, name: true } } } },
      offers: { orderBy: { offerIssuedAt: "desc" }, take: 1 },
      enrollment: true,
      meritEntries: { take: 1 },
    },
  });
  if (!application || application.institutionId !== user.institutionId) return res.status(404).json({ error: "Not found" });
  if (application.applicantId !== user.userId && !hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  res.json({ application });
});

studentRouter.patch("/applications/:id/draft", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    const updated = await ApplicationService.saveDraft(req.params.id, user.userId, req.body.data, req.body.expectedVersion);
    res.json({ success: true, version: updated.version });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.post("/applications/:id/documents", upload.single("file"), async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id } });
    if (!appRow || appRow.applicantId !== user.userId || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    if (appRow.status !== "DRAFT") return res.status(400).json({ error: "Draft status required." });

    const file = req.file;
    const documentTypeId = req.body.documentTypeId;
    if (!file || !documentTypeId) return res.status(400).json({ error: "File and documentTypeId required." });
    const uploadErr = checkUpload(file);
    if (uploadErr) return res.status(400).json({ error: uploadErr });

    const saved = await StorageService.saveFile(file.buffer, file.originalname, file.mimetype);
    await prisma.document.updateMany({ where: { applicationId: appRow.id, documentTypeId, isCurrent: true }, data: { isCurrent: false } });
    const doc = await prisma.document.create({
      data: {
        applicationId: appRow.id,
        documentTypeId,
        originalName: file.originalname,
        storageKey: saved.storageKey,
        byteSize: saved.byteSize,
        mimeType: file.mimetype || "application/pdf",
        checksumSha256: saved.checksumSha256,
        uploadStatus: "READY",
        isCurrent: true,
      },
    });
    res.json({ success: true, document: doc });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

studentRouter.post("/applications/:id/submit", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    const submitted = await ApplicationService.submitApplication(req.params.id, user.userId);
    res.json({ success: true, status: submitted.status, applicationNumber: submitted.applicationNumber });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Submit failed" });
  }
});

studentRouter.post("/applications/:id/corrections", upload.single("file"), async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });

    let newFile = undefined;
    if (req.file && req.body.replacementDocTypeId) {
      const uploadErr = checkUpload(req.file);
      if (uploadErr) return res.status(400).json({ error: uploadErr });
      const saved = await StorageService.saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      newFile = {
        originalName: req.file.originalname,
        storageKey: saved.storageKey,
        byteSize: saved.byteSize,
        mimeType: req.file.mimetype || "application/pdf",
        checksumSha256: saved.checksumSha256,
      };
    }

    const updated = await ApplicationService.resubmitCorrection(req.params.id, user.userId, {
      studentNotes: req.body.studentNotes || "",
      replacementDocTypeId: req.body.replacementDocTypeId,
      newFile,
    });
    res.json({ success: true, status: updated.status, revisionNo: updated.currentRevisionNo });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Correction failed" });
  }
});

studentRouter.get("/student/offers", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const offers = await prisma.allotmentOffer.findMany({
    where: { application: { applicantId: user.userId, institutionId: user.institutionId } },
    include: { application: { include: { admissionTrack: { include: { program: true } } } }, enrollment: true },
    orderBy: { offerIssuedAt: "desc" },
  });
  res.json({ offers });
});

studentRouter.post("/student/offers/:id/accept", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const offer = await prisma.allotmentOffer.findUnique({ where: { id: req.params.id }, include: { application: { select: { institutionId: true } } } });
    if (!offer || offer.application.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, offer: await AllocationService.acceptSeatOffer(req.params.id, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.post("/student/offers/:id/decline", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const offer = await prisma.allotmentOffer.findUnique({ where: { id: req.params.id }, include: { application: { select: { institutionId: true } } } });
    if (!offer || offer.application.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, offer: await AllocationService.declineSeatOffer(req.params.id, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.get("/student/payments", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const offerId = req.query.offerId as string | undefined;
  const orders = await prisma.paymentOrder.findMany({
    where: { application: { applicantId: user.userId, institutionId: user.institutionId } },
    include: { application: { include: { admissionTrack: { include: { program: true } } } }, transactions: true },
    orderBy: { createdAt: "desc" },
  });
  const pendingOffer = offerId
    ? await prisma.allotmentOffer.findFirst({ where: { id: offerId, application: { applicantId: user.userId, institutionId: user.institutionId } } })
    : await prisma.allotmentOffer.findFirst({
        where: { application: { applicantId: user.userId, institutionId: user.institutionId }, status: { in: ["ACCEPTED", "PAYMENT_PENDING"] } },
      });
  res.json({ orders, pendingOffer });
});

studentRouter.post("/payments/orders", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { applicationId, feeType, offerId } = req.body;
    const appRow = await prisma.application.findUnique({ where: { id: applicationId }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, order: await PaymentService.createOrder(applicationId, user.userId, feeType, offerId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.post("/payments/confirm", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { orderId, gatewayPaymentId, signature } = req.body;
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId }, include: { application: true } });
    if (!order || order.application.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    if (order.application.applicantId !== user.userId && !hasRole(user, ["ACCOUNTS", "SUPER_ADMIN"])) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = await PaymentService.confirmPayment(orderId, gatewayPaymentId || `pay_mock_${Date.now()}`, signature || "mock_signature_verified");
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

studentRouter.get("/student/admission", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.userId, institutionId: user.institutionId },
    include: { application: true, program: true, academicYear: true, institution: true, documents: { where: { documentType: "ADMISSION_CONFIRMATION" } } },
  });
  const verificationToken = enrollment?.documents[0]?.verificationToken || "";
  const qrDataUrl = verificationToken ? await EnrollmentService.generateQRCode(verificationToken) : "";
  res.json({ enrollment, qrDataUrl, verificationToken });
});

studentRouter.get("/student/notifications", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json({ notifications: await prisma.notification.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "desc" } }) });
});
