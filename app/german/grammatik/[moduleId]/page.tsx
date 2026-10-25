import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GermanGrammarShell } from "@/app/components/german-grammar-shell";
import { getCurriculumModule, readyGrammarModules } from "@/lib/content/german-a1b2/curriculum";

export function generateStaticParams() {
  return readyGrammarModules.map((module) => ({ moduleId: module.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ moduleId: string }> }): Promise<Metadata> {
  const { moduleId } = await params;
  const entry = getCurriculumModule(moduleId);
  if (!entry || entry.status !== "ready") return { title: "Grammatik A1–B2 · Klybit" };
  return {
    title: `${entry.title} · Grammatik A1–B2 · Klybit`,
    description: `${entry.summaryFa} ${entry.questions.length} Fragen mit deutscher Erklärung, Schreiben und Diktat.`,
  };
}

export default async function GermanGrammarModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const entry = getCurriculumModule(moduleId);
  if (!entry || entry.status !== "ready") notFound();
  return <GermanGrammarShell view="module" moduleId={entry.id} />;
}
