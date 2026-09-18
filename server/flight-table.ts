/** Deterministic flight-option table from observed page text. Not an action planner. */
const ROW=/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)\s+(.+?)\s+(\d+\s*hr(?:\s+\d+\s*min)?)\s+(Nonstop|\d+\s+stop(?:s)?)\s+((?:[$£€]\s*)\d+(?:,\d{3})?)/gi;
export function flightRows(text:string){
 const rows:{depart:string;arrive:string;airline:string;duration:string;stops:string;price:string}[]=[];
 const seen=new Set<string>();
 for(const match of text.replace(/\s+/g,' ').matchAll(ROW)){
  const depart=match[1],arrive=match[2],airline=match[3].replace(/\s+Operated by\s+/i,', operated by ').trim(),duration=match[4],stops=match[5],price=match[6].replace(/\s+/g,'');
  const key=[depart,arrive,airline,duration,stops,price].join('|');
  if(seen.has(key))continue;seen.add(key);
  rows.push({depart,arrive,airline,duration,stops,price});
 }
 return rows;
}
export function flightTable(text:string){
 const rows=flightRows(text);
 if(rows.length<2)return;
 const body=rows.map(r=>`| ${r.depart} | ${r.arrive} | ${r.airline} | ${r.duration} | ${r.stops} | ${r.price} |`).join('\n');
 return `| Depart | Arrive | Airline | Duration | Stops | Price |\n|---|---|---|---|---|---|\n${body}`;
}
