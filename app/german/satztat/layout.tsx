import type { Metadata } from "next";
import "./satztat.css";

export const metadata: Metadata = {
  title: "SatzTat · German Network Missions · Klybit",
  description: "Investigate a network incident, verify the repair and write a German postmortem. Two playable cases with separate technical and language evidence.",
};
export default function SatztatLayout({ children }: { children: React.ReactNode }) { return children; }
