"use client";

import type { ReactNode } from "react";
import { GoogleSubtitle } from "./google-translate";

export type SimpleNavItem = { key: string; label: string; icon?: ReactNode; href?: string };

export function SimpleNavigation({ items, active, onNavigate }: { items: SimpleNavItem[]; active: string; onNavigate?: (key: string) => void }) {
  return <nav className="simple-navigation" aria-label="Primary navigation">{items.map(item => item.href
    ? <a key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} onClick={event => { event.preventDefault(); window.location.href = item.href!; }}>{item.icon}<GoogleSubtitle text={item.label} /></a>
    : <button type="button" key={item.key} aria-current={active === item.key ? "page" : undefined} onClick={() => onNavigate?.(item.key)}>{item.icon}<GoogleSubtitle text={item.label} /></button>)}</nav>;
}

export function LearningStart({ title, lesson, onStart, href, progress, children }: { title: string; lesson: string; onStart?: () => void; href?: string; progress?: string; children?: ReactNode }) {
  return <section className="learning-start" aria-label="Your next step">
    <p className="simple-eyebrow"><GoogleSubtitle text="Your next step" /></p>
    <h2><GoogleSubtitle text={title} /></h2>
    <p><GoogleSubtitle text="Read a short lesson, practise it, then check what you learned." /></p>
    <div className="learning-next"><span><GoogleSubtitle text={lesson} /></span>{href
      ? <a className="simple-primary" href={href} onClick={event => { event.preventDefault(); window.location.href = href; }}><GoogleSubtitle text="Start / continue learning" /> →</a>
      : <button className="simple-primary" type="button" onClick={onStart}><GoogleSubtitle text="Start / continue learning" /> →</button>}</div>
    {progress && <p className="simple-progress">{progress}</p>}
    {children}
  </section>;
}

export function PracticeHub({ onQuestions, onLabs, questionHref, labHref, children }: { onQuestions?: () => void; onLabs?: () => void; questionHref?: string; labHref?: string; children?: ReactNode }) {
  const choices = [{ title: "Questions", detail: "Choose a topic and practise with explanations.", href: questionHref, action: onQuestions }, { title: "Labs", detail: "Choose a lab and follow its practical steps.", href: labHref, action: onLabs }];
  return <section className="simple-practice" aria-label="Practice choices"><h2><GoogleSubtitle text="What would you like to practise?" /></h2><div className="simple-choice-grid">{choices.map(choice => choice.href
    ? <a key={choice.title} href={choice.href} onClick={event => { event.preventDefault(); window.location.href = choice.href!; }}><strong><GoogleSubtitle text={choice.title} /></strong><span><GoogleSubtitle text={choice.detail} /></span><span>Open →</span></a>
    : <button type="button" key={choice.title} onClick={choice.action}><strong><GoogleSubtitle text={choice.title} /></strong><span><GoogleSubtitle text={choice.detail} /></span><span>Open →</span></button>)}</div>{children}</section>;
}
