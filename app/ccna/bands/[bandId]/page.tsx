import { CcnaLabPath } from "@/app/components/ccna-lab-path";

export default async function CcnaBandPage({ params }: { params: Promise<{ bandId: string }> }) {
  const { bandId } = await params;
  return <CcnaLabPath initialBandId={bandId} />;
}
