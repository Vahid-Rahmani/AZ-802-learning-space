import type { Metadata } from "next";
import "./linux.css";

export const metadata: Metadata = { title: "Linux terminal lab · Klybit", description: "Learn Linux files, permissions, packages and services in a safe browser-only RHEL-style terminal simulation." };
export default function LinuxLayout({ children }: { children: React.ReactNode }) { return children; }
