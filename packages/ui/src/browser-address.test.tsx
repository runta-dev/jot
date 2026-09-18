import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserAddress} from './browser-address';
test('address bar opens web addresses and local development URLs', () => {
 for (const [input, expected] of [
  ['example.com', 'https://example.com/'],
  ['https://example.com/a?q=x', 'https://example.com/a?q=x'],
  ['localhost:3000', 'https://localhost:3000/'],
  ['http://127.0.0.1:8080', 'http://127.0.0.1:8080/'],
  ['[::1]:3000', 'https://[::1]:3000/'],
  ['https://intranet', 'https://intranet/'],
 ]) assert.equal(browserAddress(input), expected);
});
test('ordinary text and invalid URLs become encoded Google searches', () => {
 for (const input of ['jew', 'Jev model', '你好 世界', 'what is example.com', 'https://', 'javascript:alert(1)', 'a&b #c']) {
  assert.equal(browserAddress(input), 'https://www.google.com/search?q=' + encodeURIComponent(input));
 }
 assert.equal(browserAddress('  hello  '), 'https://www.google.com/search?q=hello');
 assert.equal(browserAddress('  '), '');
});
