import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readQuestionBank, EXPECTED_QUESTION_COUNT} from './question-bank-meta.mjs';

const {questions:sourceQuestions}=readQuestionBank();
const require=createRequire(import.meta.url);
const {build}=require('esbuild');
const bundled=await build({stdin:{contents:'export {questions} from "./lib/course-data"; export {trainingStages} from "./lib/content/training"; export {createKnowledgeSearch} from "./lib/knowledge-search";',resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {questions,trainingStages,createKnowledgeSearch}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
assert.equal(questions.length,EXPECTED_QUESTION_COUNT);
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
assert.equal(new Set(questions.map(q=>q.text.toLowerCase().replace(/\W+/g,' ').trim())).size,questions.length);
assert.ok(sourceQuestions.every(q=>!/Die technischen Details stehen|passt zum Bereich/.test(q.rationale.de)), 'No generic German explanations');

const expectedAnswers={
 '411':/RFC 1918/, '412':/default gateway/, '413':/longest matching prefix/,
 '414':/Source 192\.168\.10\.20:445/, '415':/PAT/, '416':/NAT translates/,
 '417':/SNAT.*DNAT/, '418':/not authenticated user identity/, '419':/TCP 445/,
 '420':/outer IP/, '421':/return route/, '422':/Split tunneling/, '423':/Patch/,
 '424':/Point-to-Site/, '425':/client certificate.*private key/,
 '426':/identity.*group membership.*permissions/, '427':/describes a link/,
 '428':/each branch/, '429':/Redundant branch/, '430':/pre-shared key/,
 '431':/does not automatically encrypt/, '432':/provider connectivity/,
 '433':/symmetric session keys/, '434':/private key.*public key/,
 '435':/replace both/, '436':/certificate chain/, '437':/security associations/,
 '438':/that application connection/, '439':/IP addresses.*sizes.*timing/,
 '440':/VPN exit public IP/, '441':/end-to-end TLS remains encrypted/,
};
const search=createKnowledgeSearch(questions);
for(const [number,answer] of Object.entries(expectedAnswers)) {
 const q=questions.find(q=>q.id===`az802-q-${number}`);
 assert.ok(q,`Missing authored topic ${number}`);
 assert.match(q.options[q.correct],answer);
 assert.ok(q.whyOthers.every((reason,index)=>index===q.correct?reason==='':reason.length>=12));
 assert.ok(q.sourceRefs.length && q.keyPoints.length>=2);
 assert.equal(q.translations,'runtime-google');
 assert.equal(q.audit.translationVerified,false,'Machine translation must not pretend to be human-reviewed');
 assert.match(q.rationale.fa,/[\u0600-\u06ff]/);
 assert.notEqual(q.rationale.de,q.rationale.en);
 assert.ok(q.rationale.de.length>40);
 assert.equal(trainingStages.filter(stage=>stage.questionIds.includes(q.id)).length,1,`Exactly one training stage for ${q.id}`);
 const found=search.search(q.text);
 assert.equal(found.best?.item.id,q.id,`Question is reachable through search: ${q.id}`);
}
console.log(JSON.stringify({status:'pass',questions:questions.length,newScenarios:Object.keys(expectedAnswers).length,genericGerman:0,trainingAndSearch:'pass'}));
