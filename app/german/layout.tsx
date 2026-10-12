import type { Metadata } from "next";
import "./german.css";

export const metadata: Metadata = {
  title: "German for IT · Klybit",
  description: "60 German IT lessons from B1 patterns to a B2-oriented bridge: professional emails, grammar, character feedback and spaced recall practice.",
};
export default function GermanLayout({ children }: { children: React.ReactNode }) { return children; }
