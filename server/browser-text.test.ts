import {test} from 'node:test';import assert from 'node:assert/strict';
import {browserTextCandidates} from './browser-text.ts';
test('long quoted and multiline payloads are available unchanged',()=>{
 const body='Line one has considerably more than six words and must remain complete.\n  Line two retains indentation, punctuation!';
 assert.ok(browserTextCandidates(`Fill Message with “${body}”.`).includes(body));
 const values=browserTextCandidates('Fill Body with:\n```text\n'+body+'\n```');
 assert.ok(values.includes(body+'\n'));
});
test('large instructions do not remove explicit payloads when span budget overflows',()=>{
 const instruction=Array.from({length:100},(_,i)=>`instruction${i}`).join(' ');
 assert.deepEqual(browserTextCandidates(instruction+' Enter "Full payload" in Message.'),['Full payload']);
});
test('short unquoted text stays selectable and empty quotes can clear a field',()=>{
 assert.ok(browserTextCandidates('Enter Ada in Name.').includes('Ada'));
 assert.ok(browserTextCandidates('Replace Message with "".').includes(''));
});
test('unquoted long text remains available whole without invented wording',()=>{
 const content=Array.from({length:100},(_,i)=>`word${i}`).join(' ');
 assert.deepEqual(browserTextCandidates(content),[content]);
});
