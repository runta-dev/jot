import {readdir,readFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
const rules={agent:new Set(),browser:new Set(['patchright']), 'jev-core':new Set(['jsrealb']),ui:new Set(['react','react-dom/client','lucide-react','@jot/agent','@jot/browser/types'])};
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(resolve(dir,e.name)):resolve(dir,e.name)))).flat();}
for(const [name,allowed] of Object.entries(rules)){
 const root=resolve('packages',name);
 for(const file of await files(resolve(root,'src'))){if(!/\.[jt]sx?$/.test(file)||file.includes('.test.'))continue;
  const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:import|export)\s+(?:type\s+)?[^;]*?\sfrom\s*['"]([^'"]+)['"]/g)){
   const spec=match[1];
   if(spec.startsWith('.')){if(relative(root,resolve(dirname(file),spec)).startsWith('..'))throw Error(`${name} imports outside its package: ${spec}`);}
   else if(!allowed.has(spec)&&!(['jev-core','browser'].includes(name)&&spec.startsWith('node:')))throw Error(`${name} has an undeclared layer dependency: ${spec}`);
   if(name==='ui'&&['@jot/agent','@jot/browser/types'].includes(spec)&&!/^import\s+type\b/.test(match[0]))throw Error('UI must consume the agent protocol as types only.');
  }
 }
}
console.log('Package boundaries verified: UI → protocol types; agent → no provider; jev-core → no UI/agent.');
