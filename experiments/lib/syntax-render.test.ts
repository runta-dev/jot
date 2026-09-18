import {test} from 'node:test';import assert from 'node:assert/strict';
import {renderTree} from './syntax-render.ts';import {hole,type Tree} from './syntax-tree.ts';
const word=(sort:'noun'|'verb',value:string):Tree=>({kind:'word',sort,value});
const np=(value:string,plural=false,determiner:'the'|'a'|'none'='the'):Tree=>({kind:'np',noun:word('noun',value),plural,determiner});
const clause=(subject:Tree,verb:string,object?:Tree,past=false):Tree=>({kind:'clause',subject,predicate:{kind:'vp',verb:word('verb',verb),...(object?{object}:{})},past});
test('realizes subject agreement and past tense from structure',()=>{
 assert.equal(renderTree(clause(np('bird'),'fly')),'The bird flies.');
 assert.equal(renderTree(clause(np('bird',true),'fly')),'The birds fly.');
 assert.equal(renderTree(clause({kind:'pronoun',value:'she'},'find',np('key'),true)),'She found the key.');
});
test('pronoun grammatical case derives from position',()=>{
 assert.equal(renderTree(clause({kind:'pronoun',value:'she'},'see',{kind:'pronoun',value:'he'})),'She sees him.');
});
test('blocks unfinished, unknown and invalid mass-noun constructions',()=>{
 assert.throws(()=>renderTree(hole('clause')),/incomplete/);
 assert.throws(()=>renderTree(clause(np('information',true),'flow')),/mass/);
 assert.throws(()=>renderTree(clause(np('information',false,'a'),'flow')),/mass/);
 assert.throws(()=>renderTree(clause(np('zzunknown'),'fly')),/Unknown/);
});
test('proper names survive unchanged and clauses can carry modifiers',()=>{
 const t=clause({kind:'name',value:'Mivora'},'move');
 (t as any).predicate={kind:'attach',head:(t as any).predicate,modifier:{kind:'pp',preposition:'to',object:np('house')}};
 assert.equal(renderTree(t),'Mivora moves to the house.');
});
