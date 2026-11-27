import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import crypto from "crypto";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
const adapter = new PrismaLibSql(authToken ? { url: dbUrl, authToken } : { url: dbUrl });
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  if (process.argv.includes("--if-empty")) {
    const count = await prisma.institution.count();
    if (count > 0) {
      console.log("Database already seeded, skipping.");
      return;
    }
  }
  console.log("🌱 Seeding Antigravity Admission Portal Database...");

  // 1. Institution
  const institution = await prisma.institution.upsert({
    where: { code: "AIET-2026" },
    update: { name: "ABES Engineering College" },
    create: {
      code: "AIET-2026",
      name: "ABES Engineering College",
      timezone: "Asia/Kolkata",
      settingsJson: JSON.stringify({
        currency: "INR",
        applicationFeeEnabled: true,
        twoPersonApprovalRequired: false,
        publicVerifications: true,
      }),
    },
  });
  console.log("✓ Institution created:", institution.name);

  // 2. Roles
  const roles = [
    { code: "SUPER_ADMIN", displayName: "Super Administrator" },
    { code: "ADMISSIONS_OFFICER", displayName: "Admissions Officer" },
    { code: "REVIEWER", displayName: "Faculty Scrutiny Reviewer" },
    { code: "ACCOUNTS", displayName: "Accounts & Finance Staff" },
    { code: "REGISTRAR", displayName: "Academic Registrar" },
    { code: "APPLICANT", displayName: "Prospective Student" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { displayName: r.displayName },
      create: { code: r.code, displayName: r.displayName, isSystem: true },
    });
  }
  console.log("✓ Roles initialized");

  // 3. Categories
  const categories = [
    { code: "GENERAL", label: "General (Open / Unreserved)", percentage: 50.0, proofDoc: null },
    { code: "OBC", label: "Other Backward Classes (Non-Creamy Layer)", percentage: 27.0, proofDoc: "OBC_NCL_CERTIFICATE" },
    { code: "SC", label: "Scheduled Caste", percentage: 15.0, proofDoc: "CASTE_CERTIFICATE" },
    { code: "ST", label: "Scheduled Tribe", percentage: 7.5, proofDoc: "TRIBE_CERTIFICATE" },
    { code: "EWS", label: "Economically Weaker Section", percentage: 10.0, proofDoc: "INCOME_ASSET_CERTIFICATE" },
  ];

  for (const cat of categories) {
    await prisma.reservationCategory.upsert({
      where: { code: cat.code },
      update: { label: cat.label, percentage: cat.percentage },
      create: cat,
    });
  }
  console.log("✓ Reservation Categories initialized");

  // 4. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: "2026-2027",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      code: "2026-2027",
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2027-05-31T23:59:59Z"),
      status: "OPEN",
    },
  });
  console.log("✓ Academic Year created:", academicYear.code);

  // 5. Programs & Seat Pools
  const programsData = [
    {
      code: "BTECH-CSE",
      name: "B.Tech in Computer Science & Engineering",
      degree: "UG",
      department: "Computer Science",
      capacities: { GENERAL: 30, OBC: 16, SC: 9, ST: 5, EWS: 6 },
    },
    {
      code: "BTECH-ECE",
      name: "B.Tech in Electronics & Communication",
      degree: "UG",
      department: "Electronics",
      capacities: { GENERAL: 30, OBC: 16, SC: 9, ST: 5, EWS: 6 },
    },
    {
      code: "BTECH-MECH",
      name: "B.Tech in Mechanical Engineering",
      degree: "UG",
      department: "Mechanical",
      capacities: { GENERAL: 30, OBC: 16, SC: 9, ST: 5, EWS: 6 },
    },
    {
      code: "MCA",
      name: "Master of Computer Applications",
      degree: "PG",
      department: "Computer Applications",
      capacities: { GENERAL: 15, OBC: 8, SC: 5, ST: 2, EWS: 3 },
    },
  ];

  const categoryMap = {};
  const dbCats = await prisma.reservationCategory.findMany();
  for (const c of dbCats) categoryMap[c.code] = c.id;

  for (const prog of programsData) {
    const program = await prisma.program.upsert({
      where: {
        institutionId_code: {
          institutionId: institution.id,
          code: prog.code,
        },
      },
      update: { name: prog.name },
      create: {
        institutionId: institution.id,
        code: prog.code,
        name: prog.name,
        degree: prog.degree,
        department: prog.department,
      },
    });

    // Seat pools for each category
    for (const [catCode, cap] of Object.entries(prog.capacities)) {
      await prisma.seatPool.upsert({
        where: {
          programId_categoryId: {
            programId: program.id,
            categoryId: categoryMap[catCode],
          },
        },
        update: { capacity: cap },
        create: {
          programId: program.id,
          categoryId: categoryMap[catCode],
          capacity: cap,
          heldCount: 0,
          confirmedCount: 0,
        },
      });
    }

    // Admission track
    const track = await prisma.admissionTrack.upsert({
      where: { id: `track-${prog.code}` },
      update: {},
      create: {
        id: `track-${prog.code}`,
        academicYearId: academicYear.id,
        programId: program.id,
        code: `${prog.code}-2026-REGULAR`,
        name: `${prog.name} Regular 2026`,
        appFeePaise: 100000,
      },
    });

    // Window
    await prisma.admissionWindow.upsert({
      where: { id: `win-${prog.code}` },
      update: {},
      create: {
        id: `win-${prog.code}`,
        admissionTrackId: track.id,
        openDate: new Date("2026-01-01T00:00:00Z"),
        closeDate: new Date("2026-12-31T23:59:59Z"),
        correctionDueDays: 3,
        isPublished: true,
      },
    });

    // Required Docs
    const docTypes = [
      { code: "CLASS_10_MARKSHEET", label: "Class X Marksheet / Certificate" },
      { code: "CLASS_12_MARKSHEET", label: "Class XII Marksheet / Diploma Certificate" },
      { code: "CATEGORY_CERTIFICATE", label: "Category / Reservation Certificate (if applicable)" },
      { code: "APPLICANT_PHOTO", label: "Recent Passport Size Photograph" },
    ];
    for (const dt of docTypes) {
      await prisma.requiredDocumentType.upsert({
        where: { id: `rdt-${prog.code}-${dt.code}` },
        update: {},
        create: {
          id: `rdt-${prog.code}-${dt.code}`,
          admissionTrackId: track.id,
          code: dt.code,
          label: dt.label,
          acceptedMime: "application/pdf,image/jpeg,image/png",
          maxBytes: 5242880,
          isRequired: dt.code !== "CATEGORY_CERTIFICATE",
        },
      });
    }

    // Round 1
    await prisma.admissionRound.upsert({
      where: { id: `round-1-${prog.code}` },
      update: {},
      create: {
        id: `round-1-${prog.code}`,
        admissionTrackId: track.id,
        roundNumber: 1,
        status: "PUBLISHED",
        offerAcceptDays: 3,
        publishedAt: new Date(),
      },
    });
  }
  console.log("✓ Programs, Tracks, Windows, and Seat Pools initialized");

  // 6. Fee Schedules
  await prisma.feeSchedule.upsert({
    where: { id: "fee-btech-general" },
    update: {},
    create: {
      id: "fee-btech-general",
      institutionId: institution.id,
      name: "B.Tech First Year Composite Admission Fee",
      categoryCode: "ALL",
      amountPaise: 8500000, // ₹85,000
      currency: "INR",
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: new Date("2027-12-31"),
    },
  });
  console.log("✓ Fee Schedules configured");

  // 7. Users & Roles
  const adminRole = await prisma.role.findUnique({ where: { code: "SUPER_ADMIN" } });
  const officerRole = await prisma.role.findUnique({ where: { code: "ADMISSIONS_OFFICER" } });
  const reviewerRole = await prisma.role.findUnique({ where: { code: "REVIEWER" } });
  const accountsRole = await prisma.role.findUnique({ where: { code: "ACCOUNTS" } });
  const registrarRole = await prisma.role.findUnique({ where: { code: "REGISTRAR" } });
  const applicantRole = await prisma.role.findUnique({ where: { code: "APPLICANT" } });

  const seedUsers = [
    {
      email: "admin@institution.edu.in",
      name: "Dr. Vikramaditya Sen",
      password: "Admin@12345",
      roles: [adminRole.id, officerRole.id],
    },
    {
      email: "faculty.review@institution.edu.in",
      name: "Prof. Rajesh Kulkarni",
      password: "Faculty@12345",
      roles: [reviewerRole.id],
    },
    {
      email: "accounts@institution.edu.in",
      name: "Sunita Deshmukh",
      password: "Accounts@12345",
      roles: [accountsRole.id],
    },
    {
      email: "registrar@institution.edu.in",
      name: "Col. Sanjeev Nair",
      password: "Registrar@12345",
      roles: [registrarRole.id],
    },
    {
      email: "student.aarav@gmail.com",
      name: "Aarav Sharma",
      password: "Student@12345",
      roles: [applicantRole.id],
    },
    {
      email: "student.priya@gmail.com",
      name: "Priya Patel",
      password: "Student@12345",
      roles: [applicantRole.id],
    },
    {
      email: "student.rohan@gmail.com",
      name: "Rohan Verma",
      password: "Student@12345",
      roles: [applicantRole.id],
    },
  ];

  const createdUsers = {};
  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hashPassword(u.password),
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });
    createdUsers[u.email] = user;

    for (const rId of u.roles) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId_institutionId: {
            userId: user.id,
            roleId: rId,
            institutionId: institution.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: rId,
          institutionId: institution.id,
        },
      });
    }
  }
  console.log("✓ Seed users and roles assigned");

  // 8. Realistic Applications with Workflows
  const cseTrack = await prisma.admissionTrack.findFirst({ where: { code: "BTECH-CSE-2026-REGULAR" } });
  const cseProgram = await prisma.program.findFirst({ where: { code: "BTECH-CSE" } });
  const cseRound1 = await prisma.admissionRound.findFirst({ where: { admissionTrackId: cseTrack.id } });
  const genPool = await prisma.seatPool.findFirst({
    where: { programId: cseProgram.id, categoryId: categoryMap["GENERAL"] },
  });

  // Application A: Aarav Sharma -> VERIFIED & ENROLLED
  const userAarav = createdUsers["student.aarav@gmail.com"];
  const appA = await prisma.application.upsert({
    where: { applicationNumber: "AIET-2026-0001" },
    update: {},
    create: {
      applicationNumber: "AIET-2026-0001",
      applicantId: userAarav.id,
      institutionId: institution.id,
      academicYearId: academicYear.id,
      admissionTrackId: cseTrack.id,
      status: "VERIFIED",
      currentRevisionNo: 1,
      submittedAt: new Date("2026-02-10T10:00:00Z"),
    },
  });

  const revA = await prisma.applicationRevision.upsert({
    where: {
      applicationId_revisionNo: {
        applicationId: appA.id,
        revisionNo: 1,
      },
    },
    update: {},
    create: {
      applicationId: appA.id,
      revisionNo: 1,
      snapshotJson: JSON.stringify({
        personal: { name: "Aarav Sharma", dob: "2007-04-15", gender: "Male" },
        category: "GENERAL",
        qualifications: [{ exam: "12th Standard", board: "CBSE", percentage: 94.6 }],
      }),
      isFrozen: true,
      submittedAt: new Date("2026-02-10T10:00:00Z"),
    },
  });

  await prisma.academicRecord.create({
    data: {
      revisionId: revA.id,
      examName: "12th Standard",
      boardUniversity: "CBSE",
      passingYear: 2025,
      rollNumber: "CBSE-12-882391",
      maxMarks: 500,
      obtainedMarks: 473,
      percentage: 94.6,
    },
  });

  // Approved Documents
  const cseDocs = await prisma.requiredDocumentType.findMany({ where: { admissionTrackId: cseTrack.id } });
  for (const d of cseDocs) {
    await prisma.document.create({
      data: {
        applicationId: appA.id,
        documentTypeId: d.id,
        originalName: `${d.code.toLowerCase()}.pdf`,
        storageKey: `uploads/AIET-2026-0001/${d.code}.pdf`,
        byteSize: 1420500,
        mimeType: "application/pdf",
        checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uploadStatus: "READY",
      },
    });
  }

  // Scrutiny Approved
  const reviewer = createdUsers["faculty.review@institution.edu.in"];
  await prisma.scrutinyReview.create({
    data: {
      applicationId: appA.id,
      reviewerId: reviewer.id,
      revisionNo: 1,
      decision: "APPROVED",
      reviewerNotes: "All academic credentials and 12th CBSE marksheet verified against CBSE digital repository.",
    },
  });

  // Offer Issued & Confirmed
  const allocRun = await prisma.seatAllocationRun.create({
    data: {
      admissionRoundId: cseRound1.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  const offerA = await prisma.allotmentOffer.create({
    data: {
      allocationId: allocRun.id,
      roundId: cseRound1.id,
      applicationId: appA.id,
      seatPoolId: genPool.id,
      programName: "B.Tech in Computer Science & Engineering",
      categoryCode: "GENERAL",
      status: "CONFIRMED",
      acceptBy: new Date(Date.now() + 86400000 * 3),
      payBy: new Date(Date.now() + 86400000 * 3),
    },
  });

  // Seat hold consumed into confirmed
  await prisma.seatPool.update({
    where: { id: genPool.id },
    data: { confirmedCount: { increment: 1 } },
  });

  // Payment completed
  const payOrderA = await prisma.paymentOrder.create({
    data: {
      applicationId: appA.id,
      offerId: offerA.id,
      feeType: "ADMISSION_FEE",
      amountPaise: 8500000,
      status: "PAID",
      provider: "mock",
      providerOrderId: "order_mock_aarav_001",
      paidAt: new Date(),
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      paymentOrderId: payOrderA.id,
      gatewayPaymentId: "pay_mock_aarav_9921",
      amountPaise: 8500000,
      status: "CAPTURED",
      rawResponse: JSON.stringify({ verified: true, signature: "mock_sig_pass" }),
    },
  });

  // Enrolled
  const enrollA = await prisma.enrollment.create({
    data: {
      enrollmentNumber: "AIET/2026/CSE/0001",
      applicationId: appA.id,
      offerId: offerA.id,
      userId: userAarav.id,
      institutionId: institution.id,
      academicYearId: academicYear.id,
      programId: cseProgram.id,
      status: "ACTIVE",
    },
  });

  await prisma.generatedDocument.create({
    data: {
      enrollmentId: enrollA.id,
      documentType: "ADMISSION_CONFIRMATION",
      documentNumber: "ADM-2026-CSE-0001",
      storageKey: "generated/ADM-2026-CSE-0001.pdf",
      verificationToken: "token_verify_aarav_sharma_98a21b",
    },
  });
  console.log("✓ Applicant A (Aarav) seeded: VERIFIED & ENROLLED");

  // Application B: Priya Patel -> CORRECTION_REQUIRED (Defect on 12th marksheet)
  const userPriya = createdUsers["student.priya@gmail.com"];
  const appB = await prisma.application.upsert({
    where: { applicationNumber: "AIET-2026-0002" },
    update: {},
    create: {
      applicationNumber: "AIET-2026-0002",
      applicantId: userPriya.id,
      institutionId: institution.id,
      academicYearId: academicYear.id,
      admissionTrackId: cseTrack.id,
      status: "CORRECTION_REQUIRED",
      currentRevisionNo: 1,
      submittedAt: new Date("2026-02-12T14:30:00Z"),
    },
  });

  const revB = await prisma.applicationRevision.upsert({
    where: {
      applicationId_revisionNo: {
        applicationId: appB.id,
        revisionNo: 1,
      },
    },
    update: {},
    create: {
      applicationId: appB.id,
      revisionNo: 1,
      snapshotJson: JSON.stringify({
        personal: { name: "Priya Patel", dob: "2007-09-22", gender: "Female" },
        category: "OBC",
        qualifications: [{ exam: "12th Standard", board: "Gujarat Secondary Board", percentage: 91.2 }],
      }),
      isFrozen: true,
      submittedAt: new Date("2026-02-12T14:30:00Z"),
    },
  });

  await prisma.academicRecord.createMany({
    data: [
      {
        revisionId: revB.id,
        examName: "12th Standard",
        boardUniversity: "Gujarat Secondary Board",
        passingYear: 2025,
        rollNumber: "12-771920",
        maxMarks: 500,
        obtainedMarks: 456,
        percentage: 91.2,
      },
      {
        revisionId: revB.id,
        examName: "10th Standard",
        boardUniversity: "CBSE",
        passingYear: 2023,
        rollNumber: "10-661812",
        maxMarks: 500,
        obtainedMarks: 450,
        percentage: 90.0,
      },
    ],
  });

  await prisma.categoryClaim.create({
    data: {
      revisionId: revB.id,
      categoryCode: "OBC",
      verificationStatus: "PENDING",
    },
  });

  const priyaDoc = await prisma.document.create({
    data: {
      applicationId: appB.id,
      documentTypeId: cseDocs.find((d) => d.code === "CLASS_12_MARKSHEET").id,
      originalName: "class12_scanned_photo.jpg",
      storageKey: "uploads/AIET-2026-0002/class12_blurred.jpg",
      byteSize: 840000,
      mimeType: "image/jpeg",
      checksumSha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      uploadStatus: "READY",
    },
  });

  const reviewB = await prisma.scrutinyReview.create({
    data: {
      applicationId: appB.id,
      reviewerId: reviewer.id,
      revisionNo: 1,
      decision: "CORRECTION_REQUESTED",
      reviewerNotes: "Uploaded marksheet is blurry; roll number and total marks are unreadable.",
    },
  });

  await prisma.defect.create({
    data: {
      applicationId: appB.id,
      reviewId: reviewB.id,
      documentId: priyaDoc.id,
      fieldPath: "documents.CLASS_12_MARKSHEET",
      reasonCode: "BLURRED_DOCUMENT",
      studentComment: "Your Class 12 Marksheet scan is unreadable. Please upload a clear high-resolution scanned PDF or original image showing total marks and board stamp.",
      internalNote: "Roll number cut off on right margin.",
      status: "OPEN",
      dueAt: new Date(Date.now() + 86400000 * 3),
    },
  });

  await prisma.notification.create({
    data: {
      userId: userPriya.id,
      title: "Action Required: Correction Requested on Application AIET-2026-0002",
      message: "Scrutiny committee found an issue with your Class 12 Marksheet. Please re-upload within 3 days.",
      linkUrl: `/student/applications/${appB.id}/corrections`,
    },
  });
  console.log("✓ Applicant B (Priya) seeded: CORRECTION_REQUIRED with open defect");

  // Application C: Rohan Verma -> DRAFT
  const userRohan = createdUsers["student.rohan@gmail.com"];
  await prisma.application.upsert({
    where: { applicationNumber: "AIET-2026-0003" },
    update: {},
    create: {
      applicationNumber: "AIET-2026-0003",
      applicantId: userRohan.id,
      institutionId: institution.id,
      academicYearId: academicYear.id,
      admissionTrackId: cseTrack.id,
      status: "DRAFT",
      currentRevisionNo: 1,
    },
  });
  console.log("✓ Applicant C (Rohan) seeded: DRAFT status");

  // 9. Seed Additional Participating Colleges for Multi-College Portal Isolation
  const extraColleges = [
    {
      code: "KIET-029",
      name: "KIET Group of Institutions",
      city: "Ghaziabad",
      adminEmail: "admin@kiet.edu.in",
      adminName: "Dr. Manoj Goel",
      staffEmail: "staff@kiet.edu.in",
      staffName: "Prof. Ankit Verma",
      studentEmail: "student@kiet.edu.in",
      studentName: "Kabir Malhotra",
      appNumber: "KIET-2026-0001",
    },
    {
      code: "GLB-192",
      name: "GL Bajaj Institute of Technology",
      city: "Greater Noida",
      adminEmail: "admin@glbajaj.edu.in",
      adminName: "Dr. Rajeev Agrawal",
      staffEmail: "staff@glbajaj.edu.in",
      staffName: "Prof. Neha Gupta",
      studentEmail: "student@glbajaj.edu.in",
      studentName: "Ananya Mishra",
      appNumber: "GLB-2026-0001",
    },
  ];

  for (const col of extraColleges) {
    const colInst = await prisma.institution.upsert({
      where: { code: col.code },
      update: { name: col.name },
      create: {
        code: col.code,
        name: col.name,
        timezone: "Asia/Kolkata",
        settingsJson: JSON.stringify({ city: col.city, currency: "INR" }),
      },
    });

    const colYear = await prisma.academicYear.upsert({
      where: { institutionId_code: { institutionId: colInst.id, code: "2026-2027" } },
      update: {},
      create: {
        institutionId: colInst.id,
        code: "2026-2027",
        startDate: new Date("2026-06-01T00:00:00Z"),
        endDate: new Date("2027-05-31T23:59:59Z"),
        status: "OPEN",
      },
    });

    const colProg = await prisma.program.upsert({
      where: { institutionId_code: { institutionId: colInst.id, code: "BTECH-CSE" } },
      update: {},
      create: {
        institutionId: colInst.id,
        code: "BTECH-CSE",
        name: "B.Tech in Computer Science & Engineering",
        degree: "UG",
        department: "Computer Science",
        isActive: true,
      },
    });

    for (const [catCode, cap] of Object.entries({ GENERAL: 30, OBC: 16, SC: 9, ST: 5, EWS: 6 })) {
      await prisma.seatPool.upsert({
        where: { programId_categoryId: { programId: colProg.id, categoryId: categoryMap[catCode] } },
        update: {},
        create: { programId: colProg.id, categoryId: categoryMap[catCode], capacity: cap },
      });
    }

    const colTrack = await prisma.admissionTrack.create({
      data: {
        academicYearId: colYear.id,
        programId: colProg.id,
        code: `${col.code}-CSE-2026`,
        name: `B.Tech CSE (${col.code})`,
        appFeePaise: 100000,
      },
    });

    await prisma.admissionWindow.create({
      data: {
        admissionTrackId: colTrack.id,
        openDate: new Date("2026-01-01T00:00:00Z"),
        closeDate: new Date("2027-12-31T23:59:59Z"),
        correctionDueDays: 3,
        isPublished: true,
      },
    });

    await prisma.admissionRound.create({
      data: {
        admissionTrackId: colTrack.id,
        roundNumber: 1,
        status: "PUBLISHED",
        offerAcceptDays: 3,
        publishedAt: new Date(),
      },
    });

    const colMarksheetDocType = await prisma.requiredDocumentType.create({
      data: {
        admissionTrackId: colTrack.id,
        code: "CLASS_12_MARKSHEET",
        label: "Class 12 Marksheet",
        acceptedMime: "application/pdf,image/jpeg,image/png",
        maxBytes: 5242880,
        isRequired: true,
      },
    });

    await prisma.requiredDocumentType.create({
      data: {
        admissionTrackId: colTrack.id,
        code: "CLASS_10_MARKSHEET",
        label: "Class 10 Marksheet",
        acceptedMime: "application/pdf,image/jpeg,image/png",
        maxBytes: 5242880,
        isRequired: true,
      },
    });

    const colAdmin = await prisma.user.upsert({
      where: { email: col.adminEmail },
      update: {},
      create: {
        email: col.adminEmail,
        name: col.adminName,
        passwordHash: hashPassword("College@12345"),
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    for (const rId of [adminRole.id, officerRole.id, reviewerRole.id, accountsRole.id, registrarRole.id]) {
      await prisma.userRole.upsert({
        where: { userId_roleId_institutionId: { userId: colAdmin.id, roleId: rId, institutionId: colInst.id } },
        update: {},
        create: { userId: colAdmin.id, roleId: rId, institutionId: colInst.id },
      });
    }

    const colStaff = await prisma.user.upsert({
      where: { email: col.staffEmail },
      update: {},
      create: {
        email: col.staffEmail,
        name: col.staffName,
        passwordHash: hashPassword("Staff@12345"),
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId_institutionId: { userId: colStaff.id, roleId: reviewerRole.id, institutionId: colInst.id } },
      update: {},
      create: { userId: colStaff.id, roleId: reviewerRole.id, institutionId: colInst.id },
    });

    const colStudent = await prisma.user.upsert({
      where: { email: col.studentEmail },
      update: {},
      create: {
        email: col.studentEmail,
        name: col.studentName,
        passwordHash: hashPassword("Student@12345"),
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId_institutionId: { userId: colStudent.id, roleId: applicantRole.id, institutionId: colInst.id } },
      update: {},
      create: { userId: colStudent.id, roleId: applicantRole.id, institutionId: colInst.id },
    });

    const colApp = await prisma.application.upsert({
      where: { applicationNumber: col.appNumber },
      update: {},
      create: {
        applicationNumber: col.appNumber,
        applicantId: colStudent.id,
        institutionId: colInst.id,
        academicYearId: colYear.id,
        admissionTrackId: colTrack.id,
        status: "SUBMITTED",
        currentRevisionNo: 1,
        submittedAt: new Date("2026-02-15T10:00:00Z"),
      },
    });

    const colRev = await prisma.applicationRevision.upsert({
      where: { applicationId_revisionNo: { applicationId: colApp.id, revisionNo: 1 } },
      update: {},
      create: {
        applicationId: colApp.id,
        revisionNo: 1,
        snapshotJson: "{}",
        isFrozen: true,
      },
    });

    await prisma.academicRecord.create({
      data: {
        revisionId: colRev.id,
        examName: "12th Standard",
        boardUniversity: "CBSE",
        passingYear: 2025,
        rollNumber: `${col.code}-1201`,
        maxMarks: 500,
        obtainedMarks: 465,
        percentage: 93.0,
      },
    });

    await prisma.document.create({
      data: {
        applicationId: colApp.id,
        documentTypeId: colMarksheetDocType.id,
        originalName: "class12_marksheet.pdf",
        storageKey: `uploads/${col.appNumber}/class12.pdf`,
        byteSize: 420000,
        mimeType: "application/pdf",
        checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uploadStatus: "READY",
      },
    });

    console.log(`✓ Seeded college: ${col.name} (${col.code})`);
  }

  console.log("\n🚀 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
