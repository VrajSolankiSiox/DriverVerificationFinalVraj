import { describe, expect, it } from "vitest";

import { canApproveReport, hasRole } from "@/lib/permissions";

describe("permissions", () => {
  it("allows higher roles to satisfy lower role requirements", () => {
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
  });

  it("only admins can approve reports", () => {
    expect(canApproveReport("ADMIN")).toBe(true);
    expect(canApproveReport("USER")).toBe(false);
  });
});
