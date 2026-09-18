import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BrowserPool} from './pool.ts';

test('concurrent leases share a session; releasing one cannot evict another',async()=>{
 const pool=new BrowserPool(1);try{
  const [a,b]=await Promise.all([pool.acquire('same'),pool.acquire('same')]);
  assert.equal(a.session,b.session);a.release();a.release();
  await assert.rejects(pool.acquire('other'),/busy/);
  assert.equal(b.session.currentStatus.state,'idle');b.release();
  const c=await pool.acquire('other');assert.notEqual(c.session,b.session);
  assert.equal(b.session.currentStatus.state,'closed');c.release();
 }finally{await pool.close();}
});
test('idle eviction follows last use even within one clock tick',async()=>{
 const pool=new BrowserPool(2);try{
  const a=await pool.acquire('a');a.release();const b=await pool.acquire('b');b.release();
  const again=await pool.acquire('a');again.release();const c=await pool.acquire('c');
  assert.equal(a.session.currentStatus.state,'idle');assert.equal(b.session.currentStatus.state,'closed');c.release();
 }finally{await pool.close();}
});
test('closing rejects queued/new acquisition and closes active sessions exactly once',async()=>{
 const pool=new BrowserPool(2);const a=await pool.acquire('a');
 const pending=pool.acquire('b');const rejected=assert.rejects(pending,/closed/);
 const first=pool.close(),second=pool.close();assert.equal(first,second);
 await Promise.all([first,rejected]);assert.equal(a.session.currentStatus.state,'closed');
 await assert.rejects(pool.acquire('c'),/closed/);a.release();
});
test('invalid capacity is rejected before any browser starts',()=>{
 for(const capacity of [0,-1,1.5,NaN])assert.throws(()=>new BrowserPool(capacity),/capacity/);
});
test('manual sign-in remains protected after the panel releases its lease',async()=>{
 const pool=new BrowserPool(1);try{
  const lease=await pool.acquire('sign-in');
  Object.defineProperty(lease.session,'currentStatus',{get:()=>({state:'manual',url:'https://example.com/',title:'Sign in',loading:false})});
  lease.release();await assert.rejects(pool.acquire('another'),/Finish Chrome sign-in/);
 }finally{await pool.close();}
});

test('shared profile reuses one session across chats',async()=>{
 const pool=new BrowserPool(4,{sharedProfile:true});
 try{
  const a=await pool.acquire('chat-a');const b=await pool.acquire('chat-b');
  assert.equal(a.session,b.session);
  a.release();b.release();
 }finally{await pool.close();}
});
