"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, ExternalLink, Network, Play, Search } from "lucide-react";
import { ccnaKnowledgeQuestions } from "@/lib/content/ccna-bank";
import { ccnaTopologyLevels, ccnaTopologySource, ccnaTopologyStats, type CcnaTopologyLab, type CcnaTopologyLevel } from "@/lib/content/ccna-topologies";
import { GoogleSubtitle } from "./google-translate";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;
const pad = (value: number) => String(value).padStart(3, "0");
const stageForLevel = ["ccna-addressing", "ccna-vlans", "ccna-routing", "ccna-services", "ccna-security", "ccna-automation"];

const levelGuidance: Record<number, { read: string; prove: string; commands: string[] }> = {
  1: { read: "Trace the endpoints first. Identify device role, interface labels, link type, network boundary and the IPv4/IPv6 prefix on each hop.", prove: "Every intended interface has the right address, is up/up, and the endpoint can reach its default gateway before you test a remote network.", commands: ["show ip interface brief", "show interfaces", "show mac address-table"] },
  2: { read: "Follow the Layer 2 path: access port → VLAN → trunk → spanning-tree root. Mark where a frame is tagged and where it is untagged.", prove: "The expected VLAN exists end to end, trunks carry only the required VLANs, and a loop is controlled by STP.", commands: ["show vlan brief", "show interfaces trunk", "show spanning-tree"] },
  3: { read: "Start at the source subnet and trace the next hop toward the destination. Note route source, prefix length, administrative distance and metric.", prove: "The route table contains the intended path, neighbors are formed when a protocol is used, and a return path exists.", commands: ["show ip route", "show ip ospf neighbor", "traceroute <destination>"] },
  4: { read: "Separate the service path from the transport path: DHCP/DNS/NTP/SSH are services riding on an already reachable network.", prove: "The client receives the expected lease, name resolution returns the right address, translations are intentional and time is synchronized.", commands: ["show ip dhcp binding", "show ip nat translations", "show ntp associations"] },
  5: { read: "Read security from the outside in: source, destination, protocol/port, interface direction and the first rule that can match.", prove: "The permitted flow works, the denied flow is denied for the stated reason, and management access is restricted to the intended path.", commands: ["show access-lists", "show port-security interface <port>", "show running-config | section line vty"] },
  6: { read: "Treat the controller, API or automation host as another node. Record the endpoint, authentication boundary, payload format and the state it changes.", prove: "The request is repeatable, the response is valid JSON or the expected API result, and the configuration change can be verified on the device.", commands: ["show running-config | include restconf", "GET → JSON → validate → record evidence", "Compare before/after running configuration"] },
};

type Props = { userId: string; onPracticeQuestion?: (questionId: string) => void; onOpenStage?: (stageId: string) => void };
type KnowledgeQuestion = (typeof ccnaKnowledgeQuestions)[number];

function guidanceFor(level: CcnaTopologyLevel, lab: CcnaTopologyLab) {
  const base = levelGuidance[level.level];
  const name = lab.name.toLowerCase();
  const extra = name.includes("ospf") || name.includes("routing") ? "Check both the forward and return route; a green interface does not prove a working path." : name.includes("vlan") || name.includes("trunk") ? "Compare the VLAN number and native/tagging decision at both ends of every trunk." : name.includes("security") || name.includes("acl") ? "Write the expected permit and deny cases before changing a rule, then verify counters." : "Capture one before-state and one after-state so the evidence shows what changed.";
  return { ...base, prove: `${base.prove} ${extra}` };
}

function relatedQuestions(level: CcnaTopologyLevel, lab: CcnaTopologyLab) {
  const terms = `${lab.name} ${lab.summary} ${level.title} ${level.summary}`.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3);
  const scored = ccnaKnowledgeQuestions.filter((question) => question.domain === level.title).map((question) => {
    const haystack = `${question.text} ${question.objective} ${question.explain}`.toLowerCase();
    return { question, score: terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) };
  }).sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
  return scored.slice(0, 5).map(({ question }) => question);
}

export function CcnaTopologyLibrary({ userId, onPracticeQuestion, onOpenStage }: Props) {
  const [selectedLevelId, setSelectedLevelId] = useState(ccnaTopologyLevels[0].id);
  const [selectedLabId, setSelectedLabId] = useState(ccnaTopologyLevels[0].labs[0].id);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const progressKey = `certpath-ccna-topologies:${userId}`;
  const selectedLevel = ccnaTopologyLevels.find((level) => level.id === selectedLevelId) ?? ccnaTopologyLevels[0];
  const selectedLab = selectedLevel.labs.find((lab) => lab.id === selectedLabId) ?? selectedLevel.labs[0];
  const guidance = guidanceFor(selectedLevel, selectedLab);
  const questions = relatedQuestions(selectedLevel, selectedLab);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleLabs = normalizedQuery ? selectedLevel.labs.filter((lab) => `${lab.name} ${lab.summary} ${lab.number}`.toLowerCase().includes(normalizedQuery)) : selectedLevel.labs;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const value = JSON.parse(localStorage.getItem(progressKey) ?? "[]");
        if (Array.isArray(value)) setCompleted(value.filter((item): item is string => typeof item === "string"));
      } catch { /* local checklist is optional and never replaces server progress */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [progressKey]);

  const chooseLevel = (level: CcnaTopologyLevel) => {
    setSelectedLevelId(level.id);
    setSelectedLabId(level.labs[0].id);
    setQuery("");
  };
  const chooseLab = (id: string) => {
    setSelectedLabId(id);
    window.setTimeout(() => document.querySelector(".ccna-topology-guide")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const toggleCompleted = () => {
    const next = completed.includes(selectedLab.id) ? completed.filter((id) => id !== selectedLab.id) : [...completed, selectedLab.id];
    setCompleted(next);
    try { localStorage.setItem(progressKey, JSON.stringify(next)); } catch { /* continue without local persistence */ }
  };

  return <section id="ccna-topologies" className="server-labs-workspace ccna-topologies" aria-label="CCNA guided lab topology library">
    <header className="server-labs-heading">
      <div>
        <p className="server-lab-kicker"><Copy text="CCNA · guided topology practice" /></p>
        <h2><Copy text="Read the map, build the lab, prove the path" /></h2>
        <p><Copy text={`${ccnaTopologyStats.labs} catalog topologies are arranged across the six official 200-301 domains. Choose one level at a time, open a topology, then follow its reading prompts, evidence checklist and related questions instead of scrolling through one long catalog.`} /></p>
      </div>
      <span className="server-lab-badge"><Network size={20} /> <Copy text={`${ccnaTopologyStats.diagrams} of ${ccnaTopologyStats.labs} labs have a diagram`} /></span>
    </header>

    <nav className="ccna-topology-levels" aria-label="Topology levels">
      {ccnaTopologyLevels.map((level) => <button key={level.id} type="button" className={level.id === selectedLevel.id ? "is-active" : ""} onClick={() => chooseLevel(level)} aria-pressed={level.id === selectedLevel.id}>
        <span className="server-lab-number">{level.level}</span>
        <span><strong><Copy text={level.title} /></strong><span className="server-lab-meta"><Copy text={`${level.labs.length} labs · ${level.withDiagram} diagrams · ${level.weight}% of blueprint`} /></span></span>
      </button>)}
    </nav>

    <section className="ccna-topology-level" aria-labelledby={`${selectedLevel.id}-title`}>
      <div className="ccna-topology-level-heading">
        <p className="server-lab-kicker"><Copy text={`Level ${selectedLevel.level} · Cisco ${selectedLevel.objective} · ${selectedLevel.weight}% of the official blueprint`} /></p>
        <h3 id={`${selectedLevel.id}-title`}><Copy text={selectedLevel.title} /></h3>
        <p><Copy text={selectedLevel.summary} /></p>
        <span className="ccna-topology-counts"><Copy text={`${selectedLevel.labs.length} labs`} /><Copy text={`${selectedLevel.withDiagram} topology diagrams`} /><Copy text={`catalog labs ${pad(selectedLevel.labs[0].number)}–${pad(selectedLevel.labs[selectedLevel.labs.length - 1].number)}`} /><Copy text={`${selectedLevel.labs.filter((lab) => completed.includes(lab.id)).length} reviewed on this device`} /></span>
      </div>
      <label className="ccna-topology-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search this topology level</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this level: VLAN, OSPF, DHCP…" /></label>
      {visibleLabs.length === 0 ? <p className="ccna-topology-empty"><Copy text="No topology in this level matches that search." /></p> : <ol className="ccna-topology-list">
        {visibleLabs.map((lab) => <li key={lab.id}>
          <button type="button" className={`ccna-topology-card ${lab.id === selectedLab.id ? "is-selected" : ""}`} onClick={() => chooseLab(lab.id)} aria-pressed={lab.id === selectedLab.id}>
            <span className="ccna-topology-card-body"><span className="server-lab-meta"><Copy text={`Lab ${pad(lab.number)}`} /></span><strong><Copy text={lab.name} /></strong><span><Copy text={lab.summary} /></span><span className={lab.diagram ? "ccna-topology-diagram-status" : "ccna-topology-diagram-status is-concept"}><Network size={14} /><Copy text={lab.diagram ? "Topology diagram available" : "Concept lab · no diagram"} /></span>{lab.summaryIssue && <span className="ccna-topology-issue"><Copy text={lab.summaryIssue} /></span>}<span className="ccna-topology-open"><Copy text="Open guided practice" /><ChevronRight size={16} /></span></span>
          </button>
        </li>)}
      </ol>}
    </section>

    <section className="ccna-topology-guide" aria-label="Selected topology guided practice">
      <div className="ccna-topology-guide-image">
        {selectedLab.diagram ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedLab.diagram.src} alt={`${selectedLab.name} selected topology`} width={selectedLab.diagram.width} height={selectedLab.diagram.height} />
        </> : <div className="ccna-topology-guide-placeholder"><Network size={42} /><Copy text="Concept topology — use the written service path as your map." /></div>}
      </div>
      <div className="ccna-topology-guide-content">
        <p className="server-lab-kicker"><Copy text={`Selected lab · ${pad(selectedLab.number)}`} /></p>
        <h3><Copy text={selectedLab.name} /></h3>
        <p className="ccna-topology-guide-summary"><Copy text={selectedLab.summary} /></p>
        {selectedLab.summaryIssue && <p className="ccna-topology-issue"><Copy text={selectedLab.summaryIssue} /></p>}
        <div className="ccna-topology-guide-grid">
          <article><BookOpen size={19} /><h4><Copy text="How to read this topology" /></h4><p><Copy text={guidance.read} /></p></article>
          <article><ClipboardCheck size={19} /><h4><Copy text="How to prove it works" /></h4><p><Copy text={guidance.prove} /></p></article>
        </div>
        <div className="ccna-topology-command-box"><strong><Copy text="Evidence checklist" /></strong><ul>{guidance.commands.map((command) => <li key={command}><code>{command}</code></li>)}</ul></div>
        <div className="ccna-topology-actions">
          <button type="button" className="ccna-topology-review" onClick={toggleCompleted}><CheckCircle2 size={18} /><Copy text={completed.includes(selectedLab.id) ? "Reviewed on this device" : "Mark topology reviewed"} /></button>
          {onOpenStage && selectedLevel.level <= stageForLevel.length && <button type="button" className="ccna-topology-stage-action" onClick={() => onOpenStage(stageForLevel[selectedLevel.level - 1])}><Play size={17} /><Copy text="Open matching stage lab" /></button>}
        </div>
        <div className="ccna-topology-related"><h4><Copy text="Practice questions for this map" /></h4><p><Copy text="Open a question to answer it in the CCNA bank; your answer and explanation continue to use the normal saved practice flow." /></p><ul className="ccna-topology-question-list">{questions.map((question: KnowledgeQuestion) => <li key={question.id}><button type="button" onClick={() => onPracticeQuestion?.(question.id)}><span>{question.id}</span><span><Copy text={question.text} /></span><ChevronRight size={16} /></button></li>)}</ul></div>
      </div>
    </section>

    <p className="server-lab-meta ccna-topology-source"><Copy text={`Lab names, summaries and diagrams come from the ${ccnaTopologySource.catalog} lab catalog (${ccnaTopologySource.exam}), retrieved ${ccnaTopologySource.retrieved}, and are reproduced as a personal study index. The reading prompts and evidence checklist above are original study guidance; the source catalog's lab instructions are not published here.`} />{" "}<a href={ccnaTopologySource.notice} target="_blank" rel="noreferrer"><ExternalLink size={14} /><Copy text="Source and attribution" /></a></p>
  </section>;
}
