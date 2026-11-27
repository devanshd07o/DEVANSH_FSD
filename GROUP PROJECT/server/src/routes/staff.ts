import { Router } from "express";
import { prisma } from "../db/prisma";
import { StorageService } from "../integrations/storage";
import { ScrutinyService } from "../modules/scrutiny/scrutiny.service";
import { MeritService } from "../modules/merit/merit.service";
import { AllocationService } from "../modules/allocation/allocation.service";
import { PaymentService } from "../modules/payments/payment.service";
import { EnrollmentService } from "../modules/enrollment/enrollment.service";
import { fallbackPdf, hasRole, requireUser, STAFF_ROLES } from "../middleware/auth";

export const staffRouter = Router();

staffRouter.get("/scrutiny/queue", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });

  const applications = await prisma.application.findMany({
    where: {
      institutionId: user.institutionId,
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "CORRECTION_REQUIRED", "VERIFIED"] },
    },
    include: {
      applicant: { select: { id: true, name: true, email: true } },
      admissionTrack: { include: { program: true } },
      assignments: { where: { status: "ACTIVE" }, include: { reviewer: { select: { id: true, name: true } } } },
      revisions: { orderBy: { revisionNo: "desc" }, take: 1, include: { records: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  res.json({ applications });
});

staffRouter.post("/scrutiny/:id/claim", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["REVIEWER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, application: await ScrutinyService.claimApplication(req.params.id, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.post("/scrutiny/:id/defects", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["REVIEWER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    const result = await ScrutinyService.raiseDefects(req.params.id, user.userId, req.body.defects, req.body.reviewerNotes || "Correction requested");
    res.json({ success: true, application: result });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.post("/scrutiny/:id/approve", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["REVIEWER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const appRow = await prisma.application.findUnique({ where: { id: req.params.id }, select: { institutionId: true } });
    if (!appRow || appRow.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, application: await ScrutinyService.approveApplication(req.params.id, user.userId, req.body?.reviewerNotes) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.get("/documents/:id/download", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { application: true } });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.application.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });

  const isOwner = doc.application.applicantId === user.userId;
  const isPrivileged = hasRole(user, ["SUPER_ADMIN", "ADMISSIONS_OFFICER", "REGISTRAR"]);
  let isAllowedReviewer = false;
  if (user.roles.includes("REVIEWER") && doc.application.status !== "DRAFT") {
    const activeOther = await prisma.scrutinyAssignment.findFirst({
      where: { applicationId: doc.applicationId, status: "ACTIVE", reviewerId: { not: user.userId } },
    });
    if (!activeOther) isAllowedReviewer = true;
  }
  if (!isOwner && !isPrivileged && !isAllowedReviewer) return res.status(403).json({ error: "Forbidden" });

  const { buffer, exists } = await StorageService.getFile(doc.storageKey);
  res.setHeader("Content-Disposition", `inline; filename="${doc.originalName}"`);
  if (!exists) {
    res.setHeader("Content-Type", "application/pdf");
    return res.send(fallbackPdf(doc.originalName, doc.application.applicationNumber));
  }
  res.setHeader("Content-Type", doc.mimeType || "application/pdf");
  return res.send(buffer);
});

staffRouter.get("/admissions/overview", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const [totalApps, verifiedApps, openDefects, totalOffers, totalEnrolled, programs] = await Promise.all([
    prisma.application.count({ where: { institutionId: user.institutionId } }),
    prisma.application.count({ where: { institutionId: user.institutionId, status: "VERIFIED" } }),
    prisma.defect.count({ where: { status: "OPEN", application: { institutionId: user.institutionId } } }),
    prisma.allotmentOffer.count({ where: { status: { in: ["OFFERED", "ACCEPTED", "CONFIRMED"] }, application: { institutionId: user.institutionId } } }),
    prisma.enrollment.count({ where: { institutionId: user.institutionId } }),
    prisma.program.findMany({ where: { institutionId: user.institutionId }, include: { seatPools: true } }),
  ]);
  res.json({ metrics: { totalApps, verifiedApps, openDefects, totalOffers, totalEnrolled }, programs });
});

staffRouter.get("/admissions/seat-matrix", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const programs = await prisma.program.findMany({
    where: { institutionId: user.institutionId },
    include: { seatPools: { include: { category: true }, orderBy: { category: { percentage: "desc" } } } },
  });
  res.json({ programs });
});

staffRouter.get("/admissions/rounds", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const rounds = await prisma.admissionRound.findMany({
    where: { admissionTrack: { program: { institutionId: user.institutionId } } },
    include: {
      admissionTrack: { include: { program: { include: { seatPools: { include: { category: true } } } } } },
      meritRuns: { orderBy: { createdAt: "desc" }, include: { entries: { orderBy: { rank: "asc" }, include: { application: { include: { applicant: true } } } } } },
      allocationRuns: { orderBy: { createdAt: "desc" }, include: { offers: { include: { application: { include: { applicant: true } } } } } },
    },
  });
  res.json({ rounds });
});

staffRouter.post("/admissions/merit/preview", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["ADMISSIONS_OFFICER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const round = await prisma.admissionRound.findUnique({ where: { id: req.body.roundId }, include: { admissionTrack: { include: { program: { select: { institutionId: true } } } } } });
    if (!round || round.admissionTrack.program.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, result: await MeritService.computeMeritRun(req.body.roundId, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.post("/admissions/merit/publish", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["ADMISSIONS_OFFICER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const run = await prisma.meritRun.findUnique({ where: { id: req.body.meritRunId }, include: { admissionRound: { include: { admissionTrack: { include: { program: { select: { institutionId: true } } } } } } } });
    if (!run || run.admissionRound.admissionTrack.program.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, meritRun: await MeritService.publishMeritRun(req.body.meritRunId, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.post("/admissions/allocations/preview", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["ADMISSIONS_OFFICER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const round = await prisma.admissionRound.findUnique({ where: { id: req.body.roundId }, include: { admissionTrack: { include: { program: { select: { institutionId: true } } } } } });
    if (!round || round.admissionTrack.program.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, result: await AllocationService.runAllocationPreview(req.body.roundId, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.post("/admissions/allocations/publish", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["ADMISSIONS_OFFICER", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const alloc = await prisma.seatAllocationRun.findUnique({ where: { id: req.body.allocationId }, include: { admissionRound: { include: { admissionTrack: { include: { program: { select: { institutionId: true } } } } } } } });
    if (!alloc || alloc.admissionRound.admissionTrack.program.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, result: await AllocationService.publishAllocation(req.body.allocationId, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.get("/accounts/payments", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const orders = await prisma.paymentOrder.findMany({
    where: { application: { institutionId: user.institutionId } },
    include: { application: { include: { applicant: true } }, transactions: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

staffRouter.get("/accounts/enrollments", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const offers = await prisma.allotmentOffer.findMany({
    where: { status: "CONFIRMED", application: { institutionId: user.institutionId } },
    include: { application: { include: { applicant: true } }, enrollment: { include: { documents: true } } },
    orderBy: { offerIssuedAt: "desc" },
  });
  res.json({ offers });
});

staffRouter.post("/registrar/enrollments", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["REGISTRAR", "SUPER_ADMIN"])) return res.status(403).json({ error: "Forbidden" });
    const offer = await prisma.allotmentOffer.findUnique({ where: { id: req.body.offerId }, include: { application: { select: { institutionId: true } } } });
    if (!offer || offer.application.institutionId !== user.institutionId) return res.status(403).json({ error: "Forbidden" });
    res.json({ success: true, enrollment: await EnrollmentService.issueEnrollment(req.body.offerId, user.userId) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

staffRouter.get("/admin/audit", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, STAFF_ROLES)) return res.status(403).json({ error: "Forbidden" });
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { application: { institutionId: user.institutionId } },
        { actor: { userRoles: { some: { institutionId: user.institutionId } } } },
      ],
    },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: 50,
  });
  res.json({ auditLogs });
});

staffRouter.get("/verify/:token", async (req, res) => {
  res.json({ result: await EnrollmentService.verifyPublicDocument(req.params.token) });
});

staffRouter.post("/webhooks/payments/:provider", async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch {}
    const eventId = (req.headers["x-razorpay-event-id"] as string) || (req.headers["x-event-id"] as string) || payload?.id || `evt_${req.params.provider}_${Date.now()}`;
    const signature = (req.headers["x-razorpay-signature"] as string) || "";
    const result = await PaymentService.handleWebhook(req.params.provider, eventId, rawBody, signature, payload);
    res.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook failed";
    res.status(msg === "INVALID_WEBHOOK_SIGNATURE" ? 400 : 500).json({ error: msg });
  }
});
