import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";

import { appName } from "@/lib/constants";

export const metadata: Metadata = {
  title: appName,
  description: "Internal sales intelligence and report generation app for hotel demos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
