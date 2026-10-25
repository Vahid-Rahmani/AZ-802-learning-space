import type { Metadata } from "next";
import { B1GrammarRedirect } from "./redirect-client";

export const metadata: Metadata = {
  title: "Grammatik A1–B2 · Klybit",
  description: "Die B1-Grammatikthemen sind Teil der einheitlichen Grammatik A1–B2.",
};

export default function GermanB1GrammarPage() {
  return <B1GrammarRedirect />;
}
