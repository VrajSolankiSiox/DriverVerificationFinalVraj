import { describe, expect, it } from "vitest";

import { canApproveReport, hasRole } from "@/lib/permissions";

describe("permissions", () => {
  it("allows higher roles to satisfy lower role requirements", () => {
    expect(hasRole("ADMIN", "REP")).toBe(true);
    expect(hasRole("MANAGER", "REP")).toBe(true);
    expect(hasRole("REP", "MANAGER")).toBe(false);
  });

  it("only managers and admins can approve reports", () => {
    expect(canApproveReport("MANAGER")).toBe(true);
    expect(canApproveReport("ADMIN")).toBe(true);
    expect(canApproveReport("REP")).toBe(false);
  });
});
