"use client";

import { ArrowRight, BookOpen, Clock3, Layers3, ListChecks, TimerReset } from "lucide-react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { ccnaDomains, ccnaSources } from "@/lib/content/ccna";
import { ccnaPracticeUnits, ccnaQuestionCount } from "@/lib/content/ccna-bank";
import { useCcnaShell } from "../layout";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;

const modes = [
  {
    id: "quick",
    icon: TimerReset,
    title: "Quick check",
    detail: "A short eight-question refresher for one focused study block.",
    meta: "8 questions · 18 minutes",
    href: "/ccna/practice?mode=quick",
    action: "Open quick practice",
    tone: "cyan",
  },
  {
    id: "domain",
    icon: Layers3,
    title: "Domain assessment",
    detail: "Stay inside one Cisco blueprint domain and review every explanation before moving on.",
    meta: "One objective domain",
    href: "/ccna/practice",
    action: "Choose a domain",
    tone: "violet",
  },
  {
    id: "mixed",
    icon: ListChecks,
    title: "Mixed review",
    detail: "Combine questions from the six official domains to reveal gaps between topics.",
    meta: "60 questions · 75 minutes",
    href: "/ccna/practice?mode=mixed",
    action: "Open mixed practice",
    tone: "green",
  },
  {
    id: "full",
    icon: Clock3,
    title: "Full endurance review",
    detail: "A long internal review session. It is not presented as an exact Cisco exam replica.",
    meta: "120 questions · 120 minutes",
    href: "/ccna/practice?mode=full",
    action: "Open full review",
    tone: "amber",
  },
] as const;

function go(href: string) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault();
    window.location.href = href;
  };
}

export default function CcnaExamsPage() {
  useCcnaShell();
  return <main className="ccna-exam-center" aria-labelledby="ccna-exam-title">
    <header className="ccna-exam-heading">
      <div>
        <p className="ccna-dashboard-eyebrow"><Copy text="CCNA · assessment workspace" /></p>
        <h1 id="ccna-exam-title"><Copy text="Exam center" /></h1>
        <p><Copy text="Choose how you want to test your knowledge. Your question practice remains separate, so opening an assessment never hides the domain bank or your saved explanations." /></p>
      </div>
      <div className="ccna-exam-heading-stat"><strong>{ccnaQuestionCount}</strong><span><Copy text="questions in the bank" /></span></div>
    </header>

    <section className="ccna-exam-mode-grid" aria-label="Assessment modes">
      {modes.map((mode) => { const Icon = mode.icon; return <article key={mode.id} className={`ccna-exam-mode-card is-${mode.tone}`}>
        <span className="ccna-exam-mode-icon"><Icon size={22} /></span>
        <div className="ccna-exam-mode-content"><p className="ccna-exam-mode-meta"><Copy text={mode.meta} /></p><h2><Copy text={mode.title} /></h2><p><Copy text={mode.detail} /></p><a href={mode.href} onClick={go(mode.href)} className="ccna-exam-action"><Copy text={mode.action} /><ArrowRight size={16} /></a></div>
      </article>; })}
    </section>

    <section className="ccna-exam-domain-panel" aria-labelledby="ccna-exam-domain-title">
      <div className="ccna-exam-panel-heading"><div><p className="ccna-dashboard-eyebrow"><Copy text="Targeted preparation" /></p><h2 id="ccna-exam-domain-title"><Copy text="Start with one official domain" /></h2></div><a className="ccna-dashboard-inline-link" href="/ccna/practice" onClick={go("/ccna/practice")}><BookOpen size={16} /><Copy text="Open question bank" /></a></div>
      <ul className="ccna-exam-domain-list">{ccnaDomains.map((domain, index) => <li key={domain.id}><a href={`/ccna/practice?domain=${ccnaPracticeUnits[index].id}`} onClick={go(`/ccna/practice?domain=${ccnaPracticeUnits[index].id}`)}><span className="ccna-exam-domain-id">{domain.id}</span><span><strong><Copy text={domain.title} /></strong><small><Copy text={`${ccnaPracticeUnits[index].questions.length} questions · ${domain.weight}% official weighting`} /></small></span><ArrowRight size={16} /></a></li>)}</ul>
    </section>

    <aside className="ccna-exam-note"><strong><Copy text="Important" /></strong><p><Copy text="These are original learning sessions built from Cisco's published objectives and references. They are not real certification questions, exam dumps, or a claim to reproduce Cisco's live delivery." /> <a href={ccnaSources.exam} target="_blank" rel="noreferrer"><Copy text="Cisco exam information" /> ↗</a></p></aside>
  </main>;
}
