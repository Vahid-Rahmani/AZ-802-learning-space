"use client";

import { LearningStart } from "@/app/components/simple-learning";

export default function CcnaOverviewPage() {
  return <LearningStart title="Learn networking step by step" lesson="Start with device access, then build your first network." href="/ccna/build">
    <p className="simple-progress">New to CCNA? Follow Learning. Already studying? Choose Questions or Labs from Practice.</p>
  </LearningStart>;
}
