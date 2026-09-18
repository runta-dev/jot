import {readFile} from 'node:fs/promises';
import {makeEvaluator,type Evaluate,type ChoiceQuestion,type EvaluationRequest} from './typesafe.ts';
import type {Message} from './jev.ts';
export type Property = {id:string;aliases:string[];definition:string;uri?:string};
export type ComparisonResult = {text:string;status:'complete'|'unknown'|'missing_entities'|'unsupported';target?:string;reference?:string;property?:string;propertyId?:string;direction?:string;requests:number;inputTokens:number;outputTokens:number};
export type ComparisonEvent = {type:'comparison_progress';stage:string;requests:number;choice?:string};
let bankPromise:Promise<Property[]>|undefined;
export function loadComparisonCatalog(){
 return bankPromise??=readFile(new URL('./data/comparison-catalog.json',import.meta.url),'utf8').then(text=>JSON.parse(text).properties as Property[]);
}
export function entitySpans(text:string){
 const spans=new Set<string>();
 for(const sentence of text.split(/[?!.;]/)){const words=sentence.trim().split(/\s+/).filter(Boolean);for(let n=1;n<=4;n++)for(let i=0;i+n<=words.length;i++)spans.add(words.slice(i,i+n).join(' '));}
 return [...spans];
}
export function explicitProperties(question:string,bank:Property[]){
 const generic=new Set(['property','quantity','measure','value','attribute','quality','amount','kind','number','dimension','ratio','unit']);const q=question.toLowerCase();
 return bank.filter(p=>p.aliases.some(alias=>{const name=alias.toLowerCase();if(generic.has(name))return false;let at=q.indexOf(name);while(at>=0){const before=q.slice(0,at),after=q.slice(at+name.length);if((!before||!/[a-z]$/.test(before))&&(!after||!/^\p{L}/u.test(after))&&(/(?:\bin|\bregarding|\bhigher|\blower|\bgreater|\bless|\bsame)\s+$/.test(before)||/^\s+of\b/.test(after)))return true;at=q.indexOf(name,at+1);}return false;}));
}
const choice=(instructions:string,criteria:Record<string,string|null>):ChoiceQuestion=>({type:'choice',instructions,criteria});
export async function compareMessage(key:string,messages:Message[],signal:AbortSignal,emit:(event:ComparisonEvent)=>void,options:{evaluate?:Evaluate;bank?:Property[]}={}):Promise<ComparisonResult>{
 signal.throwIfAborted();const question=messages.at(-1)!.content;let requests=0,inputTokens=0,outputTokens=0;
 const evaluate=options.evaluate??makeEvaluator(key,()=>{requests++;});
 const result=(text:string,status:ComparisonResult['status'],extra:Partial<ComparisonResult>={}):ComparisonResult=>({text,status,requests,inputTokens,outputTokens,...extra});
 const spans=entitySpans(question);if(spans.length>254)return result('Please ask a shorter comparison question.','unsupported');
 async function ask(stage:string,state:unknown,questions:Record<string,ChoiceQuestion>){
  signal.throwIfAborted();emit({type:'comparison_progress',stage,requests});if(options.evaluate)requests++;
  const request:EvaluationRequest={model:'jev-latest',state,questions};const data=await evaluate(request,signal);signal.throwIfAborted();inputTokens+=data.usage?.input_tokens||0;outputTokens+=data.usage?.output_tokens||0;return data.answers;
 }
 const entities=await ask('Identifying entities',{user_question:question,conversation:messages},{
  target:choice('Select the first whole entity whose property should be compared. Keep necessary modifiers. Select MISSING if it is not identifiable; do not treat the property itself as an entity.',{...Object.fromEntries(spans.map((s,i)=>['e'+i,s])),MISSING:'A target entity is not identifiable.'}),
  reference:choice('Select the second/reference entity against which the target is compared. Select MISSING if no second entity is identifiable. Do not invent a comparator or use the property itself.',{...Object.fromEntries(spans.map((s,i)=>['e'+i,s])),MISSING:'A second entity is not identifiable.'}),
 });
 if(entities.target.choice==='MISSING'||entities.reference.choice==='MISSING')return result('Please name the two things you want to compare.','missing_entities');
 const target=spans[Number(entities.target.choice.slice(1))],reference=spans[Number(entities.reference.choice.slice(1))];
 if(!target||!reference)throw new Error('TypeSafe returned an invalid entity.');
 if(target.toLowerCase()===reference.toLowerCase())return result('Please give two distinct entity descriptions for this comparison.','missing_entities');
 const bank=options.bank??await loadComparisonCatalog();signal.throwIfAborted();const explicit=explicitProperties(question,bank),searchBank=explicit.length?explicit:bank;
 const state={user_question:question,entities:{target,reference},task:'Identify a scalar/ordered property whose comparison answers or explains this question. Candidate definitions describe properties, not facts about these particular entities.'};
 const finalists=new Map<string,Property>();
 if(searchBank.length<=254){for(const p of searchBank)finalists.set(p.id,p);}else{
  const groups:Property[][]=[];for(let i=0;i<searchBank.length;i+=64)groups.push(searchBank.slice(i,i+64));
  for(let i=0;i<groups.length;i+=12){
   const chunk=groups.slice(i,i+12);const answers=await ask('Selecting property candidates',state,Object.fromEntries(chunk.map((items,j)=>['g'+j,choice('Select the most relevant ordered property in this set for comparing these entities in the user question. Prefer an actual property rather than the observed outcome itself.',Object.fromEntries(items.map(p=>[p.id,p.aliases.join(' / ')+': '+p.definition])))])));
   chunk.forEach((items,j)=>{for(const [id]of Object.entries(answers['g'+j].probabilities).sort((a,b)=>b[1]-a[1]).slice(0,2)){const p=items.find(x=>x.id===id);if(p)finalists.set(id,p);}});
  }
 }
 if(finalists.size>254)throw new Error('Comparison candidate budget exceeded.');
 const picked=await ask('Choosing property',state,{property:choice('Which available scalar property best answers the comparison question? Choose NONE if no meaningful ordered comparison can be made.',{...Object.fromEntries([...finalists].map(([id,p])=>[id,p.aliases.join(' / ')+': '+p.definition])),NONE:'No appropriate scalar comparison property.'})});
 const property=finalists.get(picked.property.choice);if(!property)return result('Insufficient information for this comparison.','unknown',{target,reference});
 emit({type:'comparison_progress',stage:'Comparing',requests,choice:property.aliases[0]});
 const answers=await ask('Comparing', {user_question:question,entities:{target,reference},property},{
  direction:choice('Under ordinary conditions, how does the target compare with the reference on this property? Use reliable knowledge or supplied measurements. Do not infer a direction for unspecified or fictional materials, and do not merely agree with a suggested premise.',{lower:'Target has a lower value than reference.',equal:'Values are equal for the comparison.',higher:'Target has a higher value than reference.',unknown:'Insufficient knowledge or data; no reliable direction.'}),
  term:choice('Choose the most natural property name for an English quantitative comparison.',Object.fromEntries(property.aliases.map((word,i)=>['t'+i,word]))),
 });
 const term=property.aliases[Number(answers.term.choice.slice(1))];if(!term)throw new Error('TypeSafe returned an invalid property label.');
 const direction=answers.direction.choice;const extra={target,reference,property:term,propertyId:property.id,direction};
 if(direction==='unknown')return result('Insufficient information for this comparison.','unknown',extra);
 return result(`The ${term.charAt(0).toLowerCase()+term.slice(1)} of ${target} is ${direction==='equal'?'equal to':direction+' than'} that of ${reference}.`,'complete',extra);
}
