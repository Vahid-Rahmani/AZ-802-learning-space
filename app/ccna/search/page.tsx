"use client";

import { useRouter } from "next/navigation";
import { KnowledgeSearch } from "@/app/components/knowledge-search";
import { ccnaKnowledgeQuestions } from "@/lib/content/ccna-bank";
import { useCcnaShell } from "../layout";

export default function CcnaSearchPage() {
  const { language } = useCcnaShell();
  const router = useRouter();
  return <KnowledgeSearch
    questionBank={ccnaKnowledgeQuestions}
    courseCode="CCNA"
    courseName="networking"
    sourceName="Cisco / IETF"
    examples={["OSPF router ID", "VLAN trunk", "مسیریابی بین شبکه‌های IP"]}
    showTranslations={Boolean(language)}
    onPracticeQuestion={(questionId) => router.push(`/ccna/practice?question=${encodeURIComponent(questionId)}`)}
  />;
}
