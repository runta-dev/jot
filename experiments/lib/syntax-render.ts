import js from 'jsrealb';
import {assertComplete,type Tree} from './syntax-tree.ts';
js.loadEn();js.setExceptionOnWarning(true);const lex=js.getLexicon('en');
/** Realizes a complete research tree; deliberately does not certify semantics. */
export function renderTree(tree:Tree):string{
 assertComplete(tree);
 const compile=(t:Tree,objectCase=false):any=>{
  switch(t.kind){
   case 'hole':throw Error('Unfilled hole');
   case 'word':{const tag=t.sort==='noun'?'N':t.sort==='verb'?'V':'A';if(!lex[t.value]?.[tag])throw Error(`Unknown ${tag} lemma`);return tag==='N'?js.N(t.value):tag==='V'?js.V(t.value):js.A(t.value);}
   case 'name':if(!/^[A-Za-z][A-Za-z'-]*$/.test(t.value))throw Error('Invalid proper name');return js.Q(t.value);
   case 'pronoun':{if(objectCase)return js.Q({I:'me',you:'you',he:'him',she:'her',it:'it',we:'us',they:'them'}[t.value]);const pe=t.value==='I'||t.value==='we'?1:t.value==='you'?2:3;const n=['we','they'].includes(t.value)?'p':'s';const g=t.value==='she'?'f':t.value==='he'?'m':'n';return js.Pro('I').pe(pe).n(n).g(g);}
   case 'np':{
    if(t.noun.kind!=='word'||t.noun.sort!=='noun')throw Error('NP requires noun lemma');
    if(lex[t.noun.value]?.N?.cnt==='no'&&(t.plural||t.determiner==='a'))throw Error('Invalid mass-noun form');
    if(t.plural&&t.determiner==='a')throw Error('Indefinite plural');
    return js.NP(...(t.determiner==='none'?[]:[js.D(t.determiner)]),compile(t.noun)).n(t.plural?'p':'s');
   }
   case 'modified':return js.NP(compile(t.adjective),compile(t.head));
   case 'vp':if(t.verb.kind!=='word'||t.verb.sort!=='verb')throw Error('VP requires verb lemma');return js.VP(compile(t.verb),...(t.object?[compile(t.object,true)]:[]));
   case 'pp':return js.PP(js.P(t.preposition),compile(t.object,true));
   case 'attach':return compile(t.head).add(compile(t.modifier));
   case 'clause':return js.S(compile(t.subject),compile(t.predicate)).t(t.past?'ps':'p');
   case 'link':return js.S(compile(t.left),js.C(t.relation),compile(t.right));
  }
 };
 const result=compile(tree).realize().trim();
 if(result.includes('[['))throw Error('Invalid realization');return result;
}
