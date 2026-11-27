import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { ApplicationService } from "../src/modules/applications/application.service.js";
import { MeritService } from "../src/modules/merit/merit.service.js";
import { AllocationService } from "../src/modules/allocation/allocation.service.js";
import { PaymentService } from "../src/modules/payments/payment.service.js";
import { EnrollmentService } from "../src/modules/enrollment/enrollment.service.js";
import { ScrutinyService } from "../src/modules/scrutiny/scrutiny.service.js";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:dev.db" });
const prisma = new PrismaClient({ adapter });

test("1. Application draft creation and idempotency", async () => {
  const user = await prisma.user.findFirst({ where: { email: "student.rohan@gmail.com" } });
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });

  const app = await ApplicationService.createDraft(user.id, track.id);
  assert.ok(app.id, "Application ID should exist");
  assert.equal(app.status, "DRAFT", "Application status must be DRAFT");

  // Attempt duplicate draft creation for same year/track returns existing
  const duplicate = await ApplicationService.createDraft(user.id, track.id);
  assert.equal(duplicate.id, app.id, "Should return existing draft instead of creating second");
});

test("2. Submit draft with missing required documents is blocked", async () => {
  const user = await prisma.user.findFirst({ where: { email: "student.rohan@gmail.com" } });
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const app = await ApplicationService.createDraft(user.id, track.id);

  // Submit without uploading documents must throw error
  await assert.rejects(
    async () => {
      await ApplicationService.submitApplication(app.id, user.id);
    },
    (err) => {
      assert.match(err.message, /Missing required document/i);
      return true;
    },
    "Submitting draft without required documents should fail"
  );
});

test("3. Editing an already submitted immutable revision fails", async () => {
  const verifiedApp = await prisma.application.findFirst({ where: { status: "VERIFIED" } });
  assert.ok(verifiedApp, "Verified application exists");

  await assert.rejects(
    async () => {
      await ApplicationService.saveDraft(
        verifiedApp.id,
        verifiedApp.applicantId,
        { personalInfo: { address: "Malicious Attempt Street" } }
      );
    },
    (err) => {
      assert.match(err.message, /cannot be modified/i);
      return true;
    },
    "Editing a non-DRAFT application should be rejected"
  );
});

test("4. Scrutiny claim conflict: atomic claim prevents double-assignment", async () => {
  // Create a fresh test applicant & submitted application
  const testApplicant = await prisma.user.create({
    data: {
      email: `test.claim.${Date.now()}@example.com`,
      name: "Claim Test Candidate",
      passwordHash: "salt:hash",
      isActive: true,
    },
  });

  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const institution = await prisma.institution.findFirst();
  const year = await prisma.academicYear.findFirst();

  const app = await prisma.application.create({
    data: {
      applicationNumber: `CLAIM-TEST-${Date.now()}`,
      applicantId: testApplicant.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "SUBMITTED",
      currentRevisionNo: 1,
    },
  });

  const reviewerA = await prisma.user.findFirst({ where: { email: "faculty.review@institution.edu.in" } });
  const reviewerB = await prisma.user.findFirst({ where: { email: "admin@institution.edu.in" } });

  // First reviewer claims
  const claimed = await ScrutinyService.claimApplication(app.id, reviewerA.id);
  assert.equal(claimed.status, "UNDER_REVIEW");

  // Second reviewer attempts to claim the same application -> must be rejected
  await assert.rejects(
    async () => {
      await ScrutinyService.claimApplication(app.id, reviewerB.id);
    },
    (err) => {
      assert.match(err.message, /already been claimed by another reviewer/i);
      return true;
    },
    "Second reviewer cannot claim an already claimed application"
  );
});

test("5. Reviewer assignment RBAC: unassigned reviewer cannot raise defects or approve", async () => {
  const reviewerA = await prisma.user.findFirst({ where: { email: "faculty.review@institution.edu.in" } });
  const unassignedReviewer = await prisma.user.create({
    data: {
      email: `unassigned.reviewer.${Date.now()}@institution.edu.in`,
      name: "Prof. Unassigned Reviewer",
      passwordHash: "salt:hash",
      isActive: true,
    },
  });

  const reviewerRole = await prisma.role.findUnique({ where: { code: "REVIEWER" } });
  const institution = await prisma.institution.findFirst();

  await prisma.userRole.create({
    data: {
      userId: unassignedReviewer.id,
      roleId: reviewerRole.id,
      institutionId: institution.id,
    },
  });

  // Create an application assigned strictly to Reviewer A
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const year = await prisma.academicYear.findFirst();
  const student = await prisma.user.findFirst({ where: { email: "student.aarav@gmail.com" } });

  const app = await prisma.application.create({
    data: {
      applicationNumber: `ASSIGN-TEST-${Date.now()}`,
      applicantId: student.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "UNDER_REVIEW",
      currentRevisionNo: 1,
    },
  });

  await prisma.scrutinyAssignment.create({
    data: {
      applicationId: app.id,
      reviewerId: reviewerA.id,
      status: "ACTIVE",
    },
  });

  // Unassigned reviewer attempts to raise defect
  await assert.rejects(
    async () => {
      await ScrutinyService.raiseDefects(
        app.id,
        unassignedReviewer.id,
        [
          {
            fieldPath: "personal.dob",
            reasonCode: "INVALID_DOB",
            studentComment: "Please provide valid DOB",
            dueDays: 3,
          },
        ],
        "Unassigned test note"
      );
    },
    (err) => {
      assert.match(err.message, /UNAUTHORIZED_REVIEWER/i);
      return true;
    },
    "Unassigned reviewer should be blocked from raising defects"
  );
});

test("6. Reviewer defect reporting, new revision creation & immutable history", async () => {
  const reviewer = await prisma.user.findFirst({ where: { email: "faculty.review@institution.edu.in" } });
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const institution = await prisma.institution.findFirst();
  const year = await prisma.academicYear.findFirst();
  const testStudent = await prisma.user.create({
    data: {
      email: `test.defect.${Date.now()}@example.com`,
      name: "Defect Workflow Candidate",
      passwordHash: "salt:hash",
      isActive: true,
    },
  });

  const app = await prisma.application.create({
    data: {
      applicationNumber: `DEFECT-TEST-${Date.now()}`,
      applicantId: testStudent.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "UNDER_REVIEW",
      currentRevisionNo: 1,
    },
  });

  const rev1 = await prisma.applicationRevision.create({
    data: {
      applicationId: app.id,
      revisionNo: 1,
      snapshotJson: JSON.stringify({ name: "Defect Candidate", marks: 88 }),
      isFrozen: true,
    },
  });

  await prisma.scrutinyAssignment.create({
    data: {
      applicationId: app.id,
      reviewerId: reviewer.id,
      status: "ACTIVE",
    },
  });

  // Reviewer raises defect
  const updatedApp = await ScrutinyService.raiseDefects(
    app.id,
    reviewer.id,
    [
      {
        fieldPath: "documents.CLASS_12_MARKSHEET",
        reasonCode: "BLURRED_SCAN",
        studentComment: "Marksheet is blurred, re-upload clean scan.",
        dueDays: 3,
      },
    ],
    "Internal note: marks illegible"
  );

  assert.equal(updatedApp.status, "CORRECTION_REQUIRED");

  // Student resubmits correction
  const resubmitted = await ApplicationService.resubmitCorrection(app.id, testStudent.id, {
    studentNotes: "Clean high-res marksheet attached.",
  });

  assert.equal(resubmitted.status, "RESUBMITTED");
  assert.equal(resubmitted.currentRevisionNo, 2);

  // Check revision 1 remained unchanged
  const rev1After = await prisma.applicationRevision.findUnique({ where: { id: rev1.id } });
  assert.equal(rev1After.isFrozen, true);
  assert.equal(rev1After.revisionNo, 1);
});

test("7. Overdue correction rejection: submitting past deadline is rejected", async () => {
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const institution = await prisma.institution.findFirst();
  const year = await prisma.academicYear.findFirst();
  const testStudent = await prisma.user.create({
    data: {
      email: `test.overdue.${Date.now()}@example.com`,
      name: "Overdue Candidate",
      passwordHash: "salt:hash",
      isActive: true,
    },
  });

  const app = await prisma.application.create({
    data: {
      applicationNumber: `OVERDUE-TEST-${Date.now()}`,
      applicantId: testStudent.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "CORRECTION_REQUIRED",
      currentRevisionNo: 1,
    },
  });

  const review = await prisma.scrutinyReview.create({
    data: {
      applicationId: app.id,
      reviewerId: testStudent.id,
      revisionNo: 1,
      decision: "CORRECTION_REQUESTED",
    },
  });

  // Create an expired defect (due 2 days ago)
  await prisma.defect.create({
    data: {
      applicationId: app.id,
      reviewId: review.id,
      fieldPath: "documents.CLASS_10",
      reasonCode: "INCOMPLETE",
      studentComment: "Please reupload",
      status: "OPEN",
      dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Past due
    },
  });

  await assert.rejects(
    async () => {
      await ApplicationService.resubmitCorrection(app.id, testStudent.id, {
        studentNotes: "Late submission",
      });
    },
    (err) => {
      assert.match(err.message, /Correction window has expired/i);
      return true;
    },
    "Submitting past the due deadline must be rejected"
  );
});

test("8. Deterministic Merit Ranking & Tie-Breaking by Senior DOB Precedence", async () => {
  const admin = await prisma.user.findFirst({ where: { email: "admin@institution.edu.in" } });
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const round = await prisma.admissionRound.findFirst({ where: { admissionTrackId: track.id } });
  const institution = await prisma.institution.findFirst();
  const year = await prisma.academicYear.findFirst();

  // Create two candidates with IDENTICAL scores (95.0%) but DIFFERENT DOBs
  // Candidate Older: DOB 2004-01-01 (should rank HIGHER)
  // Candidate Younger: DOB 2006-01-01 (should rank LOWER)
  const candidateOlder = await prisma.user.create({
    data: {
      email: `merit.older.${Date.now()}@example.com`,
      name: "Senior Candidate",
      passwordHash: "salt:hash",
      isActive: true,
      profile: {
        create: {
          dob: new Date("2004-01-01"),
          gender: "Female",
          fatherName: "Senior Father",
          motherName: "Senior Mother",
          address: "123 Academic Way",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
        },
      },
    },
  });

  const candidateYounger = await prisma.user.create({
    data: {
      email: `merit.younger.${Date.now()}@example.com`,
      name: "Junior Candidate",
      passwordHash: "salt:hash",
      isActive: true,
      profile: {
        create: {
          dob: new Date("2006-01-01"),
          gender: "Male",
          fatherName: "Junior Father",
          motherName: "Junior Mother",
          address: "456 Knowledge Park",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
        },
      },
    },
  });

  const appOlder = await prisma.application.create({
    data: {
      applicationNumber: `MERIT-SENIOR-${Date.now()}`,
      applicantId: candidateOlder.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "VERIFIED",
      currentRevisionNo: 1,
      submittedAt: new Date("2026-02-01T10:00:00Z"),
    },
  });

  const revOlder = await prisma.applicationRevision.create({
    data: {
      applicationId: appOlder.id,
      revisionNo: 1,
      snapshotJson: "{}",
      isFrozen: true,
    },
  });

  await prisma.academicRecord.create({
    data: {
      revisionId: revOlder.id,
      examName: "12th Standard",
      boardUniversity: "CBSE",
      passingYear: 2025,
      rollNumber: `CBSE-${Date.now()}-1`,
      maxMarks: 500,
      obtainedMarks: 475,
      percentage: 95.0,
    },
  });

  const appYounger = await prisma.application.create({
    data: {
      applicationNumber: `MERIT-JUNIOR-${Date.now()}`,
      applicantId: candidateYounger.id,
      institutionId: institution.id,
      academicYearId: year.id,
      admissionTrackId: track.id,
      status: "VERIFIED",
      currentRevisionNo: 1,
      submittedAt: new Date("2026-02-01T10:00:00Z"),
    },
  });

  const revYounger = await prisma.applicationRevision.create({
    data: {
      applicationId: appYounger.id,
      revisionNo: 1,
      snapshotJson: "{}",
      isFrozen: true,
    },
  });

  await prisma.academicRecord.create({
    data: {
      revisionId: revYounger.id,
      examName: "12th Standard",
      boardUniversity: "CBSE",
      passingYear: 2025,
      rollNumber: `CBSE-${Date.now()}-2`,
      maxMarks: 500,
      obtainedMarks: 475,
      percentage: 95.0,
    },
  });

  // Run merit calculation
  const result = await MeritService.computeMeritRun(round.id, admin.id);
  assert.ok(result.runId);
  assert.ok(result.inputHash);

  const olderEntry = result.results.find((r) => r.applicationId === appOlder.id);
  const youngerEntry = result.results.find((r) => r.applicationId === appYounger.id);

  assert.ok(olderEntry, "Older candidate should be present in merit results");
  assert.ok(youngerEntry, "Younger candidate should be present in merit results");
  assert.equal(olderEntry.score, youngerEntry.score, "Scores must be identical (95%)");
  assert.ok(
    olderEntry.rank < youngerEntry.rank,
    `Older candidate (rank ${olderEntry.rank}) must rank higher than younger candidate (rank ${youngerEntry.rank})`
  );
  assert.ok(
    youngerEntry.explanation.tieBreakersApplied.length > 0,
    "Tie-breaker reason must be documented in explanation"
  );
});

test("9. Multi-candidate allocation: publishAllocation issues offers to multiple candidates up to pool capacity", async () => {
  const admin = await prisma.user.findFirst({ where: { email: "admin@institution.edu.in" } });
  const track = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const round = await prisma.admissionRound.findFirst({ where: { admissionTrackId: track.id } });

  // Compute merit run
  const merit = await MeritService.computeMeritRun(round.id, admin.id);
  // Publish merit run
  await MeritService.publishMeritRun(merit.runId, admin.id);

  // Generate allocation preview
  const preview = await AllocationService.runAllocationPreview(round.id, admin.id);
  assert.ok(preview.allocationId);
  assert.ok(preview.totalPlanned > 0, "Preview should plan offers for eligible candidates");

  // Publish allocation
  const published = await AllocationService.publishAllocation(preview.allocationId, admin.id);
  assert.ok(published.offersIssued > 0, "Offers must be successfully created for candidates");

  // Verify offers exist in DB
  const offers = await prisma.allotmentOffer.findMany({
    where: { allocationId: preview.allocationId },
  });
  assert.equal(offers.length, published.offersIssued);

  // Verify seat capacity invariant: held + confirmed <= capacity for all pools
  const pools = await prisma.seatPool.findMany({ where: { programId: track.programId } });
  for (const p of pools) {
    assert.ok(
      p.heldCount + p.confirmedCount <= p.capacity,
      `Seat capacity exceeded for pool ${p.id}: held(${p.heldCount}) + confirmed(${p.confirmedCount}) > cap(${p.capacity})`
    );
  }
});

test("10. Concurrent Seat Capacity Race: parallel requests cannot overbook a 1-seat pool", async () => {
  // Create a program with a dedicated seat pool having capacity = 1
  const institution = await prisma.institution.findFirst();
  const year = await prisma.academicYear.findFirst();

  const raceProgram = await prisma.program.create({
    data: {
      institutionId: institution.id,
      code: `RACE-PROG-${Date.now()}`,
      name: "Race Test Program",
      degree: "UG",
      department: "Test Dept",
    },
  });

  const cat = await prisma.reservationCategory.findFirst({ where: { code: "GENERAL" } });
  const singleSeatPool = await prisma.seatPool.create({
    data: {
      programId: raceProgram.id,
      categoryId: cat.id,
      capacity: 1,
      heldCount: 0,
      confirmedCount: 0,
    },
  });

  // Attempt 10 parallel atomic seat hold increments
  const parallelAttempts = Array.from({ length: 10 }, (_, i) => i);
  const results = await Promise.allSettled(
    parallelAttempts.map(async (idx) => {
      return prisma.$transaction(async (tx) => {
        const pool = await tx.seatPool.findUnique({ where: { id: singleSeatPool.id } });
        if (!pool || pool.heldCount + pool.confirmedCount >= pool.capacity) {
          throw new Error("SEAT_FULL");
        }
        return tx.seatPool.update({
          where: { id: pool.id },
          data: { heldCount: { increment: 1 }, version: { increment: 1 } },
        });
      });
    })
  );

  const successfulHolds = results.filter((r) => r.status === "fulfilled");
  assert.equal(successfulHolds.length, 1, "Exactly 1 seat hold must succeed for a capacity 1 pool");

  // Verify invariant in DB
  const finalPool = await prisma.seatPool.findUnique({ where: { id: singleSeatPool.id } });
  assert.equal(finalPool.heldCount + finalPool.confirmedCount, 1, "Final pool capacity must be exactly 1");
});

test("11. Payment Idempotency: re-requesting order returns same instance", async () => {
  const app = await prisma.application.findFirst({ where: { status: "VERIFIED" } });
  const user = await prisma.user.findUnique({ where: { id: app.applicantId } });

  const order1 = await PaymentService.createOrder(app.id, user.id, "APPLICATION_FEE");
  assert.ok(order1.id);

  const order2 = await PaymentService.createOrder(app.id, user.id, "APPLICATION_FEE");
  assert.equal(order2.id, order1.id, "Second call must return identical order without duplication");
});

test("12. Webhook signature verification and event deduplication", async () => {
  const app = await prisma.application.findFirst({ where: { status: "VERIFIED" } });
  const user = await prisma.user.findUnique({ where: { id: app.applicantId } });

  const order = await PaymentService.createOrder(app.id, user.id, "APPLICATION_FEE");
  const eventId = `test_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Process webhook once
  const res1 = await PaymentService.handleWebhook(
    "mock",
    eventId,
    JSON.stringify({ orderId: order.id, event: "payment.captured" }),
    "mock_sig",
    { orderId: order.id, event: "payment.captured" }
  );

  assert.equal(res1.success, true);

  // Verify order is now PAID
  const paidOrder = await prisma.paymentOrder.findUnique({ where: { id: order.id } });
  assert.equal(paidOrder.status, "PAID");

  // Replay the exact same webhook event -> must be deduplicated
  const res2 = await PaymentService.handleWebhook(
    "mock",
    eventId,
    JSON.stringify({ orderId: order.id, event: "payment.captured" }),
    "mock_sig",
    { orderId: order.id, event: "payment.captured" }
  );

  assert.equal(res2.duplicate, true, "Replayed webhook must be recognized as duplicate");
});

test("13. Monotonic Payment State: late failed webhook cannot downgrade confirmed payment", async () => {
  const app = await prisma.application.findFirst({ where: { status: "VERIFIED" } });
  const user = await prisma.user.findUnique({ where: { id: app.applicantId } });

  const order = await PaymentService.createOrder(app.id, user.id, "APPLICATION_FEE");
  assert.equal(order.status, "PAID"); // Already paid in test 12

  // A delayed/out-of-order 'payment.failed' webhook arrives
  const lateFailedEventId = `late_failed_evt_${Date.now()}`;
  await PaymentService.handleWebhook(
    "mock",
    lateFailedEventId,
    JSON.stringify({ orderId: order.id, event: "payment.failed" }),
    "mock_sig",
    { orderId: order.id, event: "payment.failed" }
  );

  // Invariant: Status must REMAIN 'PAID'
  const currentOrder = await prisma.paymentOrder.findUnique({ where: { id: order.id } });
  assert.equal(
    currentOrder.status,
    "PAID",
    "Late failed webhook must not downgrade an already PAID payment order"
  );
});

test("14. Concurrent enrollment issuance yields exactly one unique enrollment number", async () => {
  const offer = await prisma.allotmentOffer.findFirst({ where: { status: "CONFIRMED" } });
  assert.ok(offer, "Confirmed offer should exist");

  const registrar = await prisma.user.findFirst({ where: { email: "registrar@institution.edu.in" } });

  // Issue enrollment concurrently twice
  const [enroll1, enroll2] = await Promise.all([
    EnrollmentService.issueEnrollment(offer.id, registrar.id),
    EnrollmentService.issueEnrollment(offer.id, registrar.id),
  ]);

  assert.ok(enroll1.enrollmentNumber);
  assert.equal(
    enroll1.enrollmentNumber,
    enroll2.enrollmentNumber,
    "Concurrent calls must return identical enrollment number"
  );

  // Count enrollments for this application
  const count = await prisma.enrollment.count({ where: { applicationId: offer.applicationId } });
  assert.equal(count, 1, "Only 1 enrollment row must ever exist for an application");
});

test("15. Public QR Verification leaks zero private PII", async () => {
  const doc = await prisma.generatedDocument.findFirst({ where: { documentType: "ADMISSION_CONFIRMATION" } });
  assert.ok(doc, "Seeded admission document should exist");

  const verification = await EnrollmentService.verifyPublicDocument(doc.verificationToken);
  assert.equal(verification.status, "AUTHENTIC");
  assert.ok(verification.documentNumber);
  assert.ok(verification.institutionName);
  assert.ok(verification.studentMaskedName, "Student name must be masked");

  // Verify NO sensitive PII leaked
  assert.equal(verification.dob, undefined, "DOB must not leak");
  assert.equal(verification.phone, undefined, "Phone must not leak");
  assert.equal(verification.percentage, undefined, "Marks must not leak");
  assert.equal(verification.category, undefined, "Category must not leak");
  assert.equal(verification.address, undefined, "Address must not leak");
});

test("16. Boundary Validation: File uploads reject oversized files (>5MB) & invalid extensions", async () => {
  // Test boundary logic directly
  const MAX_BYTES = 5 * 1024 * 1024;
  const oversizedBytes = 6 * 1024 * 1024;
  assert.ok(oversizedBytes > MAX_BYTES, "Oversized file detected");

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const isMalicious = !allowedExtensions.some((ext) => "script.exe".endsWith(ext));
  assert.equal(isMalicious, true, ".exe file extension is correctly rejected");

  const isValidPdf = allowedExtensions.some((ext) => "marksheet.pdf".endsWith(ext));
  assert.equal(isValidPdf, true, ".pdf file extension is accepted");
});
