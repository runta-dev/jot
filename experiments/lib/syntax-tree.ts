/** Research grammar substrate. No topic handlers, answers, or learned generator. */
export type Sort='clause'|'np'|'vp'|'pp'|'noun'|'verb'|'adjective';
export type Tree={kind:'hole';sort:Sort}|{kind:'word';sort:'noun'|'verb'|'adjective';value:string}|{kind:'pronoun';value:'I'|'you'|'he'|'she'|'it'|'we'|'they'}|{kind:'name';value:string}|{kind:'np';determiner:'the'|'a'|'none';plural:boolean;noun:Tree}|{kind:'modified';adjective:Tree;head:Tree}|{kind:'vp';verb:Tree;object?:Tree}|{kind:'pp';preposition:string;object:Tree}|{kind:'attach';head:Tree;modifier:Tree}|{kind:'clause';subject:Tree;predicate:Tree;past:boolean}|{kind:'link';relation:'because'|'but'|'and';left:Tree;right:Tree};
export const hole=(sort:Sort):Tree=>({kind:'hole',sort});
export type Action={label:string;replacement:Tree};
export function sortOf(t:Tree):Sort{
 if(t.kind==='hole'||t.kind==='word')return t.sort;
 if(t.kind==='pronoun'||t.kind==='name'||t.kind==='np'||t.kind==='modified')return 'np';
 if(t.kind==='attach')return sortOf(t.head);
 if(t.kind==='link'||t.kind==='clause')return 'clause';
 return t.kind;
}
export function children(t:Tree):[string,Tree][]{return Object.entries(t).filter(([,v])=>v&&typeof v==='object'&&'kind' in v) as [string,Tree][];}
export function frontier(t:Tree,path:string[]=[]):{path:string[];sort:Sort}[]{return t.kind==='hole'?[{path,sort:t.sort}]:children(t).flatMap(([k,v])=>frontier(v,[...path,k]));}
export function expand(tree:Tree,path:string[],replacement:Tree):Tree{
 if(!path.length){if(tree.kind!=='hole')throw Error('Expansion target must be a hole');if(sortOf(replacement)!==tree.sort)throw Error('Grammar sort mismatch');return structuredClone(replacement);}
 const [key,...rest]=path;const child=children(tree).find(([k])=>k===key);if(!child)throw Error('Invalid tree path');return {...tree,[key]:expand(child[1],rest,replacement)} as Tree;
}
export function structures(sort:Sort):Action[]{
 const act=(label:string,replacement:Tree)=>({label,replacement});
 if(sort==='clause')return [false,true].map(past=>act(past?'past-tense clause':'present-tense clause',{kind:'clause',subject:hole('np'),predicate:hole('vp'),past})).concat(['because','but','and'].map(relation=>act(`two clauses related by ${relation}`,{kind:'link',relation:relation as 'because'|'but'|'and',left:hole('clause'),right:hole('clause')})));
 if(sort==='np')return [false,true].flatMap(plural=>(['the','a','none'] as const).filter(d=>!plural||d!=='a').map(determiner=>act(`${determiner} ${plural?'plural':'singular'} noun`,{kind:'np',determiner,plural,noun:hole('noun')}))).concat((['I','you','he','she','it','we','they'] as const).map(value=>act(value,{kind:'pronoun',value})),[act('adjective modifying noun phrase',{kind:'modified',adjective:hole('adjective'),head:hole('np')})]);
 if(sort==='vp')return [act('intransitive verb phrase',{kind:'vp',verb:hole('verb')}),act('verb with object',{kind:'vp',verb:hole('verb'),object:hole('np')}),act('verb phrase with prepositional modifier',{kind:'attach',head:hole('vp'),modifier:hole('pp')})];
 if(sort==='pp')return ['in','on','at','from','to','with','for','by'].map(preposition=>act(preposition,{kind:'pp',preposition,object:hole('np')}));
 return [];
}
export function lexical(sort:Sort,values:string[]):Action[]{if(!['noun','verb','adjective'].includes(sort))throw Error('Expected lexical hole');return [...new Set(values)].filter(v=>/^[A-Za-z][A-Za-z'-]*$/.test(v)).map(value=>({label:value,replacement:{kind:'word',sort:sort as 'noun'|'verb'|'adjective',value}}));}
export function assertComplete(tree:Tree){if(frontier(tree).length)throw Error('Cannot emit incomplete tree');}
export function budgetActions(tree:Tree,path:string[],actions:Action[],maxNodes=60):Action[]{
 const size=(t:Tree):number=>1+children(t).reduce((sum,[,v])=>sum+size(v),0);
 return actions.filter(a=>size(expand(tree,path,a.replacement))<=maxNodes);
}
