import { readFileSync } from 'node:fs';
import path from 'node:path';

function countToken(content, token){
  const match = content.match(new RegExp(token, 'g'));
  return match ? match.length : 0;
}

function main(){
  const root = process.cwd();
  const appPath = path.join(root, 'app.js');
  const content = readFileSync(appPath, 'utf8');
  console.log('[smoke] TIERS references:', countToken(content, 'TIERS'));
  console.log('[smoke] chooseTier references:', countToken(content, 'chooseTier'));
  const missingImports = [];
  ['effectiveStat', 'announceRareDrop', 'updateRareAnimStatus'].forEach((name) => {
    if(!content.includes(name)) missingImports.push(name);
  });
  if(missingImports.length){
    console.warn('[smoke] Possible missing symbols:', missingImports.join(', '));
  }
}

main();
