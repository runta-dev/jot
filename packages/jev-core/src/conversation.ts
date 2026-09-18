export type Message={role:'user'|'assistant';content:string};
export type CharacterChoice={choice:string;confidence:number;alternatives:{char:string;probability:number}[]};
