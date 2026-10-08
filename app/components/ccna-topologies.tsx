"use client";

import { Network } from "lucide-react";
import { GoogleSubtitle } from "./google-translate";
import { ccnaTopologyLevels, ccnaTopologySource, ccnaTopologyStats } from "@/lib/content/ccna-topologies";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;
const pad = (value: number) => String(value).padStart(3, "0");

/** Raw leveled index of the CCNA 200-301 lab topologies.
 *
 * Deliberately read-only: catalog number, lab name, the catalog's own summary and the topology
 * diagram the source publishes. It declares no progress, awards nothing and is not a replacement
 * for the eight build stages above; lab instructions themselves are not published here.
 */
export function CcnaTopologyLibrary() {
  return <section id="ccna-topologies" className="server-labs-workspace ccna-topologies" aria-label="CCNA lab topology library">
    <header className="server-labs-heading">
      <div>
        <p className="server-lab-kicker"><Copy text="CCNA · topology library" /></p>
        <h2><Copy text="Every lab topology, level by level" /></h2>
        <p><Copy text={`${ccnaTopologyStats.labs} catalog labs arranged on the six official 200-301 domains, in the same order the stages above teach them. The list stays raw: catalog number, lab name, the source catalog's own summary and — where the catalog publishes one — the topology diagram. Read a level before you build that stage, or use it to recognize a topology you meet elsewhere.`} /></p>
      </div>
      <span className="server-lab-badge"><Network size={20} /> <Copy text={`${ccnaTopologyStats.diagrams} of ${ccnaTopologyStats.labs} labs have a diagram`} /></span>
    </header>
    <nav className="ccna-topology-levels" aria-label="Topology levels">
      {ccnaTopologyLevels.map((level) => <a key={level.id} href={`#${level.id}`}>
        <span className="server-lab-number">{level.level}</span>
        <span><strong><Copy text={level.title} /></strong><span className="server-lab-meta"><Copy text={`${level.labs.length} labs · ${level.withDiagram} diagrams · ${level.weight}% of the blueprint`} /></span></span>
      </a>)}
    </nav>
    {ccnaTopologyLevels.map((level) => <section key={level.id} id={level.id} className="ccna-topology-level" aria-labelledby={`${level.id}-title`}>
      <div className="ccna-topology-level-heading">
        <p className="server-lab-kicker"><Copy text={`Level ${level.level} · Cisco ${level.objective} · ${level.weight}% of the official blueprint`} /></p>
        <h3 id={`${level.id}-title`}><Copy text={level.title} /></h3>
        <p><Copy text={level.summary} /></p>
        <span className="ccna-topology-counts"><Copy text={`${level.labs.length} labs`} /><Copy text={`${level.withDiagram} topology diagrams`} /><Copy text={`catalog labs ${pad(level.labs[0].number)}–${pad(level.labs[level.labs.length - 1].number)}`} /></span>
      </div>
      <ol className="ccna-topology-list">
        {level.labs.map((lab) => <li key={lab.id} className="ccna-topology-card">
          {lab.diagram
            ? <figure>
              {/* Catalog diagrams ship pre-sized with the deployment; the Next image optimizer would
                  re-encode each one per request and spend the metered image quota for no visible gain. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lab.diagram.src} alt={`${lab.name} topology diagram`} loading="lazy" decoding="async" width={lab.diagram.width} height={lab.diagram.height} />
            </figure>
            : <p className="ccna-topology-missing"><Copy text="Concept lab — the source catalog publishes no topology diagram for this lab." /></p>}
          <div className="ccna-topology-card-body">
            <span className="server-lab-meta"><Copy text={`Lab ${pad(lab.number)}`} /></span>
            <h4>{lab.name}</h4>
            <p>{lab.summary}</p>
            {lab.summaryIssue && <p className="ccna-topology-issue"><Copy text={lab.summaryIssue} /></p>}
          </div>
        </li>)}
      </ol>
    </section>)}
    <p className="server-lab-meta ccna-topology-source">
      <Copy text={`Lab names, summaries and diagrams come from the ${ccnaTopologySource.catalog} lab catalog (${ccnaTopologySource.exam}), retrieved ${ccnaTopologySource.retrieved}, and are reproduced unedited as a personal study index. This site does not publish that product's lab instructions and is not affiliated with, sponsored by or endorsed by its vendor.`} />{" "}
      <a href={ccnaTopologySource.notice} target="_blank" rel="noreferrer"><Copy text="Source and attribution" /></a>
    </p>
  </section>;
}
