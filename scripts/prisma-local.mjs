import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const envLocalPath = path.join(projectRoot, ".env.local");
const envPath = path.join(projectRoot, ".env");
const envFilePath = existsSync(envLocalPath) ? envLocalPath : envPath;

dotenvConfig({ path: envFilePath });

const prismaBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: node scripts/prisma-local.mjs <prisma args...>\n" +
      "Example: node scripts/prisma-local.mjs migrate dev",
  );
  process.exit(2);
}

const command = process.platform === "win32" ? "cmd.exe" : prismaBin;
const commandArgs =
  process.platform === "win32" ? ["/d", "/s", "/c", prismaBin, ...args] : args;

const child = spawn(command, commandArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
