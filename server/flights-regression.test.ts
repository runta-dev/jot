import {test} from 'node:test';import assert from 'node:assert/strict';
import {checkFlights} from '../tests/browser-regressions/flights-oracle.ts';
import type {BrowserSnapshot,BrowserElement} from '@jot/browser';
const element=(name:string,role='combobox',value?:string):BrowserElement=>({id:name,name,role,value,actions:['click'],rect:{x:0,y:0,width:20,height:20},guard:''});
const valid=():BrowserSnapshot=>({id:'test',url:'https://www.google.com/travel/flights?tfs='+Buffer.from('2026-09-20').toString('base64url'),title:'Flights',text:'21 results returned. Prices include required taxes + fees for 1 adult. 4:45 PM – 5:35 PM 1 hr 50 min Nonstop $167',headings:[],elements:[element('One way'),element('Economy'),element('Where from? Zürich ZRH','combobox','Zürich'),element('Where to?','combobox','London'),element('Departure','textbox','Sun, Sep 20'),element('1 passenger, change number of passengers.','button')],scroll:{x:0,y:0,height:780,viewportHeight:780},viewport:{width:1120,height:780},observedAt:0});
test('flight oracle requires all requested settings and visible options',()=>{
 assert.ok(checkFlights(valid()).passed);
 for(const change of [
  (s:BrowserSnapshot)=>{s.text='0 results returned.';},
  (s:BrowserSnapshot)=>{s.url='https://www.google.com/travel/flights?tfs='+Buffer.from('2027-09-20').toString('base64url');},
  (s:BrowserSnapshot)=>{s.elements.find(e=>e.name==='Where to?')!.value='Paris';},
  (s:BrowserSnapshot)=>{s.elements=s.elements.filter(e=>e.name!=='One way');},
  (s:BrowserSnapshot)=>{s.elements=s.elements.filter(e=>e.name!=='Economy');},
  (s:BrowserSnapshot)=>{s.elements=s.elements.filter(e=>!e.name.startsWith('1 passenger'));},
 ]){const page=valid();change(page);assert.equal(checkFlights(page).passed,false);}
 assert.equal(checkFlights(undefined).passed,false);
});
