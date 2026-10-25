import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grammatik A1–B2 · Klybit",
  description: "Die B1-Grammatikthemen sind Teil der einheitlichen Grammatik A1–B2.",
};

export default function B1GrammarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
