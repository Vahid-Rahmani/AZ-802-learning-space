import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "B1 Grammatik · Klybit",
  description: "12 B1-Grammatikthemen mit Erklärungen, Übungen und Prüfungstraining.",
};

export default function B1GrammarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
