"use client";

import { PracticeHub } from "@/app/components/simple-learning";

export default function CcnaPracticeChoices() {
  return <PracticeHub questionHref="/ccna/practice" labHref="/ccna/library">
    <details className="simple-details"><summary>More practice tools</summary><div className="simple-tools"><a href="/ccna/search" onClick={event => { event.preventDefault(); window.location.href = "/ccna/search"; }}>Search questions</a></div></details>
  </PracticeHub>;
}
