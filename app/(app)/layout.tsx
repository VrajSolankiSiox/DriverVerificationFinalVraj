import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { ProtectedShell } from "@/components/app-shell/protected-shell";
import { ToastContainer } from "react-toastify";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
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
        userName={user.name ?? user.email ?? "User"}
        role={user.role}
      >
        {children}
      </ProtectedShell>
    </>
  );
}
