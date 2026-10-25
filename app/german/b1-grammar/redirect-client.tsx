"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Old bookmark /german/b1-grammar now opens the B1 modules inside the one curriculum. */
export function B1GrammarRedirect() {
  const router = useRouter();
  useEffect(() => {
    const target = `/german/grammatik${window.location.search}${window.location.hash}`;
    router.replace(target);
  }, [router]);
  return <main className="study-app min-h-screen">
    <div className="auth-required">
      <p role="status">Dieses Grammatikthema ist jetzt Teil von Grammatik A1–B2. Du wirst weitergeleitet …</p>
      <p><Link href="/german/grammatik">Zu Grammatik A1–B2</Link></p>
    </div>
  </main>;
}
