"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CcnaPractice, type CcnaPracticeRequest } from "@/app/components/ccna-practice";
import { useCcnaShell } from "../layout";

export default function CcnaPracticePage() {
  const { userId } = useCcnaShell();
  const router = useRouter();
  const params = useSearchParams();
  const domainId = params.get("domain") ?? undefined;
  const questionId = params.get("question") ?? undefined;
  // The bank re-reads this whenever the URL asks for a different domain or question. The nonce is a
  // pure function of the parameters, so re-rendering never re-triggers the selection.
  const key = `${domainId ?? ""}|${questionId ?? ""}`;
  const request = useMemo<CcnaPracticeRequest | undefined>(
    () => (domainId || questionId ? { domainId, questionId, nonce: [...key].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 1_000_003, 7) } : undefined),
    [key, domainId, questionId],
  );
  return <CcnaPractice
    key={userId}
    userId={userId}
    request={request}
    onRequestHandled={() => undefined}
    onOpenLab={(id) => router.push(`/ccna/build?lab=${encodeURIComponent(id)}`)}
  />;
}
