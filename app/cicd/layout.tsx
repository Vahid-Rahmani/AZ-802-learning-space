import type { Metadata } from "next";
import "./cicd.css";

export const metadata: Metadata = { title: "CI/CD project lab · Klybit", description: "Learn CI/CD through a safe, project-based browser simulation: Git, tests, pipelines, artifacts, deployment, approval, incidents and rollback." };
export default function CicdLayout({ children }: { children: React.ReactNode }) { return children; }
