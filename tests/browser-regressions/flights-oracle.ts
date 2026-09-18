import type {BrowserSnapshot} from '@jot/browser';
/** Site-specific acceptance checks, never navigation/actions or query construction. */
export function checkFlights(snapshot:BrowserSnapshot|undefined){
 const controls=[...(snapshot?.fields??[]),...(snapshot?.elements??[])],text=snapshot?.text??'';
 const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const field=(name:string)=>controls.find(e=>e.name.startsWith(name));
 let encodedDate='';try{const tfs=new URL(snapshot!.url).searchParams.get('tfs');if(tfs)encodedDate=Buffer.from(tfs,'base64url').toString('utf8');}catch{}
 const checks={
  flightsPage:!!snapshot&&/^https:\/\/www\.google\.com\/travel\/flights/.test(snapshot.url),
  oneWay:controls.some(e=>e.role==='combobox'&&/^one way$/i.test(e.name)),
  origin:/zurich|\bzrh\b/.test(normalize((field('Where from?')?.value??'')+' '+(field('Where from?')?.name??''))),
  destination:/\blondon\b/i.test(field('Where to?')?.value??''),
  date:encodedDate.includes('2026-09-20')&&/Sep\s+20/i.test(field('Departure')?.value??''),
  oneAdult:controls.some(e=>/^1 passenger,/.test(e.name))&&/fees for 1 adult/i.test(snapshot?.pageText??text),
  economy:controls.some(e=>e.role==='combobox'&&/^economy$/i.test(e.name)),
  visibleOptions:! /\b0 results returned/i.test(text)&&/results returned|Other flights|Nonstop/i.test(text)&&/\d+:\d{2}\s*[AP]M/.test(text)&&/\d+ hr/.test(text)&&/[$£€]\s*\d/.test(text),
 };
 return {passed:Object.values(checks).every(Boolean),checks};
}
