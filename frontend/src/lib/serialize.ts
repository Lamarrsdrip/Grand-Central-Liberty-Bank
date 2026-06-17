type Jsonish =
  | string
  | number
  | boolean
  | null
  | Jsonish[]
  | { [key: string]: Jsonish };

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "toNumber" in value &&
      typeof (value as { toNumber?: unknown }).toNumber === "function" &&
      value.constructor?.name === "Decimal"
  );
}

export function safeSerialize<T>(value: T): Jsonish {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isDecimalLike(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeSerialize(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, safeSerialize(nested)])
    );
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value as Jsonish;
}
