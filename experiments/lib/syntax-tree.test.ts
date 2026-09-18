import {test} from 'node:test';import assert from 'node:assert/strict';
import {hole,expand,frontier,structures,lexical,assertComplete,budgetActions,type Tree} from './syntax-tree.ts';
test('sequential expansions preserve bound roles and never mutate earlier state',()=>{
 const initial=hole('clause');const clause=expand(initial,[],structures('clause')[0].replacement);
 const subject=expand(clause,['subject'],{kind:'pronoun',value:'she'});
 const predicate=expand(subject,['predicate'],structures('vp')[1].replacement);
 const verb=expand(predicate,['predicate','verb'],lexical('verb',['find'])[0].replacement);
 assert.deepEqual(initial,hole('clause'));assert.equal((verb as any).subject.value,'she');assert.deepEqual(frontier(verb),[{path:['predicate','object'],sort:'np'}]);
 assert.throws(()=>assertComplete(verb),/incomplete/);
 const complete=expand(verb,['predicate','object'],{kind:'name',value:'Mivora'});assert.doesNotThrow(()=>assertComplete(complete));
});
test('wrong types and replacement of already committed nodes fail',()=>{
 assert.throws(()=>expand(hole('np'),[],{kind:'word',sort:'verb',value:'go'}),/mismatch/);
 assert.throws(()=>expand({kind:'pronoun',value:'it'},[],hole('np')),/hole/);
});
test('compound clauses retain unresolved subjects and cannot prematurely finish',()=>{
 const linked:Tree={kind:'link',relation:'because',left:hole('clause'),right:hole('clause')};
 assert.equal(frontier(linked).length,2);assert.throws(()=>assertComplete(linked));
 assert.equal(budgetActions(hole('clause'),[],structures('clause'),1).length,0);
});
test('lexical candidates are external data, not executable grammar nodes',()=>{
 assert.deepEqual(lexical('noun',['bird','bird','<END>','two words']).map(a=>a.label),['bird']);
 assert.throws(()=>lexical('clause',['bird']));
});
