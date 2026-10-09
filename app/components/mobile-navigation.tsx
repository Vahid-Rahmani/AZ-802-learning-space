"use client";

import { useRef, type ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";

type Item<Key extends string> = { key: Key; label: string; icon: ReactNode };

export function MobileNavigation<Key extends string>({ items, primaryKeys, active, onNavigate }: {
  items: Item<Key>[];
  primaryKeys: Key[];
  active: Key;
  onNavigate: (key: Key) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = primaryKeys.flatMap((key) => items.filter((item) => item.key === key));
  const secondary = items.filter((item) => !primaryKeys.includes(item.key));
  return <>
    <nav className="mobile-nav" data-simple={secondary.length === 0 ? "true" : undefined} aria-label="Mobile navigation">
      {primary.map((item) => <button key={item.key} type="button" aria-label={item.label} aria-current={active === item.key ? "page" : undefined} onClick={() => onNavigate(item.key)}><span aria-hidden="true">{item.icon}</span><span>{item.key === "home" ? "Home" : item.label}</span></button>)}
      {secondary.length > 0 && <button type="button" aria-label="More learning tools" aria-haspopup="dialog" aria-current={secondary.some((item) => item.key === active) ? "page" : undefined} onClick={() => dialog.current?.showModal()}><MoreHorizontal size={21} /><span>More</span></button>}
    </nav>
    <dialog ref={dialog} className="mobile-more-sheet" aria-labelledby="more-tools-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sheet-handle" aria-hidden="true" />
      <header><div><p>Explore your learning space</p><h2 id="more-tools-title">More learning tools</h2></div><button type="button" aria-label="Close learning tools" onClick={() => dialog.current?.close()}><X size={21} /></button></header>
      <div className="sheet-links">{secondary.map((item) => <button key={item.key} type="button" aria-current={active === item.key ? "page" : undefined} onClick={() => { dialog.current?.close(); onNavigate(item.key); }}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span><span aria-hidden="true">→</span></button>)}</div>
    </dialog>
  </>;
}
