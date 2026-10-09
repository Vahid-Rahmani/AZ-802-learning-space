import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(import.meta.dirname, '..');
const scratch = resolve(repo, '.tmpwork/ad-guide-test');
mkdirSync(scratch, { recursive: true });
const outfile = resolve(scratch, 'bundle.mjs');
await build({ stdin: { contents: 'export {Quiz} from "./app/components/learning-views"; export {questions,copy} from "./lib/course-data"; export {adForestGuide,getAdVisualGuide,adStepImage} from "./lib/content/ad-visual-guides";', resolveDir: repo, loader: 'tsx' }, outfile, bundle: true, format: 'esm', platform: 'neutral', jsx: 'automatic', tsconfig: resolve(repo, 'tsconfig.json'), external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'lucide-react'], logLevel: 'warning' });
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://guide.test', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent']) Object.defineProperty(globalThis, name, { value: name === 'window' ? dom.window : dom.window[name], configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let desktop = true;
window.matchMedia = () => ({ matches: desktop, addEventListener() {}, removeEventListener() {} });
window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
window.HTMLDialogElement.prototype.close = function() { this.open = false; };
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { Quiz, questions, copy, adForestGuide, getAdVisualGuide, adStepImage } = await import(pathToFileURL(outfile).href);
const root = createRoot(document.querySelector('#root'));
const question = id => questions.find(q => q.id === id);
const props = { t: copy.en, question: question('az802-q-010'), selected: 0, totalQuestions: 5, answer: null, setAnswer() {}, showTranslations: false, mode: 'practice', previous() {}, next() {}, onTimeout() {} };
const render = async overrides => act(async () => root.render(React.createElement(Quiz, { ...props, ...overrides })));
await render({});
assert.equal(document.querySelector('.ad-visual-guide').open, true, 'desktop guide must open');
assert.equal(document.querySelector('.ad-guide-step-picker select').value, '6', 'question must focus the database-path step');
const picker = document.querySelector('.ad-guide-step-picker select');
await act(async () => { picker.value = '0'; picker.dispatchEvent(new window.Event('change', { bubbles: true })); });
assert.equal(document.querySelector('.ad-guide-actions button').disabled, true);
await act(async () => document.querySelector('.ad-guide-actions button:last-child').click());
assert.equal(picker.value, '1');
assert.match(document.querySelector('.ad-guide-path').textContent, /Installation Type/);
await act(async () => document.querySelector('.ad-guide-image').click());
assert.equal(document.querySelector('dialog').open, true);
await act(async () => document.querySelector('[aria-label="Close screenshot"]').click());
assert.equal(document.querySelector('dialog').open, false);
await render({ question: question('az802-q-011') });
assert.equal(document.querySelector('.ad-guide-step-picker select').value, '6', 'changing questions resets to the correct focus step');
await render({ question: question('az802-q-001') });
assert.match(document.querySelector('.ad-guide-body h3').textContent, /FSMO/, 'FSMO must receive its own guide, not installation');
assert.ok(document.querySelector('.ad-guide-diagram'));
assert.ok(document.querySelector('.ad-guide-command'));
assert.equal(document.querySelector('.ad-guide-image'), null, 'diagram must not masquerade as a screenshot');
await render({ mode: 'exam' });
assert.equal(document.querySelector('.ad-visual-rail'), null, 'no guide before exam answer');
await render({ mode: 'exam', answer: 0 });
assert.ok(document.querySelector('.ad-visual-rail'), 'show after submitting exam answer');
desktop = false;
await render({ question: question('az802-q-011') });
assert.equal(document.querySelector('.ad-visual-guide').open, false, 'mobile guide must start collapsed');
await act(async () => document.querySelector('.ad-guide-image img').dispatchEvent(new window.Event('error')));
assert.ok(document.querySelector('.ad-guide-image-fallback'), 'failed image must leave readable instructions and source');
assert.ok(document.querySelector('.ad-guide-path'));
const bindings = questions.filter(q => getAdVisualGuide(q));
const expectedIds = [...Array.from({length:65},(_,i)=>String(i+1).padStart(3,'0')), ...Array.from({length:15},(_,i)=>String(i+301))].map(id => `az802-q-${id}`);
assert.deepEqual(bindings.map(q => q.id).sort(), expectedIds.sort(), 'all 80 AD question identities must receive a reviewed guide');
assert.match(getAdVisualGuide(question('az802-q-043')).context, /stag|pre-create/i, 'staging must not receive an ordinary role-install guide');
assert.equal(adForestGuide.steps.length, 9);
const guides = new Map();
for (const q of bindings) {
  const binding = getAdVisualGuide(q);
  assert.ok(binding.guide.steps.some(s => s.id === binding.startStep), `${q.id}: initial step must exist`);
  assert.ok(binding.context && binding.guide.prerequisites && binding.guide.versionNote);
  assert.equal(new URL(binding.guide.source).hostname, 'learn.microsoft.com');
  for (const walkthrough of binding.guide.walkthroughs ?? []) {
    assert.equal(walkthrough.version, 'Windows Server 2025');
    assert.equal(new URL(walkthrough.url).protocol, 'https:');
    assert.ok(walkthrough.title);
  }
  assert.equal(getAdVisualGuide({ ...q, domain: 'Another course' }), null, 'identity must not cross courses');
  if (guides.has(binding.guide.id)) assert.equal(guides.get(binding.guide.id), binding.guide, 'guide identities must be unique');
  guides.set(binding.guide.id, binding.guide);
  await render({ question: q });
  assert.equal(Number(document.querySelector('.ad-guide-step-picker select').value), binding.guide.steps.findIndex(s => s.id === binding.startStep), `${q.id}: UI must start on mapped step`);
  assert.match(document.querySelector('article').getAttribute('aria-label'), new RegExp(`^Step ${binding.guide.steps.findIndex(s => s.id === binding.startStep) + 1}:`));
  await render({ question: q, mode: 'exam' });
  assert.equal(document.querySelector('.ad-visual-rail'), null, `${q.id}: no exam hint before answer`);
}
for (const guide of guides.values()) {
  assert.equal(new Set(guide.steps.map(s => s.id)).size, guide.steps.length, `${guide.id}: step identities must be unique`);
  for (const step of guide.steps) {
    assert.ok(step.path.length && step.instruction && step.alt);
    assert.ok(step.image || step.diagram, `${guide.id}/${step.id}: each step needs a real image or explicitly authored diagram`);
    if (step.image) assert.equal(new URL(adStepImage(step)).hostname, 'learn.microsoft.com');
    else assert.equal(adStepImage(step), '', 'no fabricated screenshot URL');
    if (step.source) assert.equal(new URL(step.source).protocol, 'https:');
    if (step.diagram) {
      const nodes = new Set(step.diagram.nodes.map(node => node.id));
      assert.equal(nodes.size, step.diagram.nodes.length, 'diagram identities must be unique');
      for (const edge of step.diagram.edges) assert.ok(nodes.has(edge.from) && nodes.has(edge.to), 'every diagram edge must resolve');
    }
    const q = bindings.find(q => getAdVisualGuide(q).guide.id === guide.id);
    await render({question:q});
    const picker = document.querySelector('.ad-guide-step-picker select');
    await act(async () => {picker.value = String(guide.steps.indexOf(step)); picker.dispatchEvent(new window.Event('change', {bubbles:true}));});
    assert.equal(document.querySelector('article h4').textContent, step.title);
    assert.equal(!!document.querySelector('.ad-guide-image'), !!step.image);
    assert.equal(!!document.querySelector('.ad-guide-diagram'), !step.image && !!step.diagram);
    assert.equal(!!document.querySelector('.ad-guide-command'), !!step.command);
  }
}
await render({ question: question('az802-q-046') });
assert.match(document.querySelector('.ad-guide-body h3').textContent, /demote/);
assert.match(document.querySelector('.ad-guide-image img').src, /demoting-domain-controllers/);
assert.equal(getAdVisualGuide({ id: 'az802-q-043', domain: 'Another course' }), null);
await act(async () => root.unmount());
rmSync(scratch, { recursive: true, force: true });
console.log(`PASS AD visual guide: ${bindings.length} explicit question bindings, ${guides.size} workflows, ${[...guides.values()].reduce((n,g)=>n+g.steps.length,0)} steps, ${new Set([...guides.values()].flatMap(g => g.steps.map(adStepImage)).filter(Boolean)).size} shared reference screenshots, per-question focus and exam gating, all steps rendered, mobile collapse, enlargement and image failure fallback.`);
