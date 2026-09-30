"use client";

import { Dashboard as BaseDashboard, ExamChooser } from "@/app/components/learning-views";
import type { ComponentProps } from "react";
import type { ExamMode } from "@/lib/content/exam-blueprints";

type Props = ComponentProps<typeof BaseDashboard>;

export function Dashboard({ onTimedExam, ...props }: Props) {
  const chooseExam = (mode: ExamMode) => {
    (window as Window & { __wincraftExamMode?: ExamMode }).__wincraftExamMode = mode;
    onTimedExam();
  };
  return <><BaseDashboard {...props} onTimedExam={() => { (window as Window & { __wincraftExamMode?: ExamMode }).__wincraftExamMode = "quick"; onTimedExam(); }} /><div className="mt-6"><ExamChooser t={props.t} onSelect={chooseExam} /></div></>;
}

