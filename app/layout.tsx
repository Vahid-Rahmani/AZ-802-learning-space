import type { Metadata } from "next";
import "./globals.css";
import "./appearance.css";
import "./server-labs.css";
import "./ccna-practice.css";
import "./ccna-lab-path.css";
import "./ccna-sim.css";
import "./ccna/simulator.css";
import "./ccna-lab-detail.css";
import "./switchlab-theme.css";
import "./simple-learning.css";
import { AppearanceProvider } from "@/app/components/appearance-provider";
export const metadata: Metadata = { title: "Klybit · Learn. Practice. Progress.", description: "Klybit learning paths for Windows Server AZ-802, Azure Fundamentals AZ-900, Docker and Cisco CCNA. Lessons, practice questions, hands-on labs, and spaced review.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr" data-theme="classic" suppressHydrationWarning>
    <head>
      <meta name="google-adsense-account" content="ca-pub-6627132366359242" />
      {/* Read the tiny saved preference before paint to avoid flashing the wrong theme. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/theme-init.js" />
    </head>
    <body><AppearanceProvider>{children}</AppearanceProvider></body>
  </html>;
}
