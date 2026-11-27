import { prisma } from "../../db/prisma";
import { hashPassword } from "../../auth/password";

export interface RegisterCollegeInput {
  collegeName: string;
  collegeCode: string;
  city: string;
  adminName: string;
  adminEmail: string;
  phone?: string;
  password: string;
}

export class InstitutionService {
  static async listInstitutions() {
    return prisma.institution.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        settingsJson: true,
        _count: {
          select: { programs: true },
        },
      },
    });
  }

  static async registerCollege(input: RegisterCollegeInput) {
    const cleanCode = input.collegeCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const cleanEmail = input.adminEmail.toLowerCase().trim();

    if (!cleanCode || cleanCode.length < 2) {
      throw new Error("College code must be at least 2 characters.");
    }
    if (!input.collegeName.trim()) {
      throw new Error("College name is required.");
    }
    if (input.password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const existingInst = await prisma.institution.findUnique({ where: { code: cleanCode } });
    if (existingInst) {
      throw new Error(`College code ${cleanCode} is already registered.`);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    return prisma.$transaction(async (tx) => {
      const roleSpecs = [
        { code: "SUPER_ADMIN", displayName: "Super Administrator" },
        { code: "ADMISSIONS_OFFICER", displayName: "Admissions Officer" },
        { code: "REVIEWER", displayName: "Faculty Scrutiny Reviewer" },
        { code: "ACCOUNTS", displayName: "Accounts & Finance Staff" },
        { code: "REGISTRAR", displayName: "Academic Registrar" },
        { code: "APPLICANT", displayName: "Prospective Student" },
      ];

      const roleMap: Record<string, string> = {};
      for (const r of roleSpecs) {
        const role = await tx.role.upsert({
          where: { code: r.code },
          update: {},
          create: { code: r.code, displayName: r.displayName, isSystem: true },
        });
        roleMap[r.code] = role.id;
      }

      const categoriesSpec = [
        { code: "GENERAL", label: "General", percentage: 50.0, proofDoc: null },
        { code: "OBC", label: "OBC (NCL)", percentage: 27.0, proofDoc: "OBC_NCL_CERTIFICATE" },
        { code: "SC", label: "SC", percentage: 15.0, proofDoc: "CASTE_CERTIFICATE" },
        { code: "ST", label: "ST", percentage: 7.5, proofDoc: "TRIBE_CERTIFICATE" },
        { code: "EWS", label: "EWS", percentage: 10.0, proofDoc: "INCOME_ASSET_CERTIFICATE" },
      ];

      const catIds: Record<string, string> = {};
      for (const c of categoriesSpec) {
        const cat = await tx.reservationCategory.upsert({
          where: { code: c.code },
          update: {},
          create: c,
        });
        catIds[c.code] = cat.id;
      }

      const institution = await tx.institution.create({
        data: {
          code: cleanCode,
          name: input.collegeName.trim(),
          timezone: "Asia/Kolkata",
          settingsJson: JSON.stringify({
            city: input.city.trim() || "India",
            currency: "INR",
          }),
        },
      });

      const academicYear = await tx.academicYear.create({
        data: {
          institutionId: institution.id,
          code: "2026-2027",
          startDate: new Date("2026-01-01T00:00:00Z"),
          endDate: new Date("2027-05-31T23:59:59Z"),
          status: "OPEN",
        },
      });

      const defaultPrograms = [
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
          code: "MCA",
          name: "Master of Computer Applications",
          degree: "PG",
          department: "Computer Applications",
          capacities: { GENERAL: 15, OBC: 8, SC: 4, ST: 3, EWS: 3 },
        },
      ];

      for (const prog of defaultPrograms) {
        const createdProg = await tx.program.create({
          data: {
            institutionId: institution.id,
            code: prog.code,
            name: prog.name,
            degree: prog.degree,
            department: prog.department,
            isActive: true,
          },
        });

        for (const [catCode, cap] of Object.entries(prog.capacities)) {
          await tx.seatPool.create({
            data: {
              programId: createdProg.id,
              categoryId: catIds[catCode],
              capacity: cap,
            },
          });
        }

        const track = await tx.admissionTrack.create({
          data: {
            academicYearId: academicYear.id,
            programId: createdProg.id,
            code: `${cleanCode}-${prog.code}-2026`,
            name: `${prog.name} (2026-27)`,
            appFeePaise: 100000,
          },
        });

        await tx.admissionWindow.create({
          data: {
            admissionTrackId: track.id,
            openDate: new Date("2026-01-01T00:00:00Z"),
            closeDate: new Date("2027-12-31T23:59:59Z"),
            correctionDueDays: 3,
            isPublished: true,
          },
        });

        await tx.admissionRound.create({
          data: {
            admissionTrackId: track.id,
            roundNumber: 1,
            status: "PUBLISHED",
            offerAcceptDays: 3,
            publishedAt: new Date(),
          },
        });

        const requiredDocs = [
          { code: "CLASS_10_MARKSHEET", label: "Class 10 Marksheet", isRequired: true },
          { code: "CLASS_12_MARKSHEET", label: "Class 12 Marksheet", isRequired: true },
          { code: "PHOTO", label: "Passport Photo", isRequired: true },
        ];

        for (const doc of requiredDocs) {
          await tx.requiredDocumentType.create({
            data: {
              admissionTrackId: track.id,
              code: doc.code,
              label: doc.label,
              acceptedMime: "application/pdf,image/jpeg,image/png",
              maxBytes: 5242880,
              isRequired: doc.isRequired,
            },
          });
        }
      }

      await tx.feeSchedule.create({
        data: {
          institutionId: institution.id,
          name: "Composite First Year Admission Fee",
          categoryCode: "ALL",
          amountPaise: 8500000,
          currency: "INR",
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: new Date("2027-12-31"),
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: cleanEmail,
          name: input.adminName.trim(),
          phone: input.phone?.trim() || null,
          passwordHash: hashPassword(input.password),
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      });

      const adminRoles = ["SUPER_ADMIN", "ADMISSIONS_OFFICER", "REVIEWER", "ACCOUNTS", "REGISTRAR"];
      for (const rCode of adminRoles) {
        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: roleMap[rCode],
            institutionId: institution.id,
          },
        });
      }

      return {
        institution,
        user: adminUser,
        roles: adminRoles,
      };
    });
  }
}
