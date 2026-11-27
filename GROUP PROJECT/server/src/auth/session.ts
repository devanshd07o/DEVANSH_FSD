import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "antigravity-admission-portal-super-secret-key-32chars"
);
export const COOKIE_NAME = "antigravity_session";

export interface SessionPayload {
  userId: string;
  id: string;
  email: string;
  name: string;
  roles: string[];
  institutionId: string;
  institutionName: string;
  institutionCode: string;
}

export async function signSession(payload: {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  institutionId: string;
  institutionName: string;
  institutionCode: string;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    roles: payload.roles,
    institutionId: payload.institutionId,
    institutionName: payload.institutionName,
    institutionCode: payload.institutionCode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const res = payload as unknown as SessionPayload;
    if (!res?.userId || !res?.institutionId) {
      return null;
    }
    if (!res.id) {
      res.id = res.userId;
    }
    return res;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
