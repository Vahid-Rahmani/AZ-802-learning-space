/** Reviewed Microsoft-hosted walkthroughs; mappings use exact question identities. */
export type AdVisualDiagram = {
  title: string;
  nodes: { id: string; label: string; detail?: string }[];
  edges: { from: string; to: string; label?: string }[];
};

export type AdVisualStep = {
  id: string;
  title: string;
  path: string[];
  instruction: string;
  image?: string;
  diagram?: AdVisualDiagram;
  command?: string;
  source?: string;
  alt: string;
  imageNote?: string;
  screenshotLabel?: string;
  screenshotSource?: string;
  screenshotCredit?: string;
  imageReference?: {
    source: string;
    original: string;
    version: "Windows Server 2025" | "Windows 11 client";
    credit: string;
    license: string;
    width: number;
    height: number;
    note: string;
  };
};

export type AdVisualGuideData = {
  id: string;
  title: string;
  source: string;
  versionNote: string;
  prerequisites: string;
  steps: AdVisualStep[];
  kind?: "screenshot" | "concept" | "command";
  category?: string;
  walkthroughs?: { title: string; url: string; version: "Windows Server 2025" }[];
};

export type AdVisualBinding = {
  guide: AdVisualGuideData;
  startStep: string;
  context: string;
};
