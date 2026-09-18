import { setTimeout as delay } from 'node:timers/promises';
export type ChoiceQuestion = {type:'choice';instructions:string;criteria:Record<string,string|null>};
export type NoulQuestion = {type:'noul';instructions:string;criteria?:{true?:string;false?:string}};
export type Question = ChoiceQuestion|NoulQuestion;
export type EvaluationRequest = {model:string;state:unknown;questions:Record<string,Question>};
export type ChoiceAnswer = {type:'choice';choice:string;confidence:number;probabilities:Record<string,number>};
export type NoulAnswer = {type:'noul';noul:number};
export type Answer = ChoiceAnswer|NoulAnswer;
export type Evaluation = {model:string;answers:Record<string,Answer>;usage?:{input_tokens:number;output_tokens:number}};
export type Evaluate = (request:EvaluationRequest,signal:AbortSignal)=>Promise<Evaluation>;
export function makeEvaluator(key:string, onAttempt:()=>void = ()=>{}, fetcher:typeof fetch=fetch):Evaluate {
 return async(request,signal)=>{
  for(let attempt=0;attempt<3;attempt++){
   signal.throwIfAborted();onAttempt();
   const response=await fetcher('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
   if([429,529,502,503].includes(response.status)&&attempt<2){const retry=Number(response.headers.get('retry-after'));await response.body?.cancel();await delay(Number.isFinite(retry)&&retry>0?retry*1000:500*2**attempt,undefined,{signal});continue;}
   if(!response.ok){await response.body?.cancel();throw new Error(response.status===401?'The TypeSafe API key was rejected.':`TypeSafe returned ${response.status}. Please try again.`);}
   const data=await response.json();signal.throwIfAborted();
   for(const [id,q]of Object.entries(request.questions)){
    const a=data.answers?.[id];
    if(q.type==='noul'){
     if(a?.type!=='noul'||!Number.isFinite(a.noul)||a.noul<0||a.noul>1)throw new Error('TypeSafe returned an invalid noul.');
     continue;
    }
    if(a?.type!=='choice'||typeof a.choice!=='string'||!Object.hasOwn(q.criteria,a.choice)||!Number.isFinite(a.confidence)||a.confidence<0||a.confidence>1)throw new Error('TypeSafe returned an invalid choice.');
    for(const option of Object.keys(q.criteria)){const p=a.probabilities?.[option];if(!Number.isFinite(p)||p<0||p>1)throw new Error('TypeSafe returned an invalid probability distribution.');}
   }
   return data as Evaluation;
  }
  throw new Error('TypeSafe did not complete the request.');
 };
}
