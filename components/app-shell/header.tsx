import Image from "next/image";

import { SignOutButton } from "@/components/auth/signout-button";

export function Header({
  userName,
  role,
  onNavigate,
}: {
  userName: string;
  role: string;
  onNavigate?: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        {/* <Image src="/rank-me-now-mark.svg" alt="Rank Me Now" width={160} height={32} priority /> */}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <div className="font-medium">{userName}</div>
          <div className="text-muted-foreground">{role}</div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
