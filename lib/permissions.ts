import type { UserRole } from "@prisma/client";

const rank: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole) {
  return rank[userRole] >= rank[requiredRole];
}

export function canApproveReport(role: UserRole) {
  return hasRole(role, "ADMIN");
}

export function canManageTemplates(role: UserRole) {
  return hasRole(role, "ADMIN");
}
