import { createKnowledgeSearch } from "../lib/knowledge-search.ts";
import { questions } from "../lib/content/questions.ts";

const search = createKnowledgeSearch(questions);
const cases = [
  { query: "Which FSMO role allocates RID pools?", expectedId: "az802-q-001", expectedAnswer: "RID Master" },
  { query: "کدام نقش rid pool تخصیص می دهد", expectedId: "az802-q-001", expectedAnswer: "RID Master" },
  { query: "چطور نقش FSMO خراب را منتقل کنم؟", expectedId: "az802-q-008", expectedAnswer: "Seizing the role" },
  { query: "چگونه نقش FSMO خراب را منتقل کنیم؟", expectedId: "az802-q-008", expectedAnswer: "Seizing the role" },
  { query: "نقش FSMO خراب منتقل", expectedId: "az802-q-008", expectedAnswer: "Seizing the role" },
  { query: "Failover cluster quorum", expectedId: "az802-q-292" },
];

for (const testCase of cases) {
  const result = search.search(testCase.query);
  if (!result.supported || result.best?.item.id !== testCase.expectedId) {
    throw new Error(`Search failed for ${JSON.stringify(testCase.query)}: received ${result.best?.item.id ?? "no result"}`);
  }
  if (testCase.expectedAnswer && result.best.item.answer !== testCase.expectedAnswer) {
    throw new Error(`Unexpected answer for ${JSON.stringify(testCase.query)}: ${result.best.item.answer}`);
  }
}

const unrelatedQueries = ["best pizza in Berlin", "بهترین پیتزا در برلین", "how to cook rice", "چطور", "را به در", ""];
for (const unrelated of unrelatedQueries) {
  const result = search.search(unrelated);
  if (result.supported) throw new Error(`Unsupported query received an answer: ${JSON.stringify(unrelated)}`);
}

console.log(JSON.stringify({ status: "ok", indexedQuestions: questions.length, supportedCases: cases.length, refusedCases: unrelatedQueries.length }));
