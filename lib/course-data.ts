export type { Language } from "./content/translations";
export { copy } from "./content/translations";
export { skills } from "./content/skills";
export { questions } from "./content/questions";
export { lessons, practicalScenarios } from "./content/lessons";
export { learningGraphStages, trainingStages, trainingStageForQuestion } from "./content/training";

import { questions as az802Questions } from "./content/questions";
import { practicalScenarios as az802PracticalScenarios } from "./content/lessons";
import { az900PracticalScenarios, az900Questions } from "./content/az900";

export const allQuestions = [...az802Questions, ...az900Questions];
export const allPracticalScenarios = [...az802PracticalScenarios, ...az900PracticalScenarios];
