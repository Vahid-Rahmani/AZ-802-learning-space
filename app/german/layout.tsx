import type { Metadata } from "next";
import "./german.css";

export const metadata: Metadata = {
  title: "German for IT · Klybit",
  description: "German B1-oriented writing, grammar and IT vocabulary with character feedback and spaced recall practice.",
};
export default function GermanLayout({ children }: { children: React.ReactNode }) { return children; }
