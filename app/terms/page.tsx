import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
      <p><Link href="/">← Back to CertPath</Link></p>
      <h1>CertPath Terms of Service</h1>
      <p>Last updated: September 29, 2026</p>
      <p>CertPath is an educational practice tool for Windows Server administration and Azure Fundamentals. Use it lawfully and keep your account credentials secure. Learning content and practice questions are for preparation and do not guarantee an exam result.</p>
      <p>You are responsible for any virtual machines, lab systems, or evidence you connect to the service. Do not upload confidential information or content you do not have permission to share.</p>
    </main>
  );
}
