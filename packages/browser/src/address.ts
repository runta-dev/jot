/** Resolve omnibox text without guessing a hostname for ordinary search terms. */
export function browserAddress(input: string): string {
 const text = input.trim();
 const search = () => `https://www.google.com/search?q=${encodeURIComponent(text)}`;
 if (!text) return '';
 const explicit = /^https?:\/\//i.test(text);
 if (!explicit && /\s/.test(text)) return search();
 try {
  const url = new URL(explicit ? text : `https://${text}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return search();
  const host = url.hostname;
  const domain = host.includes('.') && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
  const local = host === 'localhost' || host.endsWith('.localhost') || host.startsWith('[');
  return explicit || domain || local ? url.href : search();
 } catch { return search(); }
}
