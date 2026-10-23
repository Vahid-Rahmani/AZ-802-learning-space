/** Original, bounded teaching fixtures. These are not commands sent to real machines. */
export type SatztatCaseId = "dns-record" | "dns-client";
export type SatztatDiagnostic = "ipconfig" | "ping-ip" | "service-ip" | "dns-authoritative" | "client-cache" | "service-name";
export type SatztatRepair = "correct-record" | "refresh-cache" | "correct-client-dns";
export interface SatztatMission {
  id: SatztatCaseId;
  title: string;
  chapter: string;
  ticket: string;
  goal: string;
  reportPrompt: string;
  glossary: { term: string; meaning: string }[];
  topology: { id: string; label: string; kind: "pc" | "switch" | "server"; address?: string }[];
  target: string;
  variants: string[];
  hints: string[];
  technicalHints: string[];
  supportedErrors: { answer: string; code: string; hint: string }[];
  repairs: { id: SatztatRepair; label: string }[];
  serverAddress: string;
  correctDns: string;
  hostname: string;
  initial: { recordAddress: string; clientDns: string; cacheAddress: string | null };
  explanation: string;
}

export const satztatDiagnostics: { id: SatztatDiagnostic; label: string }[] = [
  { id: "ipconfig", label: "ipconfig /all" },
  { id: "ping-ip", label: "Ping the server address" },
  { id: "service-ip", label: "Test TCP 445 by address" },
  { id: "dns-authoritative", label: "Query the authoritative DNS server" },
  { id: "client-cache", label: "Inspect the client DNS cache" },
  { id: "service-name", label: "Test TCP 445 by name" },
];

export const satztatCases: readonly SatztatMission[] = [
  {
    id: "dns-record", title: "Fall 01 · Der verschwundene Dateiserver", chapter: "Discover · guided incident",
    ticket: "09:00 · Ich erreiche den Dateiserver über seine IP-Adresse, aber nicht über seinen Namen. Können Sie bitte die Verbindung prüfen?",
    goal: "Restore access to files.madar.test. Use the evidence to distinguish network, name-resolution and service problems.",
    reportPrompt: "09:30 postmortem: the repair was completed at 09:15. Explain in German what would have happened if we had corrected the DNS entry before the 09:00 outage. Use a past counterfactual, not a claim that it is still broken.",
    glossary: [
      { term: "der DNS-Eintrag", meaning: "DNS record" }, { term: "erreichbar", meaning: "reachable" },
      { term: "früher", meaning: "earlier" }, { term: "korrigieren", meaning: "to correct" },
    ],
    topology: [
      { id: "pc", label: "PC-A", kind: "pc", address: "10.24.0.10/24" },
      { id: "sw", label: "SW1", kind: "switch" },
      { id: "dns", label: "DNS1", kind: "server", address: "10.24.0.53" },
      { id: "file", label: "FILE1", kind: "server", address: "10.24.0.20" },
    ],
    target: "Wenn wir den DNS-Eintrag früher korrigiert hätten, wäre der Dateiserver unter seinem Namen erreichbar gewesen.",
    variants: [
      "Der Dateiserver wäre unter seinem Namen erreichbar gewesen, wenn wir den DNS-Eintrag früher korrigiert hätten.",
      "Wenn wir den DNS-Eintrag früher berichtigt hätten, wäre der Dateiserver unter seinem Namen erreichbar gewesen.",
    ],
    hints: [
      "This is an unreal alternative in the past. In the wenn clause, use Partizip II + hätte/hätten at the end.",
      "We corrected something: wir hätten … korrigiert. The result describes a past state: wäre … erreichbar gewesen. After an initial wenn clause, the main-clause verb comes first.",
    ],
    technicalHints: [
      "Compare the service test by address with the service test by name; also inspect both the authoritative DNS answer and the client cache.",
      "DNS1 and PC-A both contain the retired .99 address. Changing only one leaves the other stale; verify again after both changes.",
    ],
    supportedErrors: [
      { answer: "Wenn wir den DNS-Eintrag früher korrigiert wären, wäre der Dateiserver unter seinem Namen erreichbar gewesen.", code: "AUX-01", hint: "korrigieren uses haben: wir hätten … korrigiert. Check the auxiliary in your wenn clause." },
      { answer: "Wenn wir hätten den DNS-Eintrag früher korrigiert, wäre der Dateiserver unter seinem Namen erreichbar gewesen.", code: "V-03", hint: "In this wenn clause, the conjugated auxiliary belongs at the end: … korrigiert hätten." },
      { answer: "Wenn wir den DNS-Eintrag früher korrigiert hätten, der Dateiserver wäre unter seinem Namen erreichbar gewesen.", code: "V-02", hint: "After the initial wenn clause, start the main clause with wäre, then the subject." },
    ],
    repairs: [{ id: "correct-record", label: "Set files.madar.test A record to 10.24.0.20" }, { id: "correct-client-dns", label: "Set PC-A DNS server to 10.24.0.53" }, { id: "refresh-cache", label: "Refresh PC-A DNS cache from its configured resolver" }],
    serverAddress: "10.24.0.20", correctDns: "10.24.0.53", hostname: "files.madar.test",
    initial: { recordAddress: "10.24.0.99", clientDns: "10.24.0.53", cacheAddress: "10.24.0.99" },
    explanation: "The LAN and SMB service were working by address. DNS1 had an obsolete A record, and PC-A also cached it. Correcting the authoritative record and refreshing the client resolution restores the name-based service. The report describes an earlier alternative, not the current repaired state.",
  },
  {
    id: "dns-client", title: "Fall 02 · Ein neuer Arbeitsplatz", chapter: "Transfer · a different causal problem",
    ticket: "10:00 · Nur am neuen Arbeitsplatz funktioniert der Name des Archivservers nicht. Die anderen Mitarbeiter können ihn öffnen. Die IP-Adresse funktioniert auch hier.",
    goal: "Restore name-based access on PC-B. Do not assume the first case's repair fits this different evidence.",
    reportPrompt: "10:30 postmortem: PC-B was repaired at 10:15. Explain what would have happened if we had configured the correct DNS server on the client before the 10:00 incident. Use a past counterfactual.",
    glossary: [{ term: "der Arbeitsplatz", meaning: "workstation" }, { term: "einstellen", meaning: "to configure/set" }, { term: "der Archivserver", meaning: "archive server" }],
    topology: [
      { id: "pc", label: "PC-B", kind: "pc", address: "10.25.0.10/24" },
      { id: "sw", label: "SW2", kind: "switch" },
      { id: "dns", label: "DNS2", kind: "server", address: "10.25.0.53" },
      { id: "file", label: "ARCHIVE1", kind: "server", address: "10.25.0.20" },
    ],
    target: "Wenn wir am Client früher den richtigen DNS-Server eingestellt hätten, wäre der Archivserver unter seinem Namen erreichbar gewesen.",
    variants: [
      "Der Archivserver wäre unter seinem Namen erreichbar gewesen, wenn wir am Client früher den richtigen DNS-Server eingestellt hätten.",
      "Wenn wir am Client früher den richtigen DNS-Server konfiguriert hätten, wäre der Archivserver unter seinem Namen erreichbar gewesen.",
      "Wenn wir früher den richtigen DNS-Server am Client eingestellt hätten, wäre der Archivserver unter seinem Namen erreichbar gewesen.",
    ],
    hints: [
      "Describe the unreal earlier client configuration, not a DNS-record change. Use hätten + Partizip II in the wenn clause.",
      "For einstellen, the Partizip II is eingestellt. For the past result state, use wäre … erreichbar gewesen.",
    ],
    technicalHints: ["Compare PC-B's configured DNS server with DNS2, and query DNS2 directly before changing any records.", "The authoritative record is already correct. PC-B points to a legacy resolver at .54; change its DNS setting to .53, then refresh and retest."],
    supportedErrors: [
      { answer: "Wenn wir am Client früher den richtigen DNS-Server eingestellt wären, wäre der Archivserver unter seinem Namen erreichbar gewesen.", code: "AUX-01", hint: "einstellen uses haben: wir hätten … eingestellt." },
      { answer: "Wenn wir hätten am Client früher den richtigen DNS-Server eingestellt, wäre der Archivserver unter seinem Namen erreichbar gewesen.", code: "V-03", hint: "Put the conjugated auxiliary at the end of the wenn clause: … eingestellt hätten." },
    ],
    repairs: [{ id: "correct-record", label: "Set archive.madar.test A record to 10.25.0.20" }, { id: "correct-client-dns", label: "Set PC-B DNS server to 10.25.0.53" }, { id: "refresh-cache", label: "Refresh PC-B DNS cache from its configured resolver" }],
    serverAddress: "10.25.0.20", correctDns: "10.25.0.53", hostname: "archive.madar.test",
    initial: { recordAddress: "10.25.0.20", clientDns: "10.25.0.54", cacheAddress: null },
    explanation: "The authoritative DNS record and server are healthy. Only the new client's resolver setting is wrong; the legacy resolver does not know this zone. A blanket repetition of the previous record repair would not fix this client. Correct its resolver, refresh resolution, and verify the service by name.",
  },
];

export function getSatztatMission(id: SatztatCaseId): SatztatMission {
  return satztatCases.find(item => item.id === id)!;
}
