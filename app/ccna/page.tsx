"use client";

import { LearningStart } from "@/app/components/simple-learning";

export default function CcnaOverviewPage() {
  return <LearningStart title="Learn networking step by step" lesson="Start with device access, then build your first network." href="/ccna/build" metrics={[{label:"Practical labs",value:"109"},{label:"Learning tracks",value:"12"},{label:"Activities",value:"Learn · Practise"}]} actions={[{key:"questions",label:"Question bank",href:"/ccna/practice"},{key:"labs",label:"Lab library",href:"/ccna/library"},{key:"exams",label:"Exam centre",href:"/ccna/exams"},{key:"learning",label:"Guided learning",href:"/ccna/build"},{key:"sim",label:"Topology simulator",href:"/ccna/sim"},{key:"search",label:"Search questions",href:"/ccna/search"}]}>
    <p className="simple-progress">New to CCNA? Follow Learning. Already studying? Choose Questions or Labs from Practice.</p>
  </LearningStart>;
}
