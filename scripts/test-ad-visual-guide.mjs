import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = resolve(import.meta.dirname, '..');
const scratch = resolve(repo, '.tmpwork/ad-guide-test');
mkdirSync(scratch, { recursive: true });
const outfile = resolve(scratch, 'bundle.mjs');
await build({ stdin: { contents: 'export {Quiz} from "./app/components/learning-views"; export {questions,copy} from "./lib/course-data"; export {adForestGuide,getAdVisualGuide,getQuestionVisualGuide,adStepImage} from "./lib/content/ad-visual-guides"; export {adScreenshotPlacements,adScreenshotCaptures} from "./lib/content/ad-visual-screenshots";', resolveDir: repo, loader: 'tsx' }, outfile, bundle: true, format: 'esm', platform: 'neutral', jsx: 'automatic', tsconfig: resolve(repo, 'tsconfig.json'), external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'lucide-react'], logLevel: 'warning' });
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
const { Quiz, questions, copy, adForestGuide, getAdVisualGuide, getQuestionVisualGuide, adStepImage, adScreenshotPlacements, adScreenshotCaptures } = await import(pathToFileURL(outfile).href);
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
for (const [id, scope] of [['az802-q-017','Domain local'], ['az802-q-018','Global'], ['az802-q-019','Universal']]) {
  const binding = getAdVisualGuide(question(id));
  assert.equal(binding.startStep, 'group-scope', `${id}: scope question must not start on group conversion`);
  assert.ok(binding.context.includes(scope), `${id}: explain the requested scope`);
  assert.match(binding.guide.steps.find(s=>s.id===binding.startStep).image, /sad_116\.png$/);
  await render({ question: question(id) });
  assert.equal(document.querySelector('.ad-guide-image img').getAttribute('width'), null, 'small reference dialog must keep its native width, not a fabricated 840px');
  await act(async()=>document.querySelector('.ad-guide-image').click());
  assert.equal(document.querySelector('dialog img').getAttribute('width'), null, 'enlargement must not manufacture a wide 840px image');
  assert.equal(document.querySelector('dialog img').getAttribute('height'), null, 'enlargement must use the original aspect ratio');
  await act(async()=>document.querySelector('[aria-label="Close screenshot"]').click());
}
assert.match(getAdVisualGuide(question('az802-q-018')).guide.steps.find(s=>s.id==='global-role-members').image, /group-members\.png$/);
for (const [id, step] of [['055','gpo-order'],['061','gpo-model'],['024','privilege'],['027','account'],['030','contents']]) {
  assert.equal(getAdVisualGuide(question(`az802-q-${id}`)).guide.steps.find(s=>s.id===step).image, undefined, `${id}/${step}: do not substitute a loosely related screenshot`);
}
assert.ok(!getAdVisualGuide(question('az802-q-063')).guide.steps.some(s=>s.id.startsWith('preference-drive') || s.id==='preference-group-example' || s.id==='preference-saved-item'), 'loopback must not receive unrelated Drive Maps extras');
for (const [id, step, marker] of [['058','gpo-block','13629-7271.jpg'],['062','gpo-filter','gpmc-policy-scope-security-filtering.png'],['063','loopback-enable','revision=4'],['064','loopback-modes','revision=4'],['031','logon','removegc1.png'],['033','subnet','revision=5']]) {
  const imageStep = getAdVisualGuide(question(`az802-q-${id}`)).guide.steps.find(s=>s.id===step);
  assert.ok(imageStep.image.includes(marker), `${id}: exact control screenshot must be retained`);
  assert.ok(imageStep.diagram && imageStep.imageNote && imageStep.screenshotSource);
  assert.match(imageStep.screenshotLabel, /(?:Windows version unspecified|Windows 8|Windows Server 2012|OS version unknown)/i, 'reference version must be honestly disclosed');
}
await render({question:question('az802-q-012')});
assert.match(document.querySelector('.ad-guide-credit a').href, /answers\/questions\/1609606/);
await act(async()=>document.querySelector('.ad-guide-image').click());
assert.match(document.querySelector('dialog a').href, /answers\/questions\/1609606/, 'DFSR enlargement links to the actual image source');
await act(async()=>document.querySelector('[aria-label="Close screenshot"]').click());
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
for (const [guideId, mapping] of Object.entries(adScreenshotPlacements)) {
  const guide = guides.get(guideId);
  assert.ok(guide, `${guideId}: screenshot mapping must resolve to a real workflow`);
  for (const [stepId, [capture]] of Object.entries(mapping)) {
    const step = guide.steps.find(s => s.id === stepId);
    assert.equal(step?.image, `/images/ad-server-2025/${capture}.png`, `${guideId}/${stepId}: image mapping must resolve to a real step`);
  }
}
const usedLocalImages = new Set([...guides.values()].flatMap(g => g.steps.filter(s => s.imageReference).map(s => s.image)));
// Available captures need not be attached to unrelated questions to satisfy coverage.
for (const name of Object.keys(adScreenshotCaptures)) {
  const png = readFileSync(resolve(repo, 'public/images/ad-server-2025', `${name}.png`));
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
}
for (const image of usedLocalImages) assert.ok(Object.keys(adScreenshotCaptures).some(name=>image===`/images/ad-server-2025/${name}.png`), 'every assigned capture must have a reviewed catalog entry');
for (const guide of guides.values()) {
  assert.equal(new Set(guide.steps.map(s => s.id)).size, guide.steps.length, `${guide.id}: step identities must be unique`);
  for (const step of guide.steps) {
    assert.ok(step.path.length && step.instruction && step.alt);
    assert.ok(step.image || step.diagram, `${guide.id}/${step.id}: each step needs a real image or explicitly authored diagram`);
    if (step.imageReference) {
      assert.match(adStepImage(step), /^\/images\/ad-server-2025\/[a-z-]+\.png$/);
      assert.equal(new URL(step.imageReference.source).hostname, 'github.com');
      assert.match(step.imageReference.source, /7fe4c1f9f6ff6871b2944f1d9fd18f8e8076e247/);
      assert.match(step.imageReference.original, /^https:\/\/github.com\/user-attachments\/assets\/[a-f0-9-]+$/);
      assert.match(step.imageReference.credit, /Hugh Chanetsa.*MIT.*Used with permission from Microsoft/);
      assert.ok(step.imageReference.note, 'different screenshot context must be disclosed');
      const png = readFileSync(resolve(repo, 'public', adStepImage(step).slice(1)));
      assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(png.readUInt32BE(16), step.imageReference.width);
      assert.equal(png.readUInt32BE(20), step.imageReference.height);
      assert.match(readFileSync(resolve(repo, 'public', step.imageReference.license.slice(1)), 'utf8'), /Copyright \(c\) 2025 Hugh Chanetsa/);
    } else if (step.image === '/images/ad-dfsr-service-properties.png') {
      const png = readFileSync(resolve(repo, 'public', step.image.slice(1)));
      assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
      assert.match(step.screenshotLabel, /Windows version unspecified/);
      assert.match(step.source, /^https:\/\/learn\.microsoft\.com\//);
    } else if (step.image) {
      assert.ok(['learn.microsoft.com', 'learn-attachment.microsoft.com', 'techcommunity.microsoft.com'].includes(new URL(adStepImage(step)).hostname), 'reference image must be Microsoft-hosted');
      if (step.screenshotSource) {
        assert.ok(step.screenshotCredit && step.screenshotLabel && step.imageNote, 'reference screenshots need source, credit, version and context');
        assert.ok(['learn.microsoft.com', 'techcommunity.microsoft.com'].includes(new URL(step.screenshotSource).hostname));
      }
    }
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
    assert.equal(!!document.querySelector('.ad-guide-diagram'), !!step.diagram, 'screenshots must not erase conceptual explanations');
    if (step.imageReference) {
      assert.match(document.querySelector('article').textContent, /real lab screenshot/);
      assert.doesNotMatch(document.querySelector('article').textContent, /Older Microsoft reference image/);
      assert.equal(document.querySelector('.ad-guide-credit a').getAttribute('href'), step.imageReference.source);
      await act(async () => document.querySelector('.ad-guide-image').click());
      assert.equal(document.querySelector('dialog a').getAttribute('href'), step.imageReference.source, 'enlarged photo links to its actual source, not Microsoft');
      await act(async () => document.querySelector('[aria-label="Close screenshot"]').click());
    }
    assert.equal(!!document.querySelector('.ad-guide-command'), !!step.command);
  }
}
await render({ question: question('az802-q-046') });
assert.match(document.querySelector('.ad-guide-body h3').textContent, /demote/);
assert.match(document.querySelector('.ad-guide-image img').src, /demoting-domain-controllers/);
assert.equal(getAdVisualGuide({ id: 'az802-q-043', domain: 'Another course' }), null);
for (const id of ['az802-q-066', 'az802-q-323']) {
  await render({question:question(id), mode:'practice', answer:null});
  assert.match(document.querySelector('.ad-visual-guide summary').textContent, /Hybrid management/);
  assert.match(document.querySelector('.ad-guide-image img').src, /windows-admin-center\/media/);
  assert.equal(document.querySelector('.ad-visual-guide').open, false, 'hybrid guide starts collapsed on mobile');
  for (let index=0; index<3; index++) {
    const picker=document.querySelector('.ad-guide-step-picker select');
    await act(async()=>{picker.value=String(index);picker.dispatchEvent(new window.Event('change',{bubbles:true}));});
    assert.match(document.querySelector('article').textContent, /Microsoft Windows Admin Center reference/);
    await act(async()=>document.querySelector('.ad-guide-image').click());
    assert.match(document.querySelector('dialog a').href, /windows-admin-center\/use\/get-started/);
    await act(async()=>document.querySelector('[aria-label="Close screenshot"]').click());
  }
  await render({question:question(id), mode:'mixed', answer:null});
  assert.equal(document.querySelector('.ad-visual-rail'), null, 'hybrid exam must not leak walkthrough hints');
  await render({question:question(id), mode:'mixed', answer:0});
  assert.ok(document.querySelector('.ad-visual-rail'));
  await render({question:{...question(id),domain:'Another course'},mode:'practice'});
  assert.equal(document.querySelector('.ad-visual-rail'), null, 'hybrid identity must not cross course domains');
}
const hybridIds = ['066','069','070','071','072','073','074','083','086','087','088','093','094','095','318','320','321','322','323','326'].map(id=>`az802-q-${id}`);
const hybridBindings = questions.filter(q=>q.domain==='Manage Windows Server instances and workloads in a hybrid environment' && getQuestionVisualGuide(q));
assert.deepEqual(hybridBindings.map(q=>q.id).sort(), [...hybridIds].sort(), 'only explicitly reviewed hybrid questions receive a guide');
for (const q of hybridBindings) {
  const binding = getQuestionVisualGuide(q);
  const startIndex = binding.guide.steps.findIndex(s=>s.id===binding.startStep);
  assert.ok(startIndex>=0 && binding.context && binding.guide.prerequisites && binding.guide.versionNote);
  assert.equal(binding.guide.category, 'Hybrid management');
  assert.equal(getQuestionVisualGuide({...q,domain:'Another course'}), null);
  await render({question:q,mode:'practice',answer:null});
  assert.equal(document.querySelector('.ad-guide-step-picker select').value,String(startIndex), 'initial focus must match this question');
  assert.equal(document.querySelector('.ad-visual-guide').open,false);
  for(const [index,step] of binding.guide.steps.entries()) {
    assert.ok(step.path.length && step.instruction && step.alt && (step.image||step.diagram));
    const picker=document.querySelector('.ad-guide-step-picker select');
    await act(async()=>{picker.value=String(index);picker.dispatchEvent(new window.Event('change',{bubbles:true}));});
    assert.equal(document.querySelector('article h4').textContent,step.title);
    assert.equal(!!document.querySelector('.ad-guide-image'),!!step.image);
    assert.equal(!!document.querySelector('.ad-guide-command'),!!step.command);
    if(step.image) {
      assert.equal(new URL(step.image).hostname,'learn.microsoft.com');
      assert.ok(step.screenshotLabel && (step.source||step.screenshotSource));
      if(!q.id.endsWith('066')&&!q.id.endsWith('323'))assert.ok(step.imageNote && step.screenshotCredit, 'new photos require context and attribution');
      await act(async()=>document.querySelector('.ad-guide-image').click());
      assert.equal(document.querySelector('dialog a').getAttribute('href'),step.screenshotSource??step.source??binding.guide.source);
      await act(async()=>document.querySelector('[aria-label="Close screenshot"]').click());
    }
    if(step.diagram) {
      const nodes=new Set(step.diagram.nodes.map(n=>n.id));
      assert.equal(nodes.size,step.diagram.nodes.length);
      for(const edge of step.diagram.edges)assert.ok(nodes.has(edge.from)&&nodes.has(edge.to));
    }
  }
  for(const mode of ['exam','mixed']) {
    await render({question:q,mode,answer:null});
    assert.equal(document.querySelector('.ad-visual-rail'),null,'exam hints stay hidden');
    await render({question:q,mode,answer:q.correct});
    assert.ok(document.querySelector('.ad-visual-rail'));
  }
}
assert.equal(getQuestionVisualGuide(question('az802-q-071')).startStep,'agent');
assert.equal(getQuestionVisualGuide(question('az802-q-095')).startStep,'agent');
console.log(`PASS hybrid walkthroughs: ${hybridBindings.length} exact question mappings; all steps rendered; source links, mobile collapse, image enlargement and exam gating verified.`);
await act(async () => root.unmount());
rmSync(scratch, { recursive: true, force: true });
console.log(`Local real screenshots: ${bindings.filter(q => getAdVisualGuide(q).guide.steps.some(step => step.imageReference)).length} question walkthroughs; ${new Set([...guides.values()].flatMap(g => g.steps.filter(s => s.imageReference).map(s => s.image))).size} unique images.`);
console.log(`PASS AD visual guide: ${bindings.length} explicit question bindings, ${guides.size} workflows, ${[...guides.values()].reduce((n,g)=>n+g.steps.length,0)} steps, ${new Set([...guides.values()].flatMap(g => g.steps.map(adStepImage)).filter(Boolean)).size} shared reference screenshots, per-question focus and exam gating, all steps rendered, mobile collapse, enlargement and image failure fallback.`);
