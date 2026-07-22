import { describe, expect, it } from "vitest";
import { safeUserSelect } from "@/lib/user-select";

describe("safe user projection", () => {
  it("never selects authentication secrets for API or client payloads", () => {
    expect(safeUserSelect).not.toHaveProperty("passwordHash");
    expect(safeUserSelect).not.toHaveProperty("twoFactorSecret");
    expect(safeUserSelect).toMatchObject({ id: true, email: true, role: true, status: true });
  });
});
