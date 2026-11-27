import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class StorageService {
  /**
   * Save an uploaded file buffer safely to disk
   */
  static async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ storageKey: string; byteSize: number; checksumSha256: string }> {
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const ext = path.extname(originalName).toLowerCase() || ".pdf";
    const safeKey = `${hash.substring(0, 16)}_${Date.now()}${ext}`;
    const fullPath = path.join(UPLOADS_DIR, safeKey);

    await fs.promises.writeFile(fullPath, fileBuffer);

    return {
      storageKey: safeKey,
      byteSize: fileBuffer.length,
      checksumSha256: hash,
    };
  }

  /**
   * Read file stream from private storage
   */
  static async getFile(storageKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
    // Sanitize path to prevent directory traversal
    const safeKey = path.basename(storageKey);
    const fullPath = path.join(UPLOADS_DIR, safeKey);

    if (!fs.existsSync(fullPath)) {
      return { buffer: Buffer.alloc(0), exists: false };
    }

    const buffer = await fs.promises.readFile(fullPath);
    return { buffer, exists: true };
  }
}
