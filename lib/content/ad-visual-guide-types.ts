/** Reviewed Microsoft-hosted walkthroughs; mappings use exact question identities. */
export type AdVisualStep = {
  id: string;
  title: string;
  path: string[];
  instruction: string;
  image: string;
  alt: string;
  imageNote?: string;
};

export type AdVisualGuideData = {
  id: string;
  title: string;
  source: string;
  versionNote: string;
  prerequisites: string;
  steps: AdVisualStep[];
};

export type AdVisualBinding = {
  guide: AdVisualGuideData;
  startStep: string;
  context: string;
};
