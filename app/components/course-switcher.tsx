"use client";

import { Cloud, Server } from "lucide-react";

export function CourseSwitcher({ active }: { active: "az802" | "az900" }) {
  const courses = [
    { id:"az802" as const, href:"/", code:"AZ-802", title:"Windows Server", icon:<Server size={17} /> },
    { id:"az900" as const, href:"/az-900", code:"AZ-900", title:"Azure Fundamentals", icon:<Cloud size={17} /> },
  ];
  return <nav aria-label="Certification course" className="course-switcher relative z-20 grid grid-cols-2 gap-2 rounded-2xl border border-cyan-300/20 bg-[#0d1724] p-2 shadow-lg shadow-black/20">
    <p className="col-span-2 px-2 pb-0.5 text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Choose certification</p>
    {courses.map((course) => <a key={course.id} href={course.href} onClick={(event) => { event.preventDefault(); window.location.href = course.href; }} aria-current={active === course.id ? "page" : undefined} className={`pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${active === course.id ? "border-cyan-300/70 bg-cyan-300/15 text-white shadow-inner shadow-cyan-300/5" : "border-cyan-300/25 bg-white/[.03] text-cyan-100 hover:border-cyan-300/60 hover:bg-cyan-300/10"}`}>
      <span aria-hidden="true" className="shrink-0 text-cyan-300">{course.icon}</span>
      <span className="min-w-0"><strong className="block text-sm">{course.code}</strong><span className="block truncate text-xs">{course.title}</span></span>
    </a>)}
  </nav>;
}
