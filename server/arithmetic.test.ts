import {test} from 'node:test';import assert from 'node:assert/strict';import {calculateOperands as calc,type ArithmeticOperator} from './arithmetic.ts';
test('tool arguments compute exact integers, decimals and chained rational results',()=>{
 const cases:[string,ArithmeticOperator,string,string][]=[['6','add','7','13'],['0.1','add','0.2','0.3'],['-3','multiply','-4','12'],['6','subtract','-7','13'],['1','divide','8','0.125'],['1','divide','3','1/3'],['1/3','add','1/6','0.5'],['9007199254740993','add','1','9007199254740994'],['10','subtract','13','-3'],['0','divide','5','0']];
 for(const [a,op,b,expected]of cases)assert.equal(calc(a,op,b),expected);
});
test('zero division produces an explicit tool result, never Infinity',()=>{assert.equal(calc('3','divide','0'),'Division by zero is undefined.');assert.equal(calc('0','divide','0'),'Division by zero is undefined.');});
test('unsupported operands and operators cannot execute code or partial expressions',()=>{
 for(const value of ['2+2','Math.sin(2)','2;process.exit()','1e20','2 apples','(2)','1/0'])assert.throws(()=>calc(value,'add','1'));
 assert.throws(()=>calc('1','unsupported' as ArithmeticOperator,'2'));
});
test('tool operand lengths and decimal precision are bounded',()=>{assert.throws(()=>calc('1'.repeat(91),'add','1'));assert.throws(()=>calc('0.'+'1'.repeat(31),'add','1'));});
