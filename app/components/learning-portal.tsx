"use client";

import { useId, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Cloud, Container, GraduationCap, Languages, Network, Search, Server, ShieldCheck, Terminal, Workflow } from "lucide-react";
import { AppBrand } from "./study-header";
import { GoogleSubtitle } from "./google-translate";

// Only paths that already exist in Klybit belong in this catalogue. No exam
// coverage, prices or question counts are borrowed from the reference site.
export const portalCourses = [
  { id: "az802", code: "AZ-802", title: "Windows Server", category: "Microsoft", level: "Associate", detail: "Active Directory, networking, hybrid services and server administration.", topics: ["Practice questions", "Server labs", "Spaced review"], href: "/", icon: Server },
  { id: "az900", code: "AZ-900", title: "Azure Fundamentals", category: "Microsoft", level: "Fundamentals", detail: "Build your foundation in cloud concepts, Azure services and governance.", topics: ["Guided lessons", "Practice questions", "Assessments"], href: "/az-900", icon: Cloud },
  { id: "ccna", code: "Cisco", title: "Cisco networking", category: "Cisco", level: "Beginner to advanced", detail: "Follow the learning path, explore topologies and practise device configuration.", topics: ["Interactive topology", "Device CLI", "Guided tasks"], href: "/ccna", icon: Network },
  { id: "linux", code: "Linux", title: "Linux administration", category: "Hands-on", level: "Foundations", detail: "Practise files, permissions and services in the browser-based Linux simulator.", topics: ["RHEL-style terminal", "Guided tasks", "Device-state checks"], href: "/linux", icon: Terminal },
  { id: "docker", code: "Docker", title: "Containers & Compose", category: "Hands-on", level: "Foundations", detail: "Work through practical container, image, networking and Compose exercises.", topics: ["Container basics", "Compose labs", "Guided setup"], href: "/docker", icon: Container },
  { id: "german", code: "Deutsch", title: "German for IT", category: "Language", level: "B1 to B2 bridge", detail: "Improve your German through IT scenarios, typing, listening and spaced review.", topics: ["Typing practice", "IT vocabulary", "Leitner review"], href: "/german", icon: Languages },
  { id: "cicd", code: "CI/CD", title: "Build, test & deploy", category: "Hands-on", level: "Project-based", detail: "Take one project from its first commit to a checked, approved release and safe rollback.", topics: ["Guided missions", "Pipeline simulation", "Release & recovery"], href: "/cicd", icon: Workflow },
] as const;
const categories = ["All paths", "Microsoft", "Cisco", "Hands-on", "Language"] as const;
type Category = typeof categories[number];
export type PortalProgress = {
  learning: number;
  answered: number;
  correct: number;
  lesson: string;
  stages: { id: string; title: string; percent: number }[];
  onLesson: () => void;
  onStage: (id: string) => void;
  onPractice: () => void;
  onExams: () => void;
  onReview: () => void;
};

export function LearningPortal({ questionCount, onSignIn, onWindowsServer, onPractice, progress }: {
  questionCount: number;
  onSignIn?: () => void;
  onWindowsServer: () => void;
  onPractice?: () => void;
  progress?: PortalProgress;
}) {
  const [category, setCategory] = useState<Category>("All paths");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const catalogId = useId();
  const howId = useId();
  const filtered = portalCourses.filter(course => (category === "All paths" || course.category === category)
    && `${course.code} ${course.title} ${course.detail} ${course.topics.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className={`klybit-portal${progress ? " klybit-portal--dashboard" : ""}`}>
    {!progress && <header className="portal-navigation">
      <a href="/" aria-label="Klybit home" className="portal-brand-link"><AppBrand subtitle="Learn. Practice. Progress." /></a>
      <nav aria-label="Explore Klybit"><a href={`#${catalogId}`}>Learning paths</a><a href={`#${howId}`}>How it works</a></nav>
      <button type="button" className="portal-nav-signin" onClick={onSignIn}>Sign in <ArrowRight size={16} aria-hidden="true" /></button>
    </header>}

    <section className="portal-hero" aria-labelledby="portal-title">
      <div className="portal-hero-inner">
        <p className="portal-pill"><GraduationCap size={16} aria-hidden="true" /><GoogleSubtitle text="Learn the concepts. Put them into practice." /></p>
        {progress ? <h2 id="portal-title"><GoogleSubtitle text="Build your skills." /><br /><span><GoogleSubtitle text="One step at a time." /></span></h2>
          : <h1 id="portal-title">IT learning & certification<br /><span>Practice that makes it click.</span></h1>}
        <p className="portal-hero-description"><GoogleSubtitle text="Clear lessons, practice questions with explanations, and practical exercises. Choose your path and turn what you learn into skills you can use." /></p>
        <div className="portal-hero-actions">
          <button type="button" className="portal-button portal-button--primary" onClick={progress?.onPractice ?? onPractice ?? onWindowsServer}><GoogleSubtitle text={progress ? "Practise Windows Server" : "Start practising"} /><ArrowRight size={18} aria-hidden="true" /></button>
          <a className="portal-button portal-button--outline" href={`#${catalogId}`}><GoogleSubtitle text="Browse learning paths" /></a>
        </div>
        <ul className="portal-hero-points"><li><Check size={15} aria-hidden="true" /><GoogleSubtitle text={`${portalCourses.length} learning paths`} /></li><li><Check size={15} aria-hidden="true" /><GoogleSubtitle text="Detailed explanations" /></li><li><Check size={15} aria-hidden="true" /><GoogleSubtitle text="Learn at your own pace" /></li></ul>
      </div>
    </section>

    {progress && <section className="portal-progress" aria-labelledby="portal-progress-title">
      <div className="portal-progress-heading"><div><p className="portal-eyebrow">Your AZ-802 workspace</p><h2 id="portal-progress-title"><GoogleSubtitle text="Pick up where you left off" /></h2></div><button type="button" className="portal-text-link" onClick={progress.onLesson}><GoogleSubtitle text="Continue learning" /><ArrowRight size={16} aria-hidden="true" /></button></div>
      <div className="portal-progress-grid">
        <div className="portal-next-lesson"><BookOpen size={22} aria-hidden="true" /><div><span><GoogleSubtitle text="Your selected lesson" /></span><strong><GoogleSubtitle text={progress.lesson} /></strong><progress max={100} value={progress.learning} aria-label="AZ-802 learning progress" /><p>{progress.learning}% <GoogleSubtitle text="learning progress" /></p></div></div>
        <dl className="portal-statistics"><div><dt><GoogleSubtitle text="Questions answered" /></dt><dd>{progress.answered}</dd></div><div><dt><GoogleSubtitle text="Answer accuracy" /></dt><dd>{progress.answered ? `${Math.round(progress.correct / progress.answered * 100)}%` : "—"}</dd></div></dl>
      </div>
      <div className="portal-workspace-actions"><button type="button" onClick={progress.onPractice}><GoogleSubtitle text="Question practice" /><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={progress.onExams}><GoogleSubtitle text="Timed assessments" /><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={progress.onReview}><GoogleSubtitle text="Review saved questions" /><ChevronRight size={16} aria-hidden="true" /></button></div>
      <details className="portal-stage-details"><summary><GoogleSubtitle text="View progress by topic" /></summary><div>{progress.stages.map(stage => <button type="button" key={stage.id} onClick={() => progress.onStage(stage.id)}><span><GoogleSubtitle text={stage.title} /></span><strong>{stage.percent}%</strong><progress value={stage.percent} max={100} aria-label={`${stage.title} answer accuracy`} /></button>)}</div><p><GoogleSubtitle text="Topic percentages reflect answer accuracy, not complete exam readiness." /></p></details>
    </section>}

    <section id={catalogId} className="portal-catalog" aria-labelledby="portal-catalog-title">
      <div className="portal-section-heading"><p className="portal-eyebrow"><GoogleSubtitle text="Find your next skill" /></p><h2 id="portal-catalog-title"><GoogleSubtitle text="Available learning paths" /></h2><p><GoogleSubtitle text="From your first cloud concepts to hands-on practice. Start with the path that fits your goal." /></p></div>
      <div className="portal-catalog-tools"><div className="portal-filters" role="group" aria-label="Filter learning paths">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}><GoogleSubtitle text={item} /></button>)}</div><label className="portal-search" htmlFor={searchId}><Search size={18} aria-hidden="true" /><span className="portal-sr-only">Search learning paths</span><input id={searchId} value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Find a learning path…" /></label></div>
      <p className="portal-result-count" role="status">{filtered.length} of {portalCourses.length} paths</p>
      <div className="portal-course-grid">{filtered.map(course => {
        const Icon = course.icon;
        return <article className="portal-course-card" key={course.id} data-course={course.id}>
          <div className="portal-card-top"><span className={`portal-course-icon portal-course-icon--${course.category.toLowerCase()}`}><Icon size={25} aria-hidden="true" /></span><span className="portal-level"><GoogleSubtitle text={course.level} /></span></div>
          <p className="portal-course-code">{course.code}</p><h3><GoogleSubtitle text={course.title} /></h3><p className="portal-course-detail"><GoogleSubtitle text={course.detail} /></p>
          <ul>{course.topics.map(topic => <li key={topic}><Check size={14} aria-hidden="true" /><GoogleSubtitle text={topic} /></li>)}</ul>
          <div className="portal-card-footer"><span><GoogleSubtitle text={course.id === "az802" ? `${questionCount.toLocaleString("en-US")} practice questions` : course.category === "Microsoft" ? "Lessons & practice" : course.category === "Language" ? "Practice & review" : "Practical learning"} /></span>{course.id === "az802"
            ? <button type="button" onClick={onWindowsServer} aria-label={`Open ${course.code} ${course.title}`}><GoogleSubtitle text="Open path" /><ArrowRight size={16} aria-hidden="true" /></button>
            : <a href={course.href} aria-label={`Open ${course.code} ${course.title}`}><GoogleSubtitle text="Open path" /><ArrowRight size={16} aria-hidden="true" /></a>}</div>
        </article>;
      })}</div>
      {filtered.length === 0 && <div className="portal-empty"><Search size={28} aria-hidden="true" /><h3>No matching learning paths</h3><p>Try a different subject or clear the filters.</p><button type="button" className="portal-text-link" onClick={() => { setCategory("All paths"); setQuery(""); }}>Show all paths <ArrowRight size={16} aria-hidden="true" /></button></div>}
    </section>

    {!progress && <>
      <section id={howId} className="portal-how" aria-labelledby="portal-how-title"><div className="portal-section-heading"><p className="portal-eyebrow">A clear way forward</p><h2 id="portal-how-title">Learn. Practise. Understand.</h2><p>A focused workflow, without getting lost in menus.</p></div><div className="portal-how-grid">{[
        { icon: BookOpen, title: "01 · Choose a learning path", text: "Start with a subject that matches your goal. Use lessons to build the concepts before tackling the exercises." },
        { icon: Terminal, title: "02 · Put it into practice", text: "Answer questions or work through practical tasks. Simulator limitations are labelled within each path." },
        { icon: ShieldCheck, title: "03 · Learn from the feedback", text: "Read the explanations, revisit the topics you find difficult and return to your saved progress." },
      ].map(item => <div key={item.title}><item.icon size={26} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></section>
      <section className="portal-bottom-cta"><h2>Make your next study session count.</h2><p>Choose a path. Start small. Keep building.</p><a href={`#${catalogId}`} className="portal-button portal-button--primary">Explore learning paths <ArrowRight size={18} aria-hidden="true" /></a></section>
    </>}
    <footer className="portal-footer"><span>Klybit · Learn. Practice. Progress.</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav><p>Independent educational practice. Not affiliated with Microsoft, Cisco or Red Hat.</p></footer>
  </div>;
}
