import type { Metadata } from "next";
import "./globals.css";
import "./appearance.css";
import { AppearanceProvider } from "@/app/components/appearance-provider";
export const metadata: Metadata = { title: "CertPath · Learn. Practice. Progress.", description: "Your learning path for Windows Server AZ-802 and Azure Fundamentals AZ-900. Lessons, practice questions, hands-on labs, and spaced review.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr" data-theme="fluent" suppressHydrationWarning>
    <head>
      {/* Read the tiny saved preference before paint to avoid flashing the wrong theme. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/theme-init.js" />
    </head>
    <body><AppearanceProvider>{children}</AppearanceProvider></body>
  </html>;
}
