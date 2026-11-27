import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const devDb = path.join(root, "dev.db");
const testDb = path.join(root, "tests", ".test.db");

fs.copyFileSync(devDb, testDb);

try {
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(cmd, ["tsx", "--test", "tests/domain.test.mjs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: "file:tests/.test.db",
    },
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (fs.existsSync(testDb)) {
    fs.unlinkSync(testDb);
  }
}
