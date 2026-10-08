import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CcnaLabDetail } from "@/app/components/ccna-lab-detail";
import { ccnaLabById, ccnaLabPath, ccnaLabBandById } from "@/lib/content/ccna-lab-path";
import { getCcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";

export function generateStaticParams() {
  return ccnaLabPath.map((lab) => ({ labId: lab.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ labId: string }> }): Promise<Metadata> {
  const { labId } = await params;
  const lab = ccnaLabById.get(labId);
  return lab ? {
    title: `${lab.title} · CCNA Lab · Klybit`,
    description: `${lab.scenario.requirement} Practice the topology, verification checks and fault recovery in Klybit.`,
  } : { title: "CCNA lab · Klybit" };
}

export default async function CcnaLabDetailPage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const lab = ccnaLabById.get(labId);
  const pack = lab ? getCcnaSimulationPack(lab.id) : undefined;
  const band = lab ? ccnaLabBandById.get(lab.bandId) : undefined;
  if (!lab || !band || !pack) notFound();
  const relatedLabs = lab.relatedLabIds.map((relatedId) => ccnaLabById.get(relatedId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).slice(0, 6);
  return <CcnaLabDetail lab={lab} band={band} pack={pack} relatedLabs={relatedLabs} />;
}
