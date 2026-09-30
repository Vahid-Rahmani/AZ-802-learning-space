import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "WinCraft · AZ-802 & AZ-900", description: "Microsoft Learn-aligned Windows Server and Azure Fundamentals learning workspace.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" dir="ltr"><body>{children}</body></html>; }
