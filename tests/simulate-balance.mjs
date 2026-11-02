// Plays whole shifts of every contract with three policies and suggests the
// quotas that give a target pass rate for the greedy player.
//
//   node tests/simulate-balance.mjs [runs]
// Reduced motion is on: the rules are the same, the shifts are faster.
import { writeFileSync } from 'node:fs';
import { bootGame, memoryStorage } from './runtime.mjs';

const runs = Number(process.argv[2] || 40);
// Share of greedy shifts that should reach the quota, per contract.
const TARGET = [0.9, 0.86, 0.82, 0.76, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35];

function moves(e) {
  const M = e.model, d = e.dims, n = d.cols * d.rows;
  const grid = e.cells.map(c => c.colour), sp = e.cells.map(c => c.special), out = [];
  for (let a = 0; a < n; a++) for (const b of [a + 1, a + d.cols]) {
    if (b >= n || (b === a + 1 && a % d.cols === d.cols - 1)) continue;
    if (!M.isMove(grid, sp, d, a, b)) continue;
    const c = grid.slice(); [c[a], c[b]] = [c[b], c[a]];
    const r = M.resolveMatches(c, d, { a, b }, sp);
    const value = Object.keys(r.cleared).reduce((s, i) => s + M.oreValue(e.palette, c[i]), 0) + r.creations.length * 120 + (sp[a] || sp[b] ? 300 : 0);
    out.push({ cells: [a, b], value });
  }
  return out;
}
const POLICIES = {
  random: (e, rand) => { const all = moves(e); return all[Math.floor(rand() * all.length)]?.cells; },
  greedy: e => moves(e).sort((x, y) => y.value - x.value)[0]?.cells,
};

function shift(contract, policy, upgraded, seed) {
  const rt = bootGame({ storage: memoryStorage(), reducedMotion: true }), e = rt.__m3;
  e.profile.completed = contract - 1;
  if (upgraded) { e.profile.upgrades = { battery: 2, blast: 2, scanner: 0 }; e.profile.equipped = ['battery', 'blast']; }
  // A contract picks its own seed from Math.random; seed that, so every run is repeatable.
  Math.random = e.model.seededRandom(seed);
  e.openCamp(); e.beginRound('contract');
  e.goal = Infinity; // play every move: we want the score distribution, not the first win
  const rand = e.model.seededRandom(seed + '-policy');
  for (let turn = 0; turn < 60 && e.phase === 'idle' && e.moves > 0; turn++) {
    const move = POLICIES[policy](e, rand);
    if (!move) break;
    e.tap(move[0]); e.tap(move[1]);
    for (let tick = 0; tick < 3000 && !['idle', 'base', 'over'].includes(e.phase); tick++) e.step(1 / 60);
  }
  return e.score;
}

const rtQuota = c => bootGame().__m3.model.contracts[c - 1].quota;
const report = [];
for (let c = 1; c <= 12; c++) {
  const row = { contract: c };
  for (const [name, policy, upgraded] of [['random', 'random', false], ['greedy', 'greedy', false], ['upgraded', 'greedy', true]]) {
    const scores = [];
    for (let r = 0; r < runs; r++) scores.push(shift(c, policy, upgraded, `bal-${c}-${r}`));
    scores.sort((a, b) => a - b);
    row[name] = scores;
  }
  const greedy = row.greedy;
  row.suggestedQuota = Math.round(greedy[Math.floor((greedy.length - 1) * (1 - TARGET[c - 1]))] / 50) * 50;
  row.quota = rtQuota(c);
  const pass = scores => scores.filter(s => s >= row.quota).length / scores.length;
  row.pass = { random: pass(row.random), greedy: pass(row.greedy), upgraded: pass(row.upgraded) };
  report.push(row);
  console.log(`C${c}: quota ${row.quota} (suggested ${row.suggestedQuota}) · pass random ${Math.round(row.pass.random * 100)}% greedy ${Math.round(row.pass.greedy * 100)}% upgraded ${Math.round(row.pass.upgraded * 100)}% · greedy median ${greedy[greedy.length >> 1]}`);
}
writeFileSync(new URL('../build/reports/balance-simulation.json', import.meta.url), JSON.stringify({ runs, target: TARGET, report }, null, 1));
