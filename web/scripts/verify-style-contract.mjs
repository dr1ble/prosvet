import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const globalsPath = resolve(process.cwd(), "app/globals.css");
const source = readFileSync(globalsPath, "utf8");

const requiredVariables = [
  "--surface-card-default",
  "--surface-card-muted",
  "--border-default",
  "--text-primary",
  "--text-secondary",
  "--interactive-primary",
  "--feedback-danger",
  "--radius-sm",
  "--space-3",
  "--shadow-raised",
];

const missing = requiredVariables.filter(
  (token) => !new RegExp(`${token}\\s*:`).test(source),
);

if (missing.length > 0) {
  console.error(
    "Style contract check failed. Missing variables in app/globals.css:",
  );
  for (const token of missing) {
    console.error(`- ${token}`);
  }
  process.exit(1);
}

console.log("Style contract check passed.");
