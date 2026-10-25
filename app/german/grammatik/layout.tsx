import type { Metadata } from "next";
import "./grammatik.css";

export const metadata: Metadata = {
  title: "Grammatik A1–B2 · Klybit",
  description: "Ein systematischer Grammatikkurs von A1 bis B2 mit deutschen Erklärungen, 100 Fragen zu Infinitiv mit zu und persistentem Lernfortschritt.",
};

export default function GermanGrammarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
