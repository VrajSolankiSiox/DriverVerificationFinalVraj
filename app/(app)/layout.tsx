import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { ProtectedShell } from "@/components/app-shell/protected-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <ProtectedShell userName={user.name ?? user.email ?? "User"} role={user.role}>{children}</ProtectedShell>;
}
