import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProtectedShell } from "@/components/app-shell/protected-shell";
import { ToastContainer } from "react-toastify";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  // Read name fresh from the database so it reflects immediately after profile updates.
  // The JWT session stores the name from login time; a DB lookup ensures it's always current.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });
  const displayName = dbUser?.name ?? user.name ?? user.email ?? "User";
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        theme="light"
      />
      <ProtectedShell
        userName={displayName}
        role={user.role}
      >
        {children}
      </ProtectedShell>
    </>
  );
}
