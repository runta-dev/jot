import type {VerbSense} from './wordnet.ts';
/** WordNet frame evidence, not a complete English grammar or semantic validator. */
export type Shape='bare'|'direct-object';
export function frameEvidence(sense:VerbSense,shape:Shape){
 const compatible=shape==='bare'?[1,2,23]:[8,9,10,11];
 const frames=sense.frames.filter(f=>compatible.includes(f));
 return {status:frames.length?'supported':'unverified',frames,sense:sense.offset} as const;
}
export function supportedSenses(senses:VerbSense[],shape:Shape){return senses.filter(s=>frameEvidence(s,shape).status==='supported');}
