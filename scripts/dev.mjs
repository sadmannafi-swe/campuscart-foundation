// Runs the Express API (:3001) and the Vite dev server (:5173, proxies /api) together.
import { spawn } from "node:child_process";

const run = (script) =>
  spawn("npm", ["run", script], { stdio: "inherit", shell: process.platform === "win32" });

const procs = [run("dev:api"), run("dev:web")];
const stop = () => procs.forEach((p) => p.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (code) => code && stop()));
