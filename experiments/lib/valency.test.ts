import {test} from 'node:test';import assert from 'node:assert/strict';
import {frameEvidence,supportedSenses} from './valency.ts';import {verbSenses,type VerbSense} from './wordnet.ts';
const sense=(offset:string,frames:number[]):VerbSense=>({offset,frames,lemmas:['x'],definition:'fixture',examples:[],lexFile:0});
test('direct object frames exclude required additional complements',()=>{
 for(const f of [8,9,10,11])assert.equal(frameEvidence(sense('x',[f]),'direct-object').status,'supported');
 for(const f of [5,14,15,16,17,18,19,20,21,24,25])assert.equal(frameEvidence(sense('x',[f]),'direct-object').status,'unverified');
});
test('bare frames do not inherit support from a different sense',()=>{
 const a=sense('a',[1]),b=sense('b',[8]);assert.deepEqual(supportedSenses([a,b],'bare').map(s=>s.offset),['a']);assert.equal(frameEvidence(b,'bare').status,'unverified');
 assert.equal(frameEvidence(sense('unknown',[]),'bare').status,'unverified');
});
test('real dictionary exposes distinct verb-sense evidence',async()=>{
 const all=await verbSenses();assert.ok(supportedSenses(all.get('sleep')??[],'bare').length);assert.ok(supportedSenses(all.get('find')??[],'direct-object').length);
 assert.ok((all.get('put')??[]).some(s=>s.frames.includes(21)));
});
