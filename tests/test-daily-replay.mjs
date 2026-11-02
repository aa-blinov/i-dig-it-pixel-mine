import assert from 'node:assert/strict';
import { bootGame, bestVisibleMove } from './runtime.mjs';
const games = [bootGame(), bootGame(), bootGame()];
for (const rt of games) rt.__m3.beginRound('daily', 'PM2-2026-11-01');
const snapshots = [];
for (let turn = 0; turn < 28 && games[0].__m3.phase !== 'base'; turn++) {
  const [a,b] = bestVisibleMove(games[0].__m3);
  games.forEach((rt, index) => {
    const e = rt.__m3;
    if (index === 1) {
      // Derive the cursor from actual state each time; never retain a separate
      // automation cursor between asynchronous browser calls.
      const go = target => {
        const w = e.dims.cols;
        while (e.cursor % w < target % w) rt.key('ArrowRight');
        while (e.cursor % w > target % w) rt.key('ArrowLeft');
        while (Math.floor(e.cursor / w) < Math.floor(target / w)) rt.key('ArrowDown');
        while (Math.floor(e.cursor / w) > Math.floor(target / w)) rt.key('ArrowUp');
      };
      go(a);rt.key('Enter');go(b);rt.key('Enter');
    } else { e.tap(a); e.tap(b); }
    const intervals = index === 2 ? [0.05,0.008,0.033,0.016] : [1/60];
    for (let tick=0; tick<4000 && !['idle','base'].includes(e.phase); tick++) e.step(intervals[tick % intervals.length]);
    assert.ok(['idle','base'].includes(e.phase));
  });
  const view = rt => {
    const e=rt.__m3;
    return {score:e.score,moves:e.moves,finds:e.findCount,phase:e.phase,board:e.cells.map(c=>c.colour),buried:Array.from(e.buried),result:e.lastResult};
  };
  const state = JSON.stringify(view(games[0]));
  assert.equal(JSON.stringify(view(games[1])),state,'Keyboard replay differs');
  assert.equal(JSON.stringify(view(games[2])),state,'Variable frame timing differs');
  snapshots.push({turn:turn+1,score:games[0].__m3.score});
}
assert.equal(games[0].__m3.phase,'base');
const finalScore = games[0].__m3.score;
assert.ok(finalScore > 0);
const rt=games[0], e=rt.__m3;
const nativeTarget={closest:()=>({})};
rt.listeners.keydown.forEach(fn=>fn({code:'Enter',target:nativeTarget}));
assert.equal(e.phase,'base','Native button Enter started a second canvas action');
rt.listeners.pointerdown.forEach(fn=>fn({clientX:100,clientY:1000,target:nativeTarget}));
assert.equal(e.phase,'base','Native pointer started a canvas action');
console.log(JSON.stringify({passes: ['direct taps','keyboard','variable dt'],turns:snapshots.length,score:finalScore,finds:games[0].__m3.findCount}));
