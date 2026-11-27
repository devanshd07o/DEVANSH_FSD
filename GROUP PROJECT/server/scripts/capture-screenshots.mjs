import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function capture() {
  console.log("📸 Starting Comprehensive Visual Verification...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Homepage
  console.log("Capturing 01-homepage.png...");
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-homepage.png"), fullPage: true });

  // 2. Programs & Eligibility Matrix
  console.log("Capturing 02-programs.png...");
  await page.goto("http://localhost:3000/programs");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-programs.png"), fullPage: true });

  // 3. Sign In Page
  console.log("Capturing 03-sign-in.png...");
  await page.goto("http://localhost:3000/sign-in");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-sign-in.png") });

  // 4. Student Dashboard (Aarav Sharma - Enrolled)
  console.log("Switching to Aarav Sharma...");
  await page.request.post("http://localhost:3000/api/v1/auth/switch-demo", {
    data: { email: "student.aarav@gmail.com" },
  });
  await page.goto("http://localhost:3000/student/dashboard");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04-student-dashboard.png"), fullPage: true });

  // 5. Official Admission Letter with QR
  console.log("Capturing 05-admission-letter-qr.png...");
  await page.goto("http://localhost:3000/student/admission");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05-admission-letter-qr.png"), fullPage: true });

  // 6. Student B (Priya Patel) - Targeted Correction Desk
  console.log("Switching to Priya Patel (Defects open)...");
  await page.request.post("http://localhost:3000/api/v1/auth/switch-demo", {
    data: { email: "student.priya@gmail.com" },
  });
  await page.goto("http://localhost:3000/student/dashboard");
  await page.waitForLoadState("networkidle");
  // Find link to correction desk
  const correctionLink = await page.$('a[href*="/corrections"]');
  if (correctionLink) {
    await correctionLink.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06-correction-desk.png"), fullPage: true });
  }

  // 7. Faculty Reviewer - Scrutiny Queue & Split-Screen Desk
  console.log("Switching to Prof. Rajesh Kulkarni (Scrutiny Committee)...");
  await page.request.post("http://localhost:3000/api/v1/auth/switch-demo", {
    data: { email: "faculty.review@institution.edu.in" },
  });
  await page.goto("http://localhost:3000/scrutiny/queue");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07-scrutiny-queue.png"), fullPage: true });

  // Click into first application for split desk
  const openDeskLink = await page.$('a[href*="/scrutiny/applications/"]');
  if (openDeskLink) {
    await openDeskLink.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08-split-scrutiny-desk.png") });
  }

  // 8. Admin - Seat Matrix & Concurrency
  console.log("Switching to Dr. Vikramaditya Sen (Admin)...");
  await page.request.post("http://localhost:3000/api/v1/auth/switch-demo", {
    data: { email: "admin@institution.edu.in" },
  });
  await page.goto("http://localhost:3000/admissions/seat-matrix");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09-seat-matrix.png"), fullPage: true });

  // 9. Admin - Deterministic Merit Engine
  console.log("Capturing 10-merit-engine.png...");
  await page.goto("http://localhost:3000/admissions/merit");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10-merit-engine.png"), fullPage: true });

  // 10. Public Minimal QR Verification Screen
  console.log("Capturing 11-public-qr-verification.png...");
  await page.goto("http://localhost:3000/verify/token_verify_aarav_sharma_98a21b");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "11-public-qr-verification.png") });

  // 11. Mobile Viewport Responsive Verification (390x844)
  console.log("Capturing 12-mobile-responsive.png...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/");
  await mobilePage.waitForLoadState("networkidle");
  await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, "12-mobile-responsive.png"), fullPage: true });

  await browser.close();
  console.log("✅ Visual verification captures completed successfully in ./screenshots/!");
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
