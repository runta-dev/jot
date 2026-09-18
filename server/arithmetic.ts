/** Exact rational arithmetic for fully matched, simple calculation requests. No eval. */
type Rational={n:bigint;d:bigint};
const gcd=(a:bigint,b:bigint):bigint=>b===0n?(a<0n?-a:a):gcd(b,a%b);
function reduce(n:bigint,d:bigint):Rational{if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
function number(text:string):Rational{const sign=text.startsWith('-')?-1n:1n;const [whole,decimal='']=text.replace(/^[+-]/,'').split('.');return reduce(sign*BigInt(whole+decimal),10n**BigInt(decimal.length));}
function format({n,d}:Rational):string{
 if(d===1n)return n.toString();let remaining=d;while(remaining%2n===0n)remaining/=2n;while(remaining%5n===0n)remaining/=5n;
 if(remaining!==1n)return `${n}/${d}`;
 const negative=n<0n;if(negative)n=-n;const whole=n/d;let rest=n%d,decimal='';
 while(rest){rest*=10n;decimal+=(rest/d).toString();rest%=d;}
 return `${negative?'-':''}${whole}.${decimal}`;
}
export type ArithmeticOperator='add'|'subtract'|'multiply'|'divide';
function operand(text:string):Rational{
 if(!/^[+-]?\d{1,90}(?:\.\d{1,30})?(?:\/[+-]?\d{1,90})?$/.test(text))throw Error('Unsupported numeric operand.');
 const [left,right]=text.split('/');const value=number(left);
 if(right!==undefined){const denominator=BigInt(right);if(!denominator)throw Error('Zero denominator.');return reduce(value.n,value.d*denominator);}return value;
}
export function calculateOperands(left:string,operator:ArithmeticOperator,right:string):string{
 const a=operand(left),b=operand(right);let result:Rational;
 switch(operator){
  case 'add':result=reduce(a.n*b.d+b.n*a.d,a.d*b.d);break;
  case 'subtract':result=reduce(a.n*b.d-b.n*a.d,a.d*b.d);break;
  case 'multiply':result=reduce(a.n*b.n,a.d*b.d);break;
  case 'divide':if(!b.n)return 'Division by zero is undefined.';result=reduce(a.n*b.d,a.d*b.n);break;
  default:throw Error('Unsupported arithmetic operator.');
 }return format(result);
}
export function calculateExactRequest(text:string):{expression:string;answer:string}|null{
 if(text.length>240)return null;
 const numeric='[+-]?\\d{1,30}(?:\\.\\d{1,12})?';
 const pattern=new RegExp(`^(?:(?:please\\s+)?(?:what is|what's|calculate|compute)\\s+)?(${numeric})\\s*(plus|minus|times|multiplied by|divided by|[+*/×÷−-])\\s*(${numeric})[?.!]?\\s*(?:reply with (?:only )?(?:the )?result[.!]?)?$`,'i');
 const match=text.trim().match(pattern);if(!match)return null;
 const [,left,op,right]=match;
 const operator:ArithmeticOperator=['+','plus'].includes(op.toLowerCase())?'add':['-','−','minus'].includes(op.toLowerCase())?'subtract':['*','×','times','multiplied by'].includes(op.toLowerCase())?'multiply':'divide';
 return {expression:`${left} ${op} ${right}`,answer:calculateOperands(left,operator,right)};
}
