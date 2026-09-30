export type QuestionReferenceMediaItem = {
  src: string;
  alt: string;
  sourceUrl: string;
  sourceLabel: string;
  caption: string;
};

const officialMedia: Record<string, QuestionReferenceMediaItem> = {
  hyperV: {
    src: "https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/media/architecture/hyper-v-architecture.png",
    alt: "Microsoft Learn diagram showing the Hyper-V hypervisor, root partition, child partitions, VMBus, VSP, and VSC.",
    sourceUrl: "https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/architecture",
    sourceLabel: "Microsoft Learn · Hyper-V architecture",
    caption: "Use the flow to distinguish the root partition, child partition, VMBus, VSP, and VSC before choosing an answer.",
  },
  cloudWitness: {
    src: "https://learn.microsoft.com/en-us/windows-server/failover-clustering/media/deploy-failover-cluster-quorum-witness/quorum-cloud-witness.png",
    alt: "Microsoft Learn diagram showing a cloud witness connected to two failover-cluster sites.",
    sourceUrl: "https://learn.microsoft.com/en-us/windows-server/failover-clustering/what-is-quorum-witness",
    sourceLabel: "Microsoft Learn · Quorum witness",
    caption: "The witness supplies an additional vote; it is not a replacement for the cluster nodes or application data.",
  },
  fileShareWitness: {
    src: "https://learn.microsoft.com/en-us/windows-server/failover-clustering/media/deploy-failover-cluster-quorum-witness/quorum-file-share-witness.png",
    alt: "Microsoft Learn diagram showing a file-share witness connected to two failover-cluster sites.",
    sourceUrl: "https://learn.microsoft.com/en-us/windows-server/failover-clustering/what-is-quorum-witness",
    sourceLabel: "Microsoft Learn · Quorum witness",
    caption: "A file-share witness helps an even-node or multisite cluster reach a safe quorum majority.",
  },
};

/**
 * Returns only official Microsoft Learn media for concepts where a visual adds
 * meaning. Questions without a matching concept intentionally render no image.
 */
export function getOfficialQuestionMedia(domain: string, questionText = ""): QuestionReferenceMediaItem[] {
  const text = `${domain} ${questionText}`.toLowerCase();
  if (text.includes("hyper-v") || text.includes("vmbus") || text.includes("vsc") || text.includes("vsp") || text.includes("virtual machine")) return [officialMedia.hyperV];
  if (text.includes("cloud witness")) return [officialMedia.cloudWitness];
  if (text.includes("file-share witness") || text.includes("file share witness") || text.includes("quorum")) return [officialMedia.fileShareWitness];
  return [];
}

export function QuestionReferenceMedia({ media }: { media: QuestionReferenceMediaItem[] }) {
  if (!media.length) return null;
  return (
    <div className="question-reference-media" aria-label="Official visual reference">
      {media.map((item) => (
        <figure key={item.src} className="question-reference-media-card">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="question-reference-media-image-link">
            {/* Official Learn media is intentionally loaded from the source host so
                the project does not redistribute third-party screenshots. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} width={1200} height={675} loading="lazy" />
          </a>
          <figcaption>
            <span>{item.caption}</span>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel} ↗</a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

