import fs from "node:fs";

const questionSource = fs.readFileSync("lib/content/questions.ts", "utf8");
const questions = questionSource
  .split(/\r?\n/)
  .filter((line) => line.startsWith("{"))
  .map((line) => JSON.parse(line.replace(/,$/, "")));

const stages = [
  [1, "AD DS", 1, 65],
  [2, "Hybrid Windows Server", 66, 99],
  [3, "Virtual Machines", 100, 133],
  [4, "Networking", 134, 167],
  [5, "Storage and File Services", 168, 213],
  [6, "Security", 214, 245],
  [7, "Monitoring and Troubleshooting", 246, 280],
  [8, "Backup, Recovery, HA and Migration", 281, 300],
];

const stageFor = (number) => stages.find(([, , first, last]) => number >= first && number <= last);
const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const questionRows = questions.map((question, index) => {
  const number = index + 1;
  const stage = stageFor(number);
  const answer = question.options[question.correct];
  const answerFa = question.optionsFa[question.correct];
  return `| ${String(number).padStart(3, "0")} | ${stage?.[0] ?? ""} · ${escape(stage?.[1] ?? question.domain)} | ${escape(question.text)}<br><sub>${escape(question.textFa)}</sub> | ${escape(answer)}<br><sub>${escape(answerFa)}</sub> |`;
}).join("\n");

const stageRows = stages.map(([number, title, first, last]) => `| ${number} | ${title} | ${first}–${last} | ${last - first + 1} |`).join("\n");

const readme = `# AZ-802 Learning Space

A responsive, trilingual Windows Server learning workspace for AZ-802 preparation. The exam-facing question text remains English; Persian and German support the learning experience. The Persian mode shows English first and the Persian translation directly below it.

## What is included

- Eight staged learning domains with lesson, practice, progress, and lock/unlock flow.
- A 300-question original, scenario-based practice bank. Questions are aligned to the official Microsoft Learn AZ-802 study guide; they are not copied exam questions.
- English, فارسی, and Deutsch interface support. The application shell stays left-to-right; Persian content uses RTL spans where needed.
- Eight-question timed practice exams from the selected stage or the complete bank.
- Positive/negative answer feedback, source links, skill mapping, and automatic Leitner cards for incorrect answers.
- Leitner intervals of 1, 3, 7, 14, and 30 days, including compatibility with the legacy \`ipsec-connection-rule\` card ID.
- Persistent text-size control from 85% to 130%, responsive mobile layout, practical lab evidence, authentication, and progress synchronization APIs.

## Eight stages

| # | Stage | Questions | Count |
| ---: | --- | ---: | ---: |
${stageRows}

## Run locally

Requirements: Node.js 22.13+ and npm.

\`\`\`bash
npm install
npm run dev
\`\`\`

Useful checks:

\`\`\`bash
npx tsc --noEmit
npm run lint
npm run build
\`\`\`

The question localization source is [scripts/localize-question-bank.mjs](scripts/localize-question-bank.mjs). The generated bank lives in [lib/content/questions.ts](lib/content/questions.ts), and the stage map lives in [lib/content/training.ts](lib/content/training.ts).

## Complete 300-question bank

Each row contains the English question, its Persian translation, the correct English answer, and the Persian answer shown in the learning UI.

| ID | Stage | Question / ترجمهٔ فارسی | Correct answer / پاسخ درست |
| ---: | --- | --- | --- |
${questionRows}

## Sources and content policy

The content is written from the official [AZ-802 certification study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802) and Microsoft Learn concepts. The app links to Microsoft’s official [Practice Assessments policy](https://learn.microsoft.com/en-us/certifications/practice-assessments-for-microsoft-certifications), but does not reproduce real assessment items.

## Project structure

- \`app/page.tsx\`: learning shell, routing between dashboard, lessons, quizzes, labs, graph, and cards.
- \`app/components/training-views.tsx\`: eight-stage hub and text-size control.
- \`app/components/learning-views.tsx\`: bilingual lessons, quizzes, practical exam, labs, graph, and Leitner cards.
- \`lib/content/training.ts\`: stage metadata and question-to-stage mapping.
- \`lib/content/questions.ts\`: the complete 300-question content bank.
- \`app/api/flashcards/route.ts\`: synchronized Leitner scheduling and legacy card normalization.

## License and exam notice

This is an educational practice project. Microsoft, Windows Server, Azure, and AZ-802 are Microsoft trademarks. The project is not affiliated with or endorsed by Microsoft.
`;

fs.writeFileSync("README.md", readme, "utf8");
