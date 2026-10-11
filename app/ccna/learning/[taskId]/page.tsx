import { notFound } from "next/navigation";
import { CiscoLearningOverview } from "@/app/components/cisco-learning";
import { learningTasks } from "@/lib/content/cisco-learning";

export default async function LessonOverviewPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = learningTasks.find(t => t.id === taskId);
  if (!task) notFound();
  return <CiscoLearningOverview task={task} />;
}
