// Resets the database to the sample data. Runs the backend seed through uv,
// without a shell, so it behaves the same on Mac, Linux and Windows.
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const result = spawnSync("uv", ["run", "python", "-m", "accountable.seed"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`Could not run uv: ${result.error.message}. Is uv installed? See docs/STATUS.md.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
