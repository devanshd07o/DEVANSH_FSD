import { Router } from "express";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../auth/password";
import { COOKIE_NAME, getSessionFromRequest, setSessionCookie, signSession } from "../auth/session";
import { InstitutionService } from "../modules/institutions/institution.service";
import { hasRole, requireUser, STAFF_ROLES } from "../middleware/auth";

export const authRouter = Router();

authRouter.get("/auth/me", async (req, res) => {
  res.json({ user: await getSessionFromRequest(req) });
});

authRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password, institutionId, portalTab } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { userRoles: { include: { role: true, institution: true } } },
    });
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const targetInstId = institutionId || user.userRoles[0]?.institutionId;
    if (!targetInstId) return res.status(400).json({ error: "Please select a college." });

    const scoped = user.userRoles.filter((ur) => ur.institutionId === targetInstId);
    if (scoped.length === 0) {
      return res.status(403).json({ error: "This account is not registered with the selected college." });
    }

    const roles = scoped.map((ur) => ur.role.code);
    const institution = scoped[0].institution;

    if (portalTab === "student" && !roles.includes("APPLICANT")) {
      return res.status(403).json({ error: "This account is not a student at the selected college." });
    }
    if (portalTab === "staff" && !roles.some((r) => STAFF_ROLES.includes(r))) {
      return res.status(403).json({ error: "This account does not have staff access at the selected college." });
    }
    if (portalTab === "college" && !roles.some((r) => ["SUPER_ADMIN", "ADMISSIONS_OFFICER"].includes(r))) {
      return res.status(403).json({ error: "This account does not have college admin access." });
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      roles,
      institutionId: institution.id,
      institutionName: institution.name,
      institutionCode: institution.code,
    });
    setSessionCookie(res, token);

    let redirectUrl = "/student/dashboard";
    if (portalTab === "college") redirectUrl = "/admissions/overview";
    else if (portalTab === "staff") {
      redirectUrl = roles.includes("ACCOUNTS") ? "/accounts/payments" : roles.includes("REGISTRAR") ? "/accounts/enrollments" : "/scrutiny/queue";
    } else if (roles.some((r) => ["SUPER_ADMIN", "ADMISSIONS_OFFICER"].includes(r))) redirectUrl = "/admissions/overview";
    else if (roles.includes("REVIEWER")) redirectUrl = "/scrutiny/queue";

    res.json({ success: true, redirectUrl });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Login failed" });
  }
});

authRouter.post("/auth/register", async (req, res) => {
  try {
    const { institutionId, name, email, phone, password } = req.body;
    if (!institutionId || !name || !email || !password) return res.status(400).json({ error: "All fields are required." });
    if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const cleanEmail = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
      return res.status(409).json({ error: "Email already exists." });
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    const role = await prisma.role.findUnique({ where: { code: "APPLICANT" } });
    if (!institution || !role) return res.status(400).json({ error: "Selected college not found." });

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        passwordHash: hashPassword(String(password)),
        userRoles: { create: { roleId: role.id, institutionId: institution.id } },
      },
    });

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: ["APPLICANT"],
      institutionId: institution.id,
      institutionName: institution.name,
      institutionCode: institution.code,
    });
    setSessionCookie(res, token);
    res.json({ success: true, redirectUrl: "/student/applications/new" });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Registration failed" });
  }
});

authRouter.post("/auth/register-staff", async (req, res) => {
  try {
    const { institutionId, name, email, password, roleCode } = req.body;
    if (!institutionId || !name || !email || !password) return res.status(400).json({ error: "All fields are required." });
    if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const chosenRole = ["REVIEWER", "ACCOUNTS", "REGISTRAR"].includes(roleCode) ? roleCode : "REVIEWER";
    const cleanEmail = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
      return res.status(409).json({ error: "Email already exists." });
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    const role = await prisma.role.findUnique({ where: { code: chosenRole } });
    if (!institution || !role) return res.status(400).json({ error: "Invalid college or role." });

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash: hashPassword(String(password)),
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id, institutionId: institution.id } },
      },
    });

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: [chosenRole],
      institutionId: institution.id,
      institutionName: institution.name,
      institutionCode: institution.code,
    });
    setSessionCookie(res, token);
    const redirectUrl = chosenRole === "ACCOUNTS" ? "/accounts/payments" : chosenRole === "REGISTRAR" ? "/accounts/enrollments" : "/scrutiny/queue";
    res.json({ success: true, redirectUrl });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Staff registration failed" });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

authRouter.get("/colleges", async (req, res) => {
  const user = await getSessionFromRequest(req);
  const collegeFilter = user ? user.institutionId : (req.query.college as string) || undefined;
  const colleges = await prisma.institution.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { programs: true } } },
  });
  const programs = await prisma.program.findMany({
    where: { isActive: true, ...(collegeFilter ? { institutionId: collegeFilter } : {}) },
    include: {
      institution: { select: { id: true, name: true, code: true } },
      seatPools: { include: { category: true }, orderBy: { category: { percentage: "desc" } } },
    },
    orderBy: [{ institution: { name: "asc" } }, { code: "asc" }],
  });
  res.json({ colleges, programs });
});

authRouter.post("/colleges/register", async (req, res) => {
  try {
    const { collegeName, collegeCode, city, adminName, adminEmail, phone, password } = req.body;
    if (!collegeName || !collegeCode || !adminName || !adminEmail || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const { institution, user, roles } = await InstitutionService.registerCollege({
      collegeName, collegeCode, city: city || "India", adminName, adminEmail, phone, password,
    });
    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      roles,
      institutionId: institution.id,
      institutionName: institution.name,
      institutionCode: institution.code,
    });
    setSessionCookie(res, token);
    res.json({ success: true, redirectUrl: "/admissions/overview", institution });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "College registration failed" });
  }
});

authRouter.get("/college/staff", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!hasRole(user, ["SUPER_ADMIN", "ADMISSIONS_OFFICER"])) return res.status(403).json({ error: "Forbidden" });
  const staffRows = await prisma.userRole.findMany({
    where: { institutionId: user.institutionId, role: { code: { in: STAFF_ROLES } } },
    include: { user: { select: { id: true, name: true, email: true } }, role: { select: { code: true, displayName: true } } },
    orderBy: { user: { name: "asc" } },
  });
  res.json({ staffRows });
});

authRouter.post("/college/staff", async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!hasRole(user, ["SUPER_ADMIN", "ADMISSIONS_OFFICER"])) return res.status(403).json({ error: "Forbidden" });
    const { name, email, password, roleCode } = req.body;
    if (!name || !email || !password || !roleCode) return res.status(400).json({ error: "All fields are required." });
    if (!["REVIEWER", "ACCOUNTS", "REGISTRAR", "ADMISSIONS_OFFICER"].includes(roleCode)) return res.status(400).json({ error: "Invalid role." });
    if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const cleanEmail = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: cleanEmail } })) return res.status(409).json({ error: "Email exists." });

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return res.status(400).json({ error: "Role not found." });

    const staff = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash: hashPassword(String(password)),
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id, institutionId: user.institutionId } },
      },
    });
    res.json({ success: true, staff: { id: staff.id, name: staff.name, email: staff.email, roleCode } });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});
