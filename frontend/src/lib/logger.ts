type LogLevel = "info" | "warn" | "error";

type SafeLogContext = Record<string, string | number | boolean | null | undefined>;

function write(level: LogLevel, event: string, context: SafeLogContext = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined))
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, context?: SafeLogContext) => write("info", event, context),
  warn: (event: string, context?: SafeLogContext) => write("warn", event, context),
  error: (event: string, context?: SafeLogContext) => write("error", event, context)
};
