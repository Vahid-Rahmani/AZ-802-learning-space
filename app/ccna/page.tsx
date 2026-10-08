"use client";

import { ArrowRight, BookOpen, FlaskConical, Layers, Network, Search } from "lucide-react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { ccnaPracticeUnits } from "@/lib/content/ccna-bank";
import { ccnaDomains, ccnaLabs, ccnaSources } from "@/lib/content/ccna";
import { ccnaLabPathStats, ccnaScenarioTypes } from "@/lib/content/ccna-lab-path";
import { ccnaTopologyStats } from "@/lib/content/ccna-topologies";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;

/** Hard navigation, the same one the course switcher uses: the client-side router swallows anchor
 * clicks in this runtime, so a plain href alone would strand the learner on the overview. */
const go = (href: string) => (event: { preventDefault: () => void }) => { event.preventDefault(); window.location.href = href; };

const pages = [
  { href: "/ccna/practice", icon: BookOpen, title: "Question bank & Explain", detail: "Practice by objective with the stored explanation and the exact Cisco or IETF reference for every answer." },
  { href: "/ccna/search", icon: Search, title: "Search all CCNA questions", detail: "Ask in English or Persian and open the closest stored question, without any external AI." },
  { href: "/ccna/build", icon: FlaskConical, title: "Build stages & workspaces", detail: "The eight hands-on stages: steps, practical tests, knowledge check and evidence, saved to your account." },
  { href: "/ccna/library", icon: Network, title: `Lab library · ${ccnaLabPathStats.total} labs`, detail: "Every lab organized into twelve bands in learning order, each with its own topology diagram, prerequisites and fault checkpoint." },
] as const;

export default function CcnaOverviewPage() {
  return <>
    <section className="mb-6" aria-label="CCNA learning pages">
      <h1 className="text-2xl font-bold"><Copy text="CCNA foundations, split into four pages" /></h1>
      <p className="mt-2 max-w-3xl text-sm leading-6"><Copy text={`The eight hands-on stages, the ${ccnaLabPathStats.total} labs with their topology diagrams, the question bank and the knowledge search each have their own page now, so nothing is buried under anything else. Progress, saved answers and evidence keep working exactly as before on every one of them.`} /></p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{pages.map((page) => { const Icon = page.icon; return <li key={page.href}><a href={page.href} onClick={go(page.href)} className="sidebar-course-card flex h-full min-h-28 flex-col gap-2 rounded-xl border border-white/10 p-4"><span className="flex items-center gap-2 font-semibold text-cyan-200"><Icon size={18} /><Copy text={page.title} /></span><span className="text-sm leading-6 text-slate-300"><Copy text={page.detail} /></span><span className="mt-auto flex items-center gap-1 text-sm text-cyan-200"><Copy text="Open" /><ArrowRight size={15} /></span></a></li>; })}</ul>
    </section>
    <section className="mb-6" aria-label="Official CCNA domains">
      <h2 className="text-xl font-bold"><Copy text="200-301 v1.1 · six official domains" /></h2>
      <p className="mt-2 text-sm"><Copy text="Each domain opens its own practice set with every stored question for that part of the blueprint." /></p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{ccnaDomains.map((domain, index) => <li key={domain.id}><a href={`/ccna/practice?domain=${ccnaPracticeUnits[index].id}`} onClick={go(`/ccna/practice?domain=${ccnaPracticeUnits[index].id}`)} className="sidebar-course-card flex min-h-12 w-full items-center gap-3 rounded-lg border border-white/10 p-3 text-start"><span className="text-sm text-slate-400">{domain.weight}%</span><span className="font-medium"><Copy text={domain.title} /></span><span className="ms-auto text-sm text-slate-400">{ccnaPracticeUnits[index].questions.length}</span></a></li>)}</ul>
      <p className="mt-3 text-sm"><Copy text="Foundation coverage, not every exam objective. Domain percentages describe the official blueprint, not the weighting of these short learning quizzes." /> <a className="underline" href={ccnaSources.blueprint} target="_blank" rel="noreferrer"><Copy text="Official objectives" /> ↗</a></p>
    </section>
    <section aria-label="What the library contains">
      <h2 className="text-xl font-bold"><Copy text="What the lab library holds" /></h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { term: "Labs", detail: `${ccnaLabPathStats.total}`, note: `${ccnaLabPathStats.handsOn} build stages + ${ccnaLabPathStats.catalog} catalog labs` },
          { term: "Bands", detail: `${ccnaLabPathStats.bands}`, note: `in official blueprint order` },
          { term: "Topology diagrams", detail: `${ccnaTopologyStats.diagrams}`, note: `of ${ccnaTopologyStats.labs} catalog labs` },
          { term: "Scenario types", detail: `${ccnaScenarioTypes.length}`, note: `role-based framing on every lab` },
        ].map((item) => <div key={item.term} className="sidebar-course-card rounded-xl border border-white/10 p-4"><dt className="text-sm text-slate-400"><Copy text={item.term} /></dt><dd className="mt-1 text-2xl font-bold">{item.detail}</dd><dd className="mt-1 text-xs text-slate-400"><Copy text={item.note} /></dd></div>)}
      </dl>
      <p className="mt-4 text-sm"><Copy text={`Independent original labs and adapted MIT-licensed practice questions reviewed against Cisco references; no real certification questions or exam dumps. Labs run in your own desktop simulator, not inside this website. The final automation stage is an offline worksheet. ${ccnaLabPathStats.needsReview} catalog labs are marked needs-review because the published catalog metadata does not support their mapping.`} /> <a className="underline" href={ccnaSources.exam} target="_blank" rel="noreferrer"><Copy text="Official Cisco exam information" /> ↗</a></p>
      <p className="mt-2 text-sm"><Layers size={14} className="inline" /> <Copy text={`${ccnaLabs.length} of the ${ccnaLabPathStats.total} labs are build stages with a saved checkpoint on this site; the other ${ccnaLabPathStats.catalog} are indexed simulation labs whose vendor instructions are not published here.`} /></p>
    </section>
  </>;
}
