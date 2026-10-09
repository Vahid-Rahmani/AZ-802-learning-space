// Generate an exact, reviewable patch; never write or reorder the question bank.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const repo = resolve(import.meta.dirname, '..');
const result = await build({ stdin: { contents: `
  import {identityQuestionCorrections} from './lib/content/ad-visual-review-identity';
  import {networkQuestionCorrections} from './lib/content/ad-visual-review-network';
  import {operationsQuestionCorrections} from './lib/content/ad-visual-review-operations';
  import {existingQuestionCorrections} from './lib/content/ad-visual-review-existing';
  export const batches=[identityQuestionCorrections,networkQuestionCorrections,operationsQuestionCorrections,existingQuestionCorrections];
`, resolveDir: repo, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { batches } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const seen = new Set();
for (const batch of batches) for (const id of Object.keys(batch)) { assert.ok(!seen.has(id), `Duplicate correction: ${id}`); seen.add(id); }
const corrections = Object.assign({}, ...batches);
const selection = process.argv.find(value => value.startsWith('--ids='))?.slice(6).split(',');
const bankPath = resolve(repo, 'lib/content/questions.ts');
const rows = readFileSync(bankPath, 'utf8').split(/\r?\n/);
const edits = [];
for (const original of rows) {
  if (!original.startsWith('{"id"')) continue;
  const comma = original.endsWith(',') ? ',' : '';
  const question = JSON.parse(comma ? original.slice(0, -1) : original);
  const patch = corrections[question.id];
  if (!patch || (selection && !selection.includes(question.id))) continue;
  assert.equal(question.domain, 'Deploy and manage AD DS');
  assert.ok(!patch.id && !patch.domain && !patch.skillId, 'Question identity and progress grouping must remain unchanged');
  const updated = { ...question, ...patch };
  // A deliberately empty command list removes a misleading old command;
  // optional enrichment must be absent rather than an invalid empty list.
  if (Array.isArray(patch.commandPath) && !patch.commandPath.length) delete updated.commandPath;
  if (patch.audit) updated.audit = { ...question.audit, ...patch.audit, originalityVerified: question.audit?.originalityVerified ?? false };
  const next = JSON.stringify(updated) + comma;
  if (next !== original) edits.push({ id: question.id, original, next });
}
if (process.argv.includes('--patch')) {
  if (!edits.length) { console.log(''); process.exit(0); }
  console.log(`*** Begin Patch\n*** Update File: ${bankPath.replaceAll('\\', '/')}\n${edits.map(edit => `@@\n-${edit.original}\n+${edit.next}`).join('\n')}\n*** End Patch`);
} else console.log(JSON.stringify({ authored: seen.size, pending: edits.length, ids: edits.map(edit => edit.id) }));
