import {sourceSpans} from './source-spans.ts';
/** Exact source candidates only; quotation and fenced-block delimiters are not payload. */
export function browserTextCandidates(content:string):string[]{
 const literals=[...content.matchAll(/```[^\n]*\n([\s\S]*?)```|"([^"]*)"|“([^”]*)”|`([^`\n]+)`/g)].map(m=>m[1]??m[2]??m[3]??m[4]);
 const spans=sourceSpans([{role:'user',content}]);
 const explicit=[...new Set(literals)];
 const combined=[...new Set([...explicit,...(spans??[])])];
 if(combined.length<=254&&combined.reduce((n,s)=>n+s.length,0)<=16000&&combined.length)return combined;
 // Never drop a complete explicit payload in favor of its short word fragments.
 return explicit.length?explicit:[content];
}
