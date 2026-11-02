import { writeFileSync } from 'node:fs';
import { bootGame, bestVisibleMove } from './runtime.mjs';
const rt = bootGame(), e = rt.__m3;
e.beginRound('daily', 'PM2-2026-11-01');
const moves = [];
while (e.phase !== 'base' && moves.length < 28) {
  const cells = bestVisibleMove(e); e.tap(cells[0]); e.tap(cells[1]);
  for (let tick = 0; tick < 1600 && !['idle', 'base'].includes(e.phase); tick++) rt.tick();
  if (!['idle', 'base'].includes(e.phase)) throw new Error('Daily replay failed to settle');
  moves.push({ cells, score: e.score, moves: e.moves, phase: e.phase, finds: e.findCount });
}
writeFileSync(new URL('../build/reports/daily-ui-plan.json', import.meta.url), JSON.stringify({ code: e.seed, moves, result: e.lastResult }, null, 2));
console.log(JSON.stringify({ turns: moves.length, score: e.score, finds: e.findCount, phase: e.phase }));
