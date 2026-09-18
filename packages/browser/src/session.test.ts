import {test} from 'node:test';import assert from 'node:assert/strict';import {navigationURL} from './session.ts';
test('browser navigation accepts web URLs, not code/local files/embedded credentials',()=>{
 assert.equal(navigationURL('https://example.com'),'https://example.com/');
 for(const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,test','https://user:password@example.com','chrome://settings'])assert.throws(()=>navigationURL(url));
});
