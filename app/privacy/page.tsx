import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
      <p><Link href="/">← Back to CertPath</Link></p>
      <h1>CertPath Privacy Policy</h1>
      <p>Last updated: September 29, 2026</p>
      <p>CertPath stores the account information you provide, including your email address, learning progress, quiz attempts, flashcards, and lab evidence. Google sign-in shares your verified Google email and stable account identifier so CertPath can create or connect your account.</p>
      <p>We use this information only to provide, secure, and improve the learning service. We do not sell personal information or store your Google password. You can request account deletion by contacting the site owner through the support email shown in the sign-in flow.</p>
    </main>
  );
}
