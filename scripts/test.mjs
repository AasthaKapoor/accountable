// Runs every test suite, even after one fails, then exits non-zero if any failed.
// Spawns npm through the shell so it works the same on Mac, Linux and Windows.
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const suites = [
  ["Backend unit tests (pytest)", "test:backend"],
  ["Frontend unit tests (Vitest)", "test:frontend"],
  ["End-to-end tests (Playwright)", "test:e2e"],
];

const results = suites.map(([name, script]) => {
  console.log(`\n=== ${name} ===\n`);
  const { status, error } = spawnSync(`npm run ${script}`, { cwd: root, stdio: "inherit", shell: true });
  if (error) console.error(`Could not run ${script}: ${error.message}`);
  return { name, passed: status === 0 };
});

console.log("\n=== Summary ===");
for (const { name, passed } of results) console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);

const failed = results.filter((r) => !r.passed).length;
console.log(failed ? `\n${failed} of ${results.length} suites failed.` : `\nAll ${results.length} suites passed.`);
process.exit(failed ? 1 : 0);
