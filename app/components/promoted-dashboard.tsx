"use client";

import type { ComponentProps } from "react";
import { Dashboard as LearningDashboard } from "./learning-views";
import { GoogleSubtitle } from "./google-translate";

export function Dashboard(props: ComponentProps<typeof LearningDashboard>) {
  return <div className="space-y-6">
    <LearningDashboard {...props} />
    <aside aria-label="More learning tools" className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-xl border border-cyan-300/20 bg-[#111a28] p-5">
        <p className="text-sm text-slate-400"><GoogleSubtitle text="From the same creator · Android closed test" /></p>
        <h2 className="mt-2 text-xl font-bold"><GoogleSubtitle text="AZ-802 on your phone" /></h2>
        <p className="mt-3 text-base leading-7 text-slate-300"><GoogleSubtitle text="Practice with explanations and spaced review. Progress stays on your device; no registration is required." /></p>
        <p className="mt-2 text-sm leading-6 text-slate-400"><GoogleSubtitle text="Testing access is limited to invited Google accounts. Installation becomes available after the test release is approved and published." /></p>
        <a className="mt-4 inline-block rounded-lg border border-cyan-300/40 px-4 py-3 font-semibold text-cyan-100 focus-visible:outline-2 focus-visible:outline-cyan-300" href="https://play.google.com/apps/testing/com.wincraft.az802" target="_blank" rel="noopener noreferrer"><GoogleSubtitle text="Open Google Play testing" /></a>
        <a className="mt-3 block text-sm text-slate-400 underline" href="https://az802-app-privacy.vahid-rahmani.chatgpt.site/" target="_blank" rel="noopener noreferrer"><GoogleSubtitle text="Android app privacy policy" /></a>
      </article>
      <article className="rounded-xl border border-white/10 bg-[#111a28] p-5">
        <p className="text-sm text-slate-400"><GoogleSubtitle text="From the same creator · Chrome extension" /></p>
        <h2 className="mt-2 text-xl font-bold">Zova</h2>
        <p className="mt-3 text-base leading-7 text-slate-300"><GoogleSubtitle text="Follow online classes with transcription, translation and focused explanations. Explore the features and setup guide on the Zova website." /></p>
        <a className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-3 font-semibold text-cyan-100 focus-visible:outline-2 focus-visible:outline-cyan-300" href="https://zovasite.vercel.app/" target="_blank" rel="noopener noreferrer"><GoogleSubtitle text="Discover Zova" /></a>
      </article>
    </aside>
  </div>;
}
