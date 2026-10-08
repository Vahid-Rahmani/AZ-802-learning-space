"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, Filter, Network, Search, ShieldCheck, X } from "lucide-react";
import { GoogleSubtitle } from "./google-translate";
import {
  ccnaLabBands, ccnaLabById, ccnaLabObjectiveCoverage, ccnaLabPath, ccnaLabPathStats,
  ccnaLabPathReview, ccnaLabSourcesChecked, ccnaScenarioTypes, type CcnaLabEntry, type CcnaLabTier,
} from "@/lib/content/ccna-lab-path";
import { ccnaTopologySource } from "@/lib/content/ccna-topologies";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;
const scenarioLabel = (id: string) => ccnaScenarioTypes.find((type) => type.id === id)?.label ?? id;
const domainWeight: Record<string, number> = { "1.0": 20, "2.0": 20, "3.0": 25, "4.0": 10, "5.0": 15, "6.0": 10 };
const tierLabel: Record<CcnaLabTier, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", troubleshooting: "Troubleshooting" };
const pad = (value: number) => String(value).padStart(3, "0");
const ALL = "all";
const filters = {
  band: (lab: CcnaLabEntry, value: string) => value === ALL || lab.bandId === value,
  tier: (lab: CcnaLabEntry, value: string) => value === ALL || lab.tier === value,
  scenario: (lab: CcnaLabEntry, value: string) => value === ALL || lab.scenarioType === value,
  review: (lab: CcnaLabEntry, value: string) => value === ALL || lab.reviewStatus === value,
};
/** Hands-on stages have a workspace; catalog labs open the practice set for their objective domain. */
const destination = (lab: CcnaLabEntry) => lab.kind === "hands-on"
  ? `/ccna/build?lab=${encodeURIComponent(lab.id)}`
  : `/ccna/practice?domain=ccna-domain-v2-${lab.domain === "mixed" ? 1 : lab.domain.split(".")[0]}`;

/** The complete lab library: all 109 labs, organized into twelve bands in learning order, and every
 * one of them joined to its own topology diagram.
 *
 * This replaces two separate views that used to duplicate the same 101 catalog labs — a banded list
 * without pictures and a raw picture index without bands. One lab now shows its placement, its
 * diagram, its prerequisites, its fault checkpoint and its sources in a single card.
 */
export function CcnaLabPath({ initialBandId }: { initialBandId?: string } = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [band, setBand] = useState(initialBandId && ccnaLabBands.some((item) => item.id === initialBandId) ? initialBandId : ALL);
  const [tier, setTier] = useState(ALL);
  const [scenario, setScenario] = useState(ALL);
  const [review, setReview] = useState(ALL);
  const [troubleshootingOnly, setTroubleshootingOnly] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ccnaLabPath.filter((lab) =>
      filters.band(lab, band) && filters.tier(lab, tier) && filters.scenario(lab, scenario) && filters.review(lab, review)
      && (!troubleshootingOnly || lab.troubleshootingFocus === "primary")
      && (!needle || [lab.title, lab.id, scenarioLabel(lab.scenarioType), lab.objectives.join(" "), lab.tier, lab.scenario.context, lab.scenario.requirement, lab.catalogSummary ?? ""].join(" ").toLowerCase().includes(needle)));
  }, [query, band, tier, scenario, review, troubleshootingOnly]);
  const active = query !== "" || band !== ALL || tier !== ALL || scenario !== ALL || review !== ALL || troubleshootingOnly;
  const clear = () => { setQuery(""); setBand(ALL); setTier(ALL); setScenario(ALL); setReview(ALL); setTroubleshootingOnly(false); };
  const troubleshootingLabs = ccnaLabPath.filter((lab) => lab.troubleshootingFocus === "primary");
  const shownDiagrams = filtered.filter((lab) => lab.diagram).length;
  return <section id="ccna-library" className="server-labs-workspace ccna-lab-path" aria-label="CCNA lab library">
    <header className="server-labs-heading">
      <div>
        <p className="server-lab-kicker"><Copy text="CCNA · lab library" /></p>
        <h1><Copy text={`All ${ccnaLabPathStats.total} labs in ${ccnaLabPathStats.bands} bands, each with its own topology`} /></h1>
        <p><Copy text={`Every lab this site publishes — the ${ccnaLabPathStats.handsOn} hands-on build stages and the ${ccnaLabPathStats.catalog} indexed simulation labs — placed in a category band, a difficulty tier and a prerequisite order that follows the six official 200-301 v1.1 domains, with the topology diagram the source publishes for that exact lab attached to its card. Objectives, prerequisites, fault checkpoints and source references were audited on ${ccnaLabSourcesChecked}.`} /></p>
      </div>
      <span className="server-lab-badge"><Network size={20} /> <Copy text={`${ccnaLabPathStats.perTier.beginner} beginner · ${ccnaLabPathStats.perTier.intermediate} intermediate · ${ccnaLabPathStats.perTier.advanced} advanced · ${ccnaLabPathStats.perTier.troubleshooting} troubleshooting`} /></span>
    </header>

    <nav className="ccna-lab-map" aria-label="Category bands in learning order">
      {ccnaLabBands.map((item) => <a href={`/ccna/bands/${item.id}`} key={item.id} className={`ccna-lab-map-node ${band === item.id ? "is-active" : ""}`} aria-current={band === item.id ? "page" : undefined} onClick={(event) => { event.preventDefault(); router.push(`/ccna/bands/${item.id}`); }}>
        <span className="server-lab-number">{item.order}</span>
        <span className="ccna-lab-map-body">
          <strong><Copy text={item.title} /></strong>
          <span className="server-lab-meta"><Copy text={`${item.labIds.length} labs · ${tierLabel[item.tier]} · Cisco ${item.domain === "mixed" ? "integrated" : item.domain}`} /></span>
        </span>
      </a>)}
    </nav>

    <div className="ccna-lab-controls">
      <div className="ccna-lab-search">
        <Search size={18} aria-hidden="true" />
        <label className="visually-hidden" htmlFor="ccna-lab-query"><Copy text="Search every lab" /></label>
        <input id="ccna-lab-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, objective, scenario or ID…" />
      </div>
      <div className="ccna-lab-filters" role="group" aria-label="Lab filters">
        <span className="ccna-lab-filter-label"><Filter size={16} aria-hidden="true" /><Copy text="Filter" /></span>
        <label className="visually-hidden" htmlFor="ccna-lab-band"><Copy text="Category band" /></label>
        <select id="ccna-lab-band" value={band} onChange={(event) => setBand(event.target.value)}>
          <option value={ALL}>All categories</option>
          {ccnaLabBands.map((item) => <option key={item.id} value={item.id}>{`${item.order}. ${item.title}`}</option>)}
        </select>
        <label className="visually-hidden" htmlFor="ccna-lab-tier"><Copy text="Difficulty" /></label>
        <select id="ccna-lab-tier" value={tier} onChange={(event) => setTier(event.target.value)}>
          <option value={ALL}>All difficulties</option>
          {(["beginner", "intermediate", "advanced", "troubleshooting"] as CcnaLabTier[]).map((value) => <option key={value} value={value}>{tierLabel[value]}</option>)}
        </select>
        <label className="visually-hidden" htmlFor="ccna-lab-scenario"><Copy text="Scenario type" /></label>
        <select id="ccna-lab-scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}>
          <option value={ALL}>All scenarios</option>
          {ccnaScenarioTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <label className="visually-hidden" htmlFor="ccna-lab-review"><Copy text="Review status" /></label>
        <select id="ccna-lab-review" value={review} onChange={(event) => setReview(event.target.value)}>
          <option value={ALL}>All review states</option>
          <option value="reviewed">Reviewed sources</option>
          <option value="needs-review">Needs review</option>
        </select>
        <button type="button" className={`ccna-lab-toggle ${troubleshootingOnly ? "is-on" : ""}`} aria-pressed={troubleshootingOnly} onClick={() => setTroubleshootingOnly((value) => !value)}>
          <AlertTriangle size={16} aria-hidden="true" /><Copy text="Troubleshooting track" />
        </button>
        {active && <button type="button" className="ccna-lab-clear" onClick={clear}><X size={16} aria-hidden="true" /><Copy text="Clear" /></button>}
      </div>
      <p className="server-lab-meta ccna-lab-result" role="status" aria-live="polite"><Copy text={`${filtered.length} of ${ccnaLabPathStats.total} labs shown · ${shownDiagrams} with a topology diagram${active ? " · filters active" : ""}`} /></p>
    </div>

    <section className="ccna-lab-track" aria-labelledby="ccna-lab-track-title">
      <h2 id="ccna-lab-track-title"><Copy text={`The troubleshooting track · ${troubleshootingLabs.length} labs`} /></h2>
      <p><Copy text="Labs whose purpose is repair rather than construction. Each one publishes the fault to reproduce and the recovery it must end with, so a passing result means the original requirement works again — not that the error message went away." /></p>
      <ul>{troubleshootingLabs.map((lab) => <li key={lab.id}><button type="button" onClick={() => { setTroubleshootingOnly(true); setBand(ALL); setQuery(lab.title); }}><Copy text={lab.title} /></button></li>)}</ul>
    </section>

    {ccnaLabBands.map((item) => {
      const labs = filtered.filter((lab) => lab.bandId === item.id);
      if (labs.length === 0) return null;
      const prerequisites = item.prerequisiteBands.map((id) => ccnaLabBands.find((entry) => entry.id === id)).filter(Boolean);
      return <section key={item.id} id={item.id} className="ccna-lab-band" aria-labelledby={`${item.id}-title`}>
        <div className="ccna-lab-band-heading">
          <p className="server-lab-kicker"><Copy text={`Band ${item.order} of ${ccnaLabBands.length} · ${tierLabel[item.tier]} · Cisco ${item.domain === "mixed" ? "several domains" : `${item.domain} · ${domainWeight[item.domain] ?? 0}% of the blueprint`}`} /></p>
          <h2 id={`${item.id}-title`}><Copy text={item.title} /></h2>
          <p><Copy text={item.summary} /></p>
          <p className="ccna-lab-band-meta">
            <span><Copy text={`${item.labIds.length} labs · about ${item.minutes} minutes each`} /></span>
            <span><Copy text={`Objectives ${item.objectives.join(", ")}`} /></span>
            <span><Copy text={`Tiers ${item.tiers.map((value) => tierLabel[value]).join(", ")}`} /></span>
          </p>
          {prerequisites.length > 0
            ? <p className="ccna-lab-prereq"><strong><Copy text="Finish first:" /></strong> {prerequisites.map((entry) => <button type="button" key={entry!.id} onClick={() => setBand(entry!.id)}><Copy text={`${entry!.order}. ${entry!.title}`} /></button>)}</p>
            : <p className="ccna-lab-prereq"><strong><Copy text="Finish first:" /></strong> <Copy text="Nothing — this is the entry band." /></p>}
          <details className="ccna-lab-band-detail">
            <summary><Copy text="Standard verification and sources for this band" /></summary>
            <ul>{item.verification.map((command) => <li key={command}><Copy text={command} /></li>)}</ul>
            <p className="server-lab-meta"><Copy text={`Sources audited ${ccnaLabSourcesChecked}.`} /> {[...new Set(labs.flatMap((lab) => lab.sourceRefs.map((source) => source.url)))].map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url} ↗</a>)}</p>
          </details>
        </div>
        <ol className="ccna-lab-list">
          {labs.map((lab) => <li key={lab.id} id={`ccna-lab-${lab.id}`} className={`ccna-lab-card is-${lab.tier} ${lab.reviewStatus === "needs-review" ? "needs-review" : ""}`}>
            <div className="ccna-lab-card-head">
              <span className="ccna-lab-card-number">{lab.kind === "hands-on" ? "Stage" : pad(lab.number ?? 0)}</span>
              <div className="ccna-lab-card-title">
                <h3><a className="ccna-lab-detail-link" href={`/ccna/labs/${encodeURIComponent(lab.id)}`}><Copy text={lab.title} /></a></h3>
                <p className="server-lab-meta"><Copy text={`${tierLabel[lab.tier]} · ${lab.duration} min · ${scenarioLabel(lab.scenarioType)}${lab.kind === "hands-on" ? " · saved checkpoint" : ""}`} /></p>
              </div>
              {lab.reviewStatus === "needs-review"
                ? <span className="ccna-lab-flag"><AlertTriangle size={15} aria-hidden="true" /><Copy text="Needs review" /></span>
                : <span className="ccna-lab-flag is-ok"><ShieldCheck size={15} aria-hidden="true" /><Copy text="Reviewed" /></span>}
            </div>
            {lab.diagram
              ? <figure className="ccna-lab-figure">
                {/* The catalog ships these diagrams pre-sized. The Next image optimizer would re-encode
                    every one of them per request and spend the metered image quota for no visible gain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lab.diagram.src} alt={`${lab.title} topology diagram`} loading="lazy" decoding="async" width={lab.diagram.width} height={lab.diagram.height} />
                <figcaption><Copy text={`Topology published for lab ${pad(lab.number ?? 0)} of the ${ccnaTopologySource.catalog} catalog.`} /></figcaption>
              </figure>
              : <p className="ccna-lab-no-figure"><Copy text={lab.kind === "hands-on" ? "Hands-on stage: build the topology from the diagram described in the workspace steps." : "Concept lab — the source catalog publishes no topology diagram for this lab."} /></p>}
            <div className="ccna-lab-actions">
              <a className="server-lab-primary" href={`/ccna/labs/${encodeURIComponent(lab.id)}`}><BookOpen size={17} aria-hidden="true" /><Copy text="Open lab brief" /></a>
              <a className="server-lab-primary" href={`/ccna/sim?lab=${encodeURIComponent(lab.id)}`}><Network size={17} aria-hidden="true" /><Copy text="Open practice terminal & topology" /></a>
              <a className="server-lab-primary" href={destination(lab)} onClick={(event) => { event.preventDefault(); window.location.href = destination(lab); }}><BookOpen size={17} aria-hidden="true" /><Copy text={lab.kind === "hands-on" ? "Open this lab workspace" : "Practice this domain"} /></a>
              <a className="ccna-lab-source" href={lab.sourceRefs[0].url} target="_blank" rel="noreferrer"><Copy text={lab.sourceRefs[0].title} /> ↗</a>
            </div>
            {/* Collapsed by default: the diagram above is the point of the library, and everything the
                audit recorded is one click away rather than trimmed to keep the list short. */}
            <details className="ccna-lab-brief">
              <summary><Copy text="Lab brief · scenario, prerequisites, fault and sources" /></summary>
              <dl className="ccna-lab-scenario">
                <div><dt><Copy text="Your role" /></dt><dd><Copy text={`${lab.scenario.role} ${lab.scenario.context}.`} /></dd></div>
                <div><dt><Copy text="Requirement" /></dt><dd><Copy text={lab.scenario.requirement} /></dd></div>
              </dl>
              {lab.catalogSummary && <div className="ccna-lab-catalog-summary"><dt><Copy text="Source catalog summary" /></dt><dd><Copy text={lab.catalogSummary} /></dd></div>}
              {lab.catalogSummaryIssue && <p className="ccna-lab-review-note"><Copy text={lab.catalogSummaryIssue} /></p>}
              <p className="server-lab-meta"><Copy text={`Objectives ${lab.objectives.join(", ")} · Cisco domain ${lab.domain} · ${lab.kind === "hands-on" ? `${lab.artifacts.steps} steps, ${lab.artifacts.tests} tests, ${lab.artifacts.questions} questions` : "indexed simulation lab. The vendor's lab instructions are not published here, so this entry has no checkpoint and links to the practice set for its objective domain."}`} /></p>
              <p><strong><Copy text="Break it:" /></strong> <Copy text={lab.fault.failure} /></p>
              <p><strong><Copy text="Prove the repair:" /></strong> <Copy text={lab.fault.recovery} /></p>
              {lab.reviewNote && <p className="ccna-lab-review-note"><Copy text={`Needs review: ${lab.reviewNote}`} /></p>}
              <div className="ccna-lab-links">
                <span><strong><Copy text="Prerequisites:" /></strong> {lab.prerequisites.length === 0 ? <Copy text="none" /> : lab.prerequisites.map((id) => { const entry = ccnaLabById.get(id); return entry ? <button type="button" key={id} onClick={() => setQuery(entry.title)}><Copy text={entry.title} /></button> : null; })}</span>
                <span><strong><Copy text="Related:" /></strong> {lab.relatedLabIds.map((id) => { const entry = ccnaLabById.get(id); return entry ? <button type="button" key={id} onClick={() => setQuery(entry.title)}><Copy text={entry.title} /></button> : null; })}</span>
                <span><strong><Copy text="Verify with:" /></strong> <Copy text={lab.verification.slice(0, 4).join(" · ")} /></span>
                <span><strong><Copy text="Sources:" /></strong> {lab.sourceRefs.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><Copy text={`${source.title} (${source.key}, checked ${source.checked})`} /> ↗</a>)}</span>
              </div>
            </details>
          </li>)}
        </ol>
      </section>;
    })}

    {filtered.length === 0 && <p className="ccna-lab-empty" role="status"><Copy text="No lab matches these filters. Clear one filter to widen the search — every lab here is already published, so nothing has been removed." /></p>}

    <section className="ccna-lab-coverage" aria-labelledby="ccna-lab-coverage-title">
      <h2 id="ccna-lab-coverage-title"><Copy text="What this library does not cover" /></h2>
      <p><Copy text={`Objective coverage was read from the official 200-301 v1.1 topic list. ${ccnaLabObjectiveCoverage.covered.length} of those topics are built by at least one lab in this library. The topics below are answered by the question bank but built by no lab at all — they are listed instead of being left to look covered:`} /></p>
      <ul>{ccnaLabObjectiveCoverage.noLabInLibrary.map((gap) => <li key={gap.objective}><strong>{gap.objective}</strong> <Copy text={gap.label} /><span className="server-lab-meta"><Copy text={gap.reason} /></span></li>)}</ul>
      <p className="server-lab-meta"><Copy text={`${ccnaLabPathReview.needsReview.length} of ${ccnaLabPathStats.total} labs are marked needs-review because the published catalog metadata does not support their mapping; ${ccnaLabPathReview.summaryIssues.length} of those has a summary the source catalog itself duplicates for another lab. Both lists stay visible instead of being quietly corrected.`} /></p>
      <p className="server-lab-meta"><Copy text={`Lab names, summaries and diagrams come from the ${ccnaTopologySource.catalog} lab catalog (${ccnaTopologySource.exam}), retrieved ${ccnaTopologySource.retrieved}, and are reproduced unedited. This site does not publish that product's lab instructions and is not affiliated with, sponsored by or endorsed by its vendor.`} /> <a href={ccnaTopologySource.notice} target="_blank" rel="noreferrer"><Copy text="Source and attribution" /> ↗</a></p>
    </section>
  </section>;
}
