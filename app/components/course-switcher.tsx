"use client";

import { useId, useState } from "react";
import { ChevronDown, Cloud, Container, Network, Server } from "lucide-react";

export function CourseSwitcher({ active }: { active: "az802" | "az900" | "docker" | "ccna" }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const courses = [
    { id:"az802" as const, href:"/", code:"AZ-802", title:"Windows Server", icon:<Server size={17} /> },
    { id:"az900" as const, href:"/az-900", code:"AZ-900", title:"Azure Fundamentals", icon:<Cloud size={17} /> },
    { id:"docker" as const, href:"/docker", code:"Docker", title:"Containers & Compose", icon:<Container size={17} /> },
    { id:"ccna" as const, href:"/ccna", code:"CCNA", title:"Networking & Cisco labs", icon:<Network size={17} /> },
  ];
  const current = courses.find((course) => course.id === active) ?? courses[0];
  return <div className="course-switcher">
    <button type="button" className="course-switcher-toggle" aria-label="Choose learning path" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)}>
      <span className="course-switcher-toggle-label">Learning path</span><strong>{current.code}</strong><ChevronDown size={15} aria-hidden="true" className={open ? "is-rotated" : ""} />
    </button>
    {open && <nav id={menuId} aria-label="Learning course" className="course-switcher-menu">
      <p>Choose learning path</p>
      {courses.map((course) => <a key={course.id} href={course.href} onClick={(event) => { event.preventDefault(); setOpen(false); window.location.href = course.href; }} aria-current={active === course.id ? "page" : undefined} className={active === course.id ? "is-active" : ""}>
        <span aria-hidden="true" className="course-switcher-icon">{course.icon}</span>
        <span className="course-switcher-copy"><strong>{course.code}</strong><span>{course.title}</span></span>
      </a>)}
    </nav>}
  </div>;
}
