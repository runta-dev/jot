declare module 'jsrealb' {
 interface Form {realize():string;t(tense:string):Form;pe(person:number):Form;n(number:string):Form;}
 const js:{loadEn():void;setExceptionOnWarning(value:boolean):void;getLexicon(lang:string):Record<string,{V?:unknown;N?:{cnt?:string}}>;V(word:string):Form;N(word:string):Form};
 export default js;
}
