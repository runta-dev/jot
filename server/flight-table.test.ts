import {test} from 'node:test';import assert from 'node:assert/strict';
import {flightRows,flightTable} from './flight-table.ts';
const sample=`Sign in
Search results
Best
Cheapest from $134
7:40 AM
–
8:35 AM
British Airways
1 hr 55 min
Nonstop
$178
4:45 PM
–
5:35 PM
easyJet
1 hr 50 min
Nonstop
$188
8:25 PM
–
9:00 PM
British Airways
Operated by BA Cityflyer
1 hr 35 min
Nonstop
$263
1:20 PM
–
2:20 PM
British Airways
2 hr
Nonstop
$269`;
test('flight table is assembled from observed option text, not guessed',()=>{
 const rows=flightRows(sample);
 assert.equal(rows.length,4);
 assert.equal(rows[0].airline,'British Airways');
 assert.equal(rows[1].price,'$188');
 assert.match(rows[2].airline,/operated by BA Cityflyer/i);
 const table=flightTable(sample)!;
 assert.match(table,/^\| Depart \| Arrive \| Airline \| Duration \| Stops \| Price \|/m);
 assert.match(table,/1:20 PM/);
 assert.doesNotMatch(table,/Sign in/);
});
test('unrelated page text does not invent a flight table',()=>{
 assert.equal(flightTable('The weather in Zurich is cloudy.'),undefined);
});
