import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, originalHash] = combinedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}
