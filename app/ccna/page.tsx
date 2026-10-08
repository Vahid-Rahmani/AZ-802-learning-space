"use client";

import { ArrowRight, BookOpen, ClipboardCheck, FlaskConical, Layers, Network, Play, Search, Target } from "lucide-react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { ccnaPracticeUnits } from "@/lib/content/ccna-bank";
import { ccnaDomains, ccnaLabs, ccnaSources } from "@/lib/content/ccna";
import { ccnaLabPathStats, ccnaScenarioTypes } from "@/lib/content/ccna-lab-path";
import { ccnaTopologyStats } from "@/lib/content/ccna-topologies";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;

const pages = [
  { href: "/ccna/practice", icon: BookOpen, title: "Question practice", detail: "Work by Cisco objective, search the bank and open the exact explanation for every answer.", action: "Open question bank" },
  { href: "/ccna/exams", icon: ClipboardCheck, title: "Exam center", detail: "Choose a quick check, domain assessment, mixed review or full endurance session.", action: "Open exam center" },
  { href: "/ccna/library", icon: Network, title: `Lab library · ${ccnaLabPathStats.total}`, detail: "Browse the twelve bands, read each topology and open the matching simulator workspace.", action: "Browse labs" },
  { href: "/ccna/search", icon: Search, title: "Search & explain", detail: "Find a question by command, concept or objective and jump straight into its practice view.", action: "Search questions" },
] as const;

const firstLab = ccnaLabs[0];

function DashboardLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const go = (event: { preventDefault: () => void }) => { event.preventDefault(); window.location.href = href; };
  return <a href={href} onClick={go} className={className}>{children}</a>;
}

export default function CcnaOverviewPage() {
  return <>
    <section className="ccna-dashboard-hero" aria-labelledby="ccna-dashboard-title">
      <div className="ccna-dashboard-hero-copy">
        <p className="ccna-dashboard-eyebrow"><Copy text="CCNA · learning control center" /></p>
        <h1 id="ccna-dashboard-title"><Copy text="Train by question, lab, and topology." /></h1>
        <p><Copy text="A focused path for Cisco 200-301 v1.1: understand the objective, build the topology, prove the result, then test yourself." /></p>
        <div className="ccna-dashboard-actions">
          <DashboardLink href="/ccna/practice" className="ccna-dashboard-primary"><Play size={17} /><Copy text="Continue question practice" /></DashboardLink>
          <DashboardLink href={firstLab ? `/ccna/sim?lab=${encodeURIComponent(firstLab.id)}` : "/ccna/library"} className="ccna-dashboard-secondary"><Network size={17} /><Copy text="Open first topology" /></DashboardLink>
        </div>
      </div>
      <div className="ccna-dashboard-progress" aria-label="CCNA content overview">
        <div className="ccna-dashboard-progress-ring"><strong>CCNA</strong><span>200-301</span></div>
        <div className="ccna-dashboard-progress-copy"><strong><Copy text="One place for each activity" /></strong><span><Copy text={`${ccnaPracticeUnits.length} objective domains · ${ccnaLabPathStats.bands} lab bands · ${ccnaLabPathStats.total} topology workspaces`} /></span></div>
      </div>
    </section>

    <section className="ccna-dashboard-section" aria-labelledby="ccna-workspaces-title">
      <div className="ccna-dashboard-section-heading"><div><p className="ccna-dashboard-eyebrow"><Copy text="Choose your workspace" /></p><h2 id="ccna-workspaces-title"><Copy text="Questions, exams, and labs stay separate" /></h2></div><span className="ccna-dashboard-section-note"><Target size={15} /><Copy text="Every route keeps its own context" /></span></div>
      <ul className="ccna-dashboard-workspace-grid">{pages.map((page) => { const Icon = page.icon; return <li key={page.href}><DashboardLink href={page.href} className="ccna-dashboard-workspace-card"><span className="ccna-dashboard-card-icon"><Icon size={20} /></span><span className="ccna-dashboard-card-body"><strong><Copy text={page.title} /></strong><span><Copy text={page.detail} /></span><em><Copy text={page.action} /><ArrowRight size={15} /></em></span></DashboardLink></li>; })}</ul>
    </section>

    <section className="ccna-dashboard-section" aria-labelledby="ccna-path-title">
      <div className="ccna-dashboard-section-heading"><div><p className="ccna-dashboard-eyebrow"><Copy text="Official blueprint" /></p><h2 id="ccna-path-title"><Copy text="Six objective domains" /></h2></div><a className="ccna-dashboard-inline-link" href={ccnaSources.blueprint} target="_blank" rel="noreferrer"><Copy text="View Cisco topics" /> ↗</a></div>
      <p className="ccna-dashboard-muted"><Copy text="Select a domain to open only its questions. The percentages describe the official blueprint, not a claim that this short practice set reproduces the live exam." /></p>
      <ul className="ccna-dashboard-domain-grid">{ccnaDomains.map((domain, index) => <li key={domain.id}><DashboardLink href={`/ccna/practice?domain=${ccnaPracticeUnits[index].id}`} className="ccna-dashboard-domain-card"><span className="ccna-dashboard-domain-number">{domain.id}</span><span className="ccna-dashboard-domain-body"><strong><Copy text={domain.title} /></strong><span><Copy text={`${ccnaPracticeUnits[index].questions.length} practice questions`} /></span></span><span className="ccna-dashboard-domain-weight">{domain.weight}%</span><ArrowRight size={16} /></DashboardLink></li>)}</ul>
    </section>

    <section className="ccna-dashboard-lab-callout" aria-labelledby="ccna-next-lab-title">
      <div><p className="ccna-dashboard-eyebrow"><Copy text="Build next" /></p><h2 id="ccna-next-lab-title"><Copy text={firstLab?.title ?? "Choose a topology"} /></h2><p><Copy text={firstLab?.goal ?? "Open the library to choose a hands-on network lab."} /></p><div className="ccna-dashboard-meta"><span><FlaskConical size={15} /><Copy text={`${ccnaLabPathStats.handsOn} guided build stages`} /></span><span><Network size={15} /><Copy text={`${ccnaTopologyStats.diagrams} topology diagrams`} /></span><span><Layers size={15} /><Copy text={`${ccnaScenarioTypes.length} scenario types`} /></span></div></div>
      <div className="ccna-dashboard-lab-actions"><DashboardLink href="/ccna/library" className="ccna-dashboard-secondary"><Copy text="Browse lab bands" /><ArrowRight size={15} /></DashboardLink>{firstLab && <DashboardLink href={`/ccna/sim?lab=${encodeURIComponent(firstLab.id)}`} className="ccna-dashboard-primary"><Copy text="Open simulator" /><ArrowRight size={15} /></DashboardLink>}</div>
    </section>

    <section className="ccna-dashboard-connection" aria-label="How the learning path connects"><span><BookOpen size={17} /><Copy text="Question" /></span><ArrowRight size={16} /><span><Network size={17} /><Copy text="Lab topology" /></span><ArrowRight size={16} /><span><FlaskConical size={17} /><Copy text="Simulator" /></span><ArrowRight size={16} /><span><ClipboardCheck size={17} /><Copy text="Exam" /></span></section>

    <section className="ccna-dashboard-footnote" aria-label="CCNA content notes"><p><Copy text={`Independent practice content is reviewed against Cisco references; it is not real certification content or an exam dump. ${ccnaLabPathStats.needsReview} catalog labs are marked needs-review because their published metadata does not fully support objective mapping.`} /> <a href={ccnaSources.exam} target="_blank" rel="noreferrer"><Copy text="Official Cisco exam information" /> ↗</a></p></section>
  </>;
}
