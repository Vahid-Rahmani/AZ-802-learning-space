"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { LearningLabPath } from "@/app/components/windows-server-labs";
import { ccnaLabs } from "@/lib/content/ccna";
import { ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { useCcnaShell } from "../layout";

export default function CcnaBuildPage() {
  const { userId } = useCcnaShell();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("lab") ?? undefined;
  // Only a stage that actually exists here opens a workspace; an unknown id falls back to the library.
  const initialLabId = requested && ccnaLabs.some((lab) => lab.id === requested) ? requested : undefined;
  return <LearningLabPath
    key={`${userId}:${initialLabId ?? "resume"}`}
    userId={userId}
    labs={ccnaLabs}
    initialLabId={initialLabId}
    resumeLatest={!initialLabId}
    onPracticeLab={(lab) => router.push(`/ccna/practice?domain=ccna-domain-v2-${lab.questions[0].objective?.split(".")[0]}`)}
    kicker={`CCNA · 200-301 v1.1 · ${ccnaLabs.length} of ${ccnaLabPathStats.total} labs have a saved checkpoint`}
    title="Build a network. Understand every hop."
    intro="Study each lesson, build its isolated topology, test both the success and the expected failure, then practice its related objective domain. Your stage, question position, answers and evidence save to your account. Every stage here is also listed in the lab library with its band, tier and prerequisites."
  />;
}
