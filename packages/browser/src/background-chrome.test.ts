import {test} from 'node:test';import assert from 'node:assert/strict';
import {cdpUrlFromPortFile,chromeApp} from './background-chrome.ts';
test('DevToolsActivePort maps to a loopback CDP URL',()=>{
 assert.equal(cdpUrlFromPortFile('9222\n/devtools/browser/abc\n'),'http://127.0.0.1:9222');
 assert.throws(()=>cdpUrlFromPortFile('not-a-port'),/invalid/);
});
test('Chrome.app path is derived from the macOS binary',()=>{
 assert.equal(chromeApp('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),'/Applications/Google Chrome.app');
});
