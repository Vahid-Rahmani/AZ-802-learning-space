import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "WinCraft · AZ-802", description: "Trilingual Windows Server learning workspace aligned to Microsoft Learn.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" dir="ltr"><body>{children}</body></html>; }
