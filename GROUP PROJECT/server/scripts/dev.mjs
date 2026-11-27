import { spawn } from "child_process";

const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
const useShell = process.platform === "win32";

const api = spawn(cmd, ["--prefix", "server", "run", "dev"], {
  stdio: "inherit",
  shell: useShell,
  env: { ...process.env, PORT: "5000", API_ONLY: "1" },
});

const web = spawn(cmd, ["--prefix", "client", "run", "dev"], {
  stdio: "inherit",
  shell: useShell,
});

function shutdown() {
  api.kill();
  web.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
