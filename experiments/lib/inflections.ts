import js from 'jsrealb';
js.loadEn();
js.setExceptionOnWarning(true);
const lex=js.getLexicon('en');
/** Deterministic proposals only; no contextual choice or spelling of unknown names. */
export function inflections(word:string):string[]{
 const out=new Set([word]);
 if(!/^[a-z]+$/.test(word))return [...out];
 const add=(fn:()=>any)=>{try{const value=fn().realize().trim();if(/^[a-z]+$/.test(value))out.add(value);}catch{/* unsupported forms retain original */}};
 if(lex[word]?.V){
  for(const tense of ['b','p','ps','pp','pr'])for(const person of [1,2,3])for(const number of ['s','p'])add(()=>js.V(word).t(tense).pe(person).n(number));
 }
 if(lex[word]?.N && lex[word].N.cnt!=='no')add(()=>js.N(word).n('p'));
 return [...out];
}
