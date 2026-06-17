import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const bin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const generatedClient = path.join(root, "node_modules", ".prisma", "client", "index.js");
const timeoutMs = Number.parseInt(process.env.PRISMA_GENERATE_TIMEOUT_MS ?? "20000", 10);

const child = spawn(bin, ["generate"], {
  cwd: root,
  env: {
    ...process.env,
    PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
  },
  stdio: "inherit",
});

const timer = setTimeout(() => {
  child.kill("SIGTERM");
}, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000);

child.on("exit", (code, signal) => {
  clearTimeout(timer);

  if (code === 0) {
    process.exit(0);
  }

  if (existsSync(generatedClient)) {
    const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
    console.warn(`Prisma generate did not complete (${reason}); using existing generated client from npm install.`);
    process.exit(0);
  }

  console.error("Prisma generate failed and no generated client is available.");
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearTimeout(timer);

  if (existsSync(generatedClient)) {
    console.warn(`Prisma generate could not start (${error.message}); using existing generated client from npm install.`);
    process.exit(0);
  }

  console.error(`Prisma generate could not start: ${error.message}`);
  process.exit(1);
});
