import type { Metadata } from "next";
import { GermanGrammarShell } from "@/app/components/german-grammar-shell";

export const metadata: Metadata = {
  title: "Grammatik A1–B2 · Klybit",
  description: "Ein Grammatikkurs von A1 bis B2 mit zwanzig Modulen, deutschen Lektionen, Schreiben, Diktat und gespeichertem Lernfortschritt.",
};

export default function GermanGrammarPage() {
  return <GermanGrammarShell view="dashboard" />;
}
