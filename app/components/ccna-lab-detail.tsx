"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, CircleAlert, ExternalLink, Eye, FlaskConical, Network, Play, ShieldCheck, Terminal, Waypoints, X } from "lucide-react";
import { GoogleSubtitle } from "./google-translate";
import type { CcnaLabBand, CcnaLabEntry } from "@/lib/content/ccna-lab-path";
import type { CcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";

type CcnaLabDetailProps = {
  lab: CcnaLabEntry;
  band: CcnaLabBand;
  pack: CcnaSimulationPack;
  relatedLabs: CcnaLabEntry[];
};

const Copy = ({ text, className = "" }: { text: string; className?: string }) => <GoogleSubtitle text={text} className={className} />;
const tierLabel: Record<CcnaLabEntry["tier"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  troubleshooting: "Troubleshooting",
};

function DeviceGlyph({ kind }: { kind: CcnaSimulationPack["devices"][number]["kind"] }) {
  const labels: Record<typeof kind, string> = {
    router: "R",
    switch: "SW",
    pc: "PC",
    server: "S",
    "access-point": "AP",
    firewall: "FW",
    cloud: "☁",
  };
  return <span className={`ccna-detail-device-glyph is-${kind}`} aria-hidden="true">{labels[kind]}</span>;
}

export function CcnaLabDetail({ lab, band, pack, relatedLabs }: CcnaLabDetailProps) {
  const [isTopologyOpen, setTopologyOpen] = useState(false);
  const outline = pack.topologyOutline;
  const checklist = pack.checklist ?? [];
  const devices = pack.devices ?? [];
  const links = pack.links ?? [];
  const diagramAlt = `${lab.title} network topology`;

  return <article className="ccna-lab-detail server-labs-workspace" aria-labelledby="ccna-lab-detail-title">
    <nav className="ccna-detail-breadcrumbs" aria-label="Lab breadcrumb">
      <a href="/ccna/library"><ArrowLeft size={16} aria-hidden="true" /><Copy text="Lab library" /></a>
      <span aria-hidden="true">/</span>
      <a href={`/ccna/bands/${band.id}`}><Copy text={band.title} /></a>
      <span aria-hidden="true">/</span>
      <span aria-current="page"><Copy text={lab.title} /></span>
    </nav>

    <header className="ccna-detail-hero">
      <div className="ccna-detail-hero-copy">
        <p className="server-lab-kicker"><Copy text={`CCNA · Band ${band.order} · ${lab.id}`} /></p>
        <h1 id="ccna-lab-detail-title"><Copy text={lab.title} /></h1>
        <p className="ccna-detail-summary"><Copy text={lab.catalogSummary ?? lab.scenario.requirement} /></p>
        <div className="ccna-detail-badges" aria-label="Lab metadata">
          <span><Network size={15} aria-hidden="true" /><Copy text={`${tierLabel[lab.tier]} · ${lab.duration} min`} /></span>
          <span><Waypoints size={15} aria-hidden="true" /><Copy text={`${lab.objectives.length} objectives · Cisco ${lab.domain}`} /></span>
          <span className={lab.reviewStatus === "reviewed" ? "is-reviewed" : "is-review"}>{lab.reviewStatus === "reviewed" ? <ShieldCheck size={15} aria-hidden="true" /> : <CircleAlert size={15} aria-hidden="true" />}<Copy text={lab.reviewStatus === "reviewed" ? "Reviewed source mapping" : "Needs content review"} /></span>
        </div>
      </div>
      <div className="ccna-detail-hero-actions">
        <a className="ccna-detail-primary" href={`/ccna/sim?lab=${encodeURIComponent(lab.id)}`}><Play size={17} aria-hidden="true" /><Copy text="Start guided practice" /></a>
        <a className="ccna-detail-secondary" href={`/ccna/practice?domain=ccna-domain-v2-${lab.domain === "mixed" ? 1 : lab.domain.split(".")[0]}`}><BookOpen size={17} aria-hidden="true" /><Copy text="Practice related questions" /></a>
      </div>
    </header>

    <section className="ccna-detail-overview" aria-label="Lab overview">
      <div className="ccna-detail-panel ccna-detail-scenario">
        <div className="ccna-detail-panel-heading"><span className="ccna-detail-panel-icon">01</span><h2><Copy text="Scenario and objective" /></h2></div>
        <p className="ccna-detail-role"><Copy text={lab.scenario.role} /></p>
        <p><Copy text={`${lab.scenario.context}.`} /></p>
        <div className="ccna-detail-callout"><strong><Copy text="Success condition" /></strong><p><Copy text={lab.scenario.requirement} /></p></div>
        <p><strong><Copy text="Exam objectives" /></strong></p>
        <div className="ccna-detail-tags">{lab.objectives.map((objective) => <span key={objective}><Copy text={objective} /></span>)}</div>
      </div>

      <details className="ccna-detail-panel">
        <summary><Copy text="Before you start" /></summary>
        {lab.prerequisites.length > 0 ? <ul className="ccna-detail-list">{lab.prerequisites.map((item) => <li key={item}><CheckCircle2 size={16} aria-hidden="true" /><Copy text={item} /></li>)}</ul> : <p><Copy text="No prerequisite lab is required. This is an entry point for the learning path." /></p>}
        <p className="ccna-detail-muted"><Copy text={`This lab belongs to ${band.title}. Complete the prerequisite band before attempting the practical test.`} /></p>
      </details>

      <details className="ccna-detail-panel">
        <summary><Copy text="Troubleshooting challenge" /></summary>
        <p><strong><Copy text="Reproduce" /></strong></p>
        <p><Copy text={lab.fault.failure} /></p>
        <p><strong><Copy text="Recover" /></strong></p>
        <p><Copy text={lab.fault.recovery} /></p>
      </details>
    </section>

    <section className="ccna-detail-topology-section" aria-labelledby="ccna-detail-topology-title">
      <div className="ccna-detail-section-heading">
        <div><p className="server-lab-kicker"><Copy text="Read it before you build it" /></p><h2 id="ccna-detail-topology-title"><Copy text="Topology and device map" /></h2><p><Copy text="Use the published diagram as the reference, then open the simulator to connect ports, inspect the graph and verify the path." /></p></div>
        <div className="ccna-detail-section-actions">
          {lab.diagram && <button type="button" className="ccna-detail-secondary" onClick={() => setTopologyOpen(true)}><Eye size={17} aria-hidden="true" /><Copy text="View topology" /></button>}
        </div>
      </div>
      <div className="ccna-detail-topology-grid">
        <figure className="ccna-detail-diagram">
          {lab.diagram ? <>
            {/* The catalog diagrams are local, pre-sized assets; regular img keeps their source dimensions intact. */}
            <button type="button" className="ccna-detail-diagram-button" onClick={() => setTopologyOpen(true)} aria-label={`View larger topology for ${lab.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lab.diagram.src} alt={diagramAlt} width={lab.diagram.width} height={lab.diagram.height} />
            </button>
            <figcaption><Copy text={`Topology diagram for ${lab.title}.`} /></figcaption>
          </> : <div className="ccna-detail-diagram-empty"><Network size={34} aria-hidden="true" /><strong><Copy text="No source diagram was published for this lab" /></strong><p><Copy text="The editable starter graph on the simulator page is the working topology for this concept lab." /></p></div>}
        </figure>
        <div className="ccna-detail-device-map">
          <div className="ccna-detail-subheading"><h3><Copy text="Devices in the simulator" /></h3><span><Copy text={`${devices.length} devices · ${links.length} starter links`} /></span></div>
          <div className="ccna-detail-device-grid">{devices.map((device) => <article key={device.id} className="ccna-detail-device-card"><DeviceGlyph kind={device.kind} /><div><strong><Copy text={device.label} /></strong><span><Copy text={device.subtitle ?? device.kind} /></span><small><Copy text={`${device.ports.length} ports`} /></small></div></article>)}</div>
          {outline && <div className="ccna-detail-outline"><h3><Copy text={outline.title} /></h3><ul>{outline.nodes.map((node) => <li key={`${node.title}-${node.detail}`}><strong><Copy text={node.title} /></strong><span><Copy text={node.detail} /></span></li>)}</ul><p><Copy text={outline.note} /></p></div>}
        </div>
      </div>
    </section>

    <details className="ccna-detail-workflow">
      <summary><Copy text="Preview practice steps and verification commands" /></summary>
      <div className="ccna-detail-workflow-grid">
        <div className="ccna-detail-panel">
          <div className="ccna-detail-panel-heading"><span className="ccna-detail-panel-icon"><FlaskConical size={17} aria-hidden="true" /></span><h3><Copy text="Practical checklist" /></h3></div>
          <ol className="ccna-detail-checklist">{checklist.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong><Copy text={item.title} /></strong>{item.detail && <p><Copy text={item.detail} /></p>}</div></li>)}</ol>
        </div>
        <div className="ccna-detail-panel">
          <div className="ccna-detail-panel-heading"><span className="ccna-detail-panel-icon"><CheckCircle2 size={17} aria-hidden="true" /></span><h3><Copy text="Verification tests" /></h3></div>
          <ul className="ccna-detail-test-list">{lab.verification.map((command) => <li key={command}><code>{command}</code><span><Copy text="Run it after the change and save the output as evidence." /></span></li>)}</ul>
          <div className="ccna-detail-evidence"><strong><Copy text="Evidence to record" /></strong><p><Copy text="Capture the device name, command or observation, expected result, actual result and time. Never include passwords, tokens or private credentials." /></p></div>
        </div>
      </div>
    </details>

    <section className="ccna-detail-bottom-grid" aria-label="Related resources">
      <div className="ccna-detail-panel">
        <div className="ccna-detail-panel-heading"><span className="ccna-detail-panel-icon">↗</span><h2><Copy text="Official sources" /></h2></div>
        <ul className="ccna-detail-source-list">{lab.sourceRefs.map((source) => <li key={source.url}><ExternalLink size={15} aria-hidden="true" /><a href={source.url} target="_blank" rel="noreferrer"><Copy text={source.title} /> ↗</a><span><Copy text={source.covers} /></span></li>)}</ul>
      </div>
      <div className="ccna-detail-panel">
        <div className="ccna-detail-panel-heading"><span className="ccna-detail-panel-icon">↔</span><h2><Copy text="Related labs" /></h2></div>
        {relatedLabs.length > 0 ? <ul className="ccna-detail-related-list">{relatedLabs.map((related) => <li key={related.id}><a href={`/ccna/labs/${related.id}`}><strong><Copy text={related.title} /></strong><span><Copy text={`${tierLabel[related.tier]} · ${related.duration} min`} /></span></a></li>)}</ul> : <p><Copy text="This lab has no related entries in the current learning path." /></p>}
      </div>
    </section>

    {lab.reviewNote && <p className="ccna-detail-review-note"><CircleAlert size={17} aria-hidden="true" /><Copy text={`Review note: ${lab.reviewNote}`} /></p>}
    {isTopologyOpen && lab.diagram && <div className="ccna-topology-viewer" role="dialog" aria-modal="true" aria-labelledby="ccna-topology-viewer-title">
      <div className="ccna-topology-viewer-backdrop" onClick={() => setTopologyOpen(false)} aria-hidden="true" />
      <div className="ccna-topology-viewer-card">
        <header><div><p className="server-lab-kicker"><Copy text="Topology preview" /></p><h2 id="ccna-topology-viewer-title"><Copy text={lab.title} /></h2></div><button type="button" className="ccna-topology-viewer-close" onClick={() => setTopologyOpen(false)} aria-label="Close topology preview"><X size={19} /></button></header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lab.diagram.src} alt={diagramAlt} width={lab.diagram.width} height={lab.diagram.height} />
        <footer><span><Copy text={`${devices.length} devices · ${links.length} starter links`} /></span><a className="ccna-detail-primary" href={`/ccna/sim?lab=${encodeURIComponent(lab.id)}`} onClick={() => setTopologyOpen(false)}><Terminal size={17} aria-hidden="true" /><Copy text="Practice this topology" /></a></footer>
      </div>
    </div>}
  </article>;
}
