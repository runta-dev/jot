import {test} from 'node:test';import assert from 'node:assert/strict';import {calculateExactRequest as calc} from './arithmetic.ts';
test('exact arithmetic covers signed integers, decimals and rational division',()=>{
 for(const [input,expected]of [['What is 6 plus 7? Reply with the result.','13'],['0.1 + 0.2','0.3'],['-3 times -4','12'],['6--7','13'],['1 divided by 8','0.125'],['1/3','1/3'],['9007199254740993 + 1','9007199254740994'],['10 − 13','-3'],['0/5','0'],['Please calculate 8 × 7.','56']])assert.equal(calc(input)?.answer,expected);
});
test('zero division is explicit, never Infinity or a model guess',()=>{assert.equal(calc('3/0')?.answer,'Division by zero is undefined.');assert.equal(calc('0/0')?.answer,'Division by zero is undefined.');});
test('rejects partial matches, quoting, code and unsupported requirements',()=>{
 for(const input of ['Do not calculate 2+2','What is 2+2? Explain why.','"2+2"','2+2 in French','2+2*3','Math.sin(2)','2;process.exit()','1e20 + 1','2 + unknown','(2+3)*4','2+2 = 4','Tell me a story about 2+2'])assert.equal(calc(input),null,input);
});
test('bounded grammar excludes unbounded numbers',()=>{assert.equal(calc('1'.repeat(31)+'+1'),null);assert.equal(calc('0.'+'1'.repeat(13)+'+1'),null);});
