import { validateServerConfig } from "../src/lib/config";

const issues = validateServerConfig();
for (const issue of issues) {
  const write = issue.severity === "error" ? console.error : console.warn;
  write(`[${issue.severity}] ${issue.key}: ${issue.message}`);
}
if (issues.some((issue) => issue.severity === "error")) process.exit(1);
console.log(issues.length ? "Critical configuration is valid; review warnings before production deployment." : "Environment is ready for production.");
