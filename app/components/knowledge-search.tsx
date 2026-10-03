"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Search, ShieldCheck, Sparkles } from "lucide-react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { questions } from "@/lib/course-data";
import { createKnowledgeSearch, type KnowledgeQuestion } from "@/lib/knowledge-search";

const defaultExamples = [
  "Which FSMO role allocates RID pools?",
  "چطور نقش FSMO خراب را منتقل کنم؟",
  "Failover cluster quorum",
];

export function KnowledgeSearch({
  showTranslations,
  onPracticeQuestion,
  questionBank = questions,
  courseCode = "AZ-802",
  courseName = "Windows Server",
  examples = defaultExamples,
  sourceName = "Microsoft Learn",
}: {
  showTranslations: boolean;
  onPracticeQuestion: (questionId: string) => void;
  questionBank?: readonly KnowledgeQuestion[];
  courseCode?: string;
  courseName?: string;
  examples?: string[];
  sourceName?: string;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const knowledgeSearch = useMemo(() => createKnowledgeSearch(questionBank), [questionBank]);
  const { results, best, supported, answerStrength } = useMemo(() => knowledgeSearch.search(submittedQuery), [knowledgeSearch, submittedQuery]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const askExample = (value: string) => {
    setQuery(value);
    setSubmittedQuery(value);
  };

  return <section className="mx-auto max-w-5xl space-y-5" aria-labelledby="knowledge-search-title">
    <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_35%),linear-gradient(145deg,rgba(11,25,40,.96),rgba(4,8,14,.98))] p-5 shadow-2xl shadow-black/25 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-300"><Sparkles size={15} /> {courseCode} knowledge search</p>
          <h2 id="knowledge-search-title" className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Ask the existing question bank</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">Write a {courseName} question in English or Persian. CertPath finds the closest evidence in the {questionBank.length}-question bank and answers only from its stored answer, rationale, and {sourceName} reference.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-100"><ShieldCheck size={16} /><span>No external AI · no invented answer</span></div>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="knowledge-query" className="sr-only">Ask the {courseCode} question bank</label>
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300" />
          <input id="knowledge-query" type="search" dir="auto" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Example: ${examples[0] ?? courseName}`} className="min-h-13 w-full rounded-2xl border border-white/15 bg-black/25 py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10" />
        </div>
        <button type="submit" disabled={!query.trim()} className="min-h-13 rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-[#06131a] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">Find answer</button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Example searches">{examples.map((example) => <button key={example} type="button" dir="auto" onClick={() => askExample(example)} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-start text-xs text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-100">{example}</button>)}</div>
    </div>

    {submittedQuery && !supported && <div role="status" className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5">
      <h3 className="font-semibold text-amber-100">No reliable answer found</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">Try a product name, service, concept, or shorter technical phrase. CertPath will not create an answer when the current bank does not contain enough evidence.</p>
    </div>}

    {supported && best && <article className="rounded-3xl border border-cyan-300/20 bg-[#0c1623] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Answer from {best.item.id}</p><p className="mt-1 text-xs text-slate-400">{answerStrength} · {best.item.domain}</p></div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">Bank evidence only</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold leading-8 text-white"><GoogleSubtitle text={best.item.question} enabled={showTranslations} /></h3>
      <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/[.06] p-4">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">Best supported answer</p>
        <div className="mt-2 text-lg font-bold text-emerald-50"><GoogleSubtitle text={best.item.answer} enabled={showTranslations} /></div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Why</p>
        <div className="mt-2 text-sm leading-7 text-slate-200"><GoogleSubtitle text={best.item.rationaleEn} enabled={showTranslations} /></div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => onPracticeQuestion(best.item.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-[#06131a]"><BookOpenCheck size={17} /> Practice this question</button>
        <a href={best.item.source} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-cyan-100">{sourceName} source <ArrowRight size={16} /></a>
      </div>
    </article>}

    {supported && results.length > 1 && <div className="rounded-3xl border border-white/10 bg-[#0b131f] p-5 sm:p-7">
      <h3 className="font-semibold text-white">Related evidence</h3>
      <div className="mt-4 grid gap-3">{results.slice(1, 6).map((result) => <button type="button" key={result.item.id} onClick={() => { setQuery(result.item.question); setSubmittedQuery(result.item.question); }} className="group rounded-2xl border border-white/10 bg-white/[.025] p-4 text-start transition hover:border-cyan-300/30 hover:bg-cyan-300/[.04]">
        <span className="text-xs font-semibold text-cyan-300">{result.item.id} · {result.item.domain}</span>
        <span className="mt-2 block text-sm leading-6 text-slate-200">{result.item.question}</span>
      </button>)}</div>
    </div>}

    <p className="px-1 text-xs leading-5 text-slate-500">This feature searches the current {courseCode} practice bank. Use the linked {sourceName} page for final verification.</p>
  </section>;
}
