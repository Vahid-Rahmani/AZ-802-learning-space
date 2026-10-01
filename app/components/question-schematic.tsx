import type { ReactNode } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";

export type SchematicNode = {
  id: string;
  label: string;
  detail: string;
  tone?: "cyan" | "violet" | "emerald" | "amber";
};

export type QuestionSchematicData = {
  title: string;
  summary: string;
  nodes: SchematicNode[];
};

const domainSchematics: Record<string, QuestionSchematicData> = {
  "Deploy and manage AD DS": {
    title: "AD DS decision path",
    summary: "Identify the directory object or FSMO role first, then verify scope and replication impact.",
    nodes: [
      { id: "scope", label: "Scope", detail: "domain or forest", tone: "cyan" },
      { id: "role", label: "Directory role", detail: "FSMO / DC service", tone: "violet" },
      { id: "replicate", label: "Replication", detail: "validate partners", tone: "amber" },
      { id: "result", label: "Safe change", detail: "confirm with tools", tone: "emerald" },
    ],
  },
  "Manage Windows Server instances and workloads in a hybrid environment": {
    title: "Hybrid management path",
    summary: "Connect the server, establish identity and policy, then monitor the workload from the chosen control plane.",
    nodes: [
      { id: "server", label: "Server", detail: "on-premises or edge", tone: "cyan" },
      { id: "connect", label: "Connect", detail: "Arc / identity", tone: "violet" },
      { id: "policy", label: "Policy", detail: "RBAC / configuration", tone: "amber" },
      { id: "observe", label: "Observe", detail: "health and drift", tone: "emerald" },
    ],
  },
  "Manage virtual machines": {
    title: "Hyper-V I/O path",
    summary: "A VM request travels through the child partition and VMBus to the provider in the root partition.",
    nodes: [
      { id: "vm", label: "VM / VSC", detail: "child partition", tone: "cyan" },
      { id: "bus", label: "VMBus", detail: "isolated channel", tone: "violet" },
      { id: "vsp", label: "VSP", detail: "root partition", tone: "amber" },
      { id: "hardware", label: "Hardware", detail: "managed by host", tone: "emerald" },
    ],
  },
  "Implement and manage on-premises and hybrid networking": {
    title: "Network troubleshooting path",
    summary: "Check name resolution and reachability before inspecting policy, ports, and the application endpoint.",
    nodes: [
      { id: "client", label: "Client", detail: "source host", tone: "cyan" },
      { id: "dns", label: "DNS", detail: "resolve the name", tone: "violet" },
      { id: "route", label: "Route / port", detail: "reach the service", tone: "amber" },
      { id: "policy", label: "Firewall policy", detail: "allow expected flow", tone: "emerald" },
    ],
  },
  "Manage storage and file services": {
    title: "File-access decision path",
    summary: "Separate the share permission from the NTFS permission, then test the effective access from the client.",
    nodes: [
      { id: "client", label: "Client", detail: "user or app", tone: "cyan" },
      { id: "smb", label: "SMB share", detail: "share permission", tone: "violet" },
      { id: "ntfs", label: "NTFS ACL", detail: "file permission", tone: "amber" },
      { id: "effective", label: "Effective access", detail: "least privilege", tone: "emerald" },
    ],
  },
  "Secure Windows Server infrastructure": {
    title: "Hardening decision path",
    summary: "Reduce exposure, verify identity controls, and retain evidence that the required service still works.",
    nodes: [
      { id: "surface", label: "Attack surface", detail: "roles / ports", tone: "cyan" },
      { id: "identity", label: "Identity", detail: "authN / authZ", tone: "violet" },
      { id: "control", label: "Control", detail: "policy / Defender", tone: "amber" },
      { id: "evidence", label: "Evidence", detail: "audit and verify", tone: "emerald" },
    ],
  },
  "Monitor and troubleshoot Windows Server environments": {
    title: "Troubleshooting loop",
    summary: "Observe the symptom, isolate the layer, test one hypothesis, and document the verified fix.",
    nodes: [
      { id: "symptom", label: "Symptom", detail: "user or alert", tone: "cyan" },
      { id: "telemetry", label: "Telemetry", detail: "logs / counters", tone: "violet" },
      { id: "hypothesis", label: "Hypothesis", detail: "one testable cause", tone: "amber" },
      { id: "verify", label: "Verify", detail: "retest and record", tone: "emerald" },
    ],
  },
  "Backup, recovery, high availability, and migration crossover": {
    title: "Recovery and migration path",
    summary: "Protect the source, move or recover in a controlled way, and validate the business outcome before cutover.",
    nodes: [
      { id: "plan", label: "Plan", detail: "RPO / RTO / dependencies", tone: "cyan" },
      { id: "protect", label: "Protect", detail: "backup or replica", tone: "violet" },
      { id: "recover", label: "Recover / migrate", detail: "controlled cutover", tone: "amber" },
      { id: "validate", label: "Validate", detail: "service and runbook", tone: "emerald" },
    ],
  },
};

const genericSchematic: QuestionSchematicData = {
  title: "Question decision path",
  summary: "Name the scope, choose the control, validate the result, and record the evidence.",
  nodes: [
    { id: "scope", label: "Scope", detail: "what is affected", tone: "cyan" },
    { id: "control", label: "Control", detail: "which feature", tone: "violet" },
    { id: "test", label: "Test", detail: "prove the choice", tone: "amber" },
    { id: "result", label: "Result", detail: "document outcome", tone: "emerald" },
  ],
};

export function getQuestionSchematic(domain: string, questionText = ""): QuestionSchematicData {
  const schematic = domainSchematics[domain] ?? genericSchematic;
  const promptHint = questionText.trim() ? "Start with the English scenario, then follow the control path." : "";
  return promptHint ? { ...schematic, summary: `${schematic.summary} ${promptHint}` } : schematic;
}

export function QuestionSchematic({ domain, questionText, title, children, showTranslations = true }: { domain: string; questionText?: string; title?: string; children?: ReactNode; showTranslations?: boolean }) {
  const schematic = getQuestionSchematic(domain, questionText);
  return (
    <section className="question-schematic" aria-label={title ?? schematic.title}>
      <div className="question-schematic-heading">
        <div>
          <p className="question-schematic-kicker"><GoogleSubtitle text="Learning schematic" enabled={showTranslations} /></p>
          <h3><GoogleSubtitle text={title ?? schematic.title} enabled={showTranslations} /></h3>
        </div>
        <span className="question-schematic-domain"><GoogleSubtitle text={domain} enabled={showTranslations} /></span>
      </div>
      <p className="question-schematic-summary"><GoogleSubtitle text={schematic.summary} enabled={showTranslations} /></p>
      <ol className="question-schematic-flow">
        {schematic.nodes.map((node, index) => (
          <li className="question-schematic-step" key={node.id}>
            <div className={`question-schematic-node question-schematic-node-${node.tone ?? "cyan"}`} tabIndex={0}>
              <span className="question-schematic-index" aria-hidden="true">{index + 1}</span>
              <strong><GoogleSubtitle text={node.label} enabled={showTranslations} /></strong>
              <span><GoogleSubtitle text={node.detail} enabled={showTranslations} /></span>
            </div>
            {index < schematic.nodes.length - 1 && <span className="question-schematic-arrow" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      {children ? <div className="question-schematic-note">{children}</div> : null}
    </section>
  );
}

