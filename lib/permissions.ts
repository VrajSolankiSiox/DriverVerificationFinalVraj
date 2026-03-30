import type { UserRole } from "@prisma/client";

const rank: Record<UserRole, number> = {
  REP: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole) {
  return rank[userRole] >= rank[requiredRole];
}

export function canApproveReport(role: UserRole) {
  return hasRole(role, "MANAGER");
}

export function canManageTemplates(role: UserRole) {
  return hasRole(role, "MANAGER");
}
