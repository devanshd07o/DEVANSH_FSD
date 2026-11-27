import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const adapter = new PrismaLibSql({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

async function run() {
  const priyaApp = await prisma.application.findFirst({
    where: { applicationNumber: "AIET-2026-0002" },
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Log in as reviewer
  await page.request.post("http://localhost:3000/api/v1/auth/switch-demo", {
    data: { email: "faculty.review@institution.edu.in" },
  });

  await page.goto(`http://localhost:3000/scrutiny/applications/${priyaApp.id}`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.resolve("screenshots/08-split-scrutiny-desk.png"), fullPage: true });

  await browser.close();
  await prisma.$disconnect();
  console.log("Captured split scrutiny desk screenshot successfully!");
}

run();
