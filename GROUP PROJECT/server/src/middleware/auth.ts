import type express from "express";
import { getSessionFromRequest, type SessionPayload } from "../auth/session";

export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMISSIONS_OFFICER",
  "REVIEWER",
  "ACCOUNTS",
  "REGISTRAR",
];

export async function requireUser(req: express.Request, res: express.Response): Promise<SessionPayload | null> {
  const user = await getSessionFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

export function hasRole(user: SessionPayload, allowed: string[]) {
  return user.roles.some((r) => allowed.includes(r));
}

export function checkUpload(file?: Express.Multer.File): string | null {
  if (!file) return null;
  const exts = [".pdf", ".jpg", ".jpeg", ".png"];
  const mimes = ["application/pdf", "image/jpeg", "image/png"];
  const name = file.originalname.toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  if (!exts.some((e) => name.endsWith(e)) || (mime && !mimes.includes(mime))) {
    return "Only PDF, JPG, and PNG files up to 5MB are allowed.";
  }
  return null;
}

export function fallbackPdf(title: string, appNumber: string) {
  const safe = title.replace(/[()\\]/g, "");
  const stream = `BT /F1 14 Tf 50 740 Td (College Admission Portal) Tj 0 -24 Td /F1 11 Tf (Application: ${appNumber}) Tj 0 -18 Td (File: ${safe}) Tj ET`;
  const header = "%PDF-1.4\n";
  const objs = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
    "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n",
    `4 0 obj<</Length ${Buffer.byteLength(stream, "utf8")}>>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
  ];
  let body = header;
  const offsets: number[] = [];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefPos = Buffer.byteLength(body, "utf8");
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  const trailer = `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(body + xref + trailer, "utf8");
}
