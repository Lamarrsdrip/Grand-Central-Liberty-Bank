const required = ["DATABASE_URL", "JWT_SECRET", "CSRF_SECRET", "SETTINGS_MASTER_KEY"];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if ((process.env.JWT_SECRET ?? "").length < 32) {
  console.error("JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}

console.log("Environment looks ready for Grand Central Liberty Bank.");
