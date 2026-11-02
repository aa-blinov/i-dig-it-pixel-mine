import { bootGame, visibleMoves } from './runtime.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const scores=[];
for(let run=0;run<120;run++){
 const rt=bootGame({campaign:false}),e=rt.__m3;
 e.rand=e.model.seededRandom('balance-'+run);e.reset();const rng=e.model.seededRandom('novice-'+run);
 for(let turn=0;turn<28 && e.phase!=='over';turn++){
  const options=visibleMoves(e),move=options[Math.floor(rng()*options.length)].cells;e.tap(move[0]);e.tap(move[1]);
  for(let tick=0;tick<1500 && !['idle','over'].includes(e.phase);tick++)rt.tick();
 }
 scores.push(e.score);
}
scores.sort((a,b)=>a-b);
const results=JSON.parse(readFileSync(new URL('../build/reports/balance-simulation.json',import.meta.url)));
results.randomVisible={runs:120,policy:'uniform random legal visible move; no hidden-loot oracle',min:scores[0],p20:scores[23],p50:scores[59],p80:scores[95],max:scores.at(-1),scores};
writeFileSync(new URL('../build/reports/balance-simulation.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify({...results.randomVisible,scores:undefined},null,2));
