"use client";

import Link from "next/link";
import { Cloud, Server } from "lucide-react";

export function CourseSwitcher({ active }: { active: "az802" | "az900" }) {
  const courses = [
    { id:"az802" as const, href:"/", code:"AZ-802", title:"Windows Server", icon:<Server size={17} /> },
    { id:"az900" as const, href:"/az-900", code:"AZ-900", title:"Azure Fundamentals", icon:<Cloud size={17} /> },
  ];
  return <nav aria-label="Certification course" className="course-switcher grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
    {courses.map((course) => <Link key={course.id} href={course.href} aria-current={active === course.id ? "page" : undefined} className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition ${active === course.id ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-50" : "border-transparent text-slate-400 hover:border-white/10 hover:text-white"}`}>
      <span aria-hidden="true" className="shrink-0 text-cyan-300">{course.icon}</span>
      <span className="min-w-0"><strong className="block text-sm">{course.code}</strong><span className="block truncate text-xs">{course.title}</span></span>
    </Link>)}
  </nav>;
}
