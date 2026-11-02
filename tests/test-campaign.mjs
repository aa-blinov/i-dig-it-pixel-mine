import assert from 'node:assert/strict';
import { bootGame, memoryStorage, bestVisibleMove } from './runtime.mjs';
let count = 0;
function check(name, condition) { assert.ok(condition, name); count++; console.log('ok   ' + name); }
const runtime = bootGame({ ui: true }), engine = runtime.__m3, model = engine.model;
check('game opens at the base', engine.phase === 'base' && engine.cells.length === 0);
check('campaign starts without free currency', engine.profile.credits === 0 && engine.profile.completed === 0);
engine.finishRound();
check('an unstarted contract cannot settle a reward', engine.profile.credits === 0 && !engine.lastResult);
check('base UI is real runtime Text', !!engine.ui.campStart && engine.ui.campStart.isVisible);
check('unaffordable purchase does not change the profile', !engine.buy('battery').ok && engine.profile.upgrades.battery === 0 && engine.profile.credits === 0);
engine.profile.credits = 1000;
check('first module costs exactly 80', engine.buy('battery').ok && engine.profile.credits === 920);
check('purchased module is equipped if a slot is free', engine.profile.equipped.includes('battery'));
const blastBuy = engine.buy('blast'), scannerBuy = engine.buy('scanner');
check('purchase message says the module was installed', /установлен, занято слотов 2 из 2/.test(blastBuy.message));
check('purchase message explains a full loadout', /оба слота заняты/.test(scannerBuy.message) && !/установлен,/.test(scannerBuy.message));
check('only two modules auto-equip', engine.profile.equipped.length === 2 && !engine.profile.equipped.includes('scanner'));
check('a third module cannot bypass the slot cap', !engine.equip('scanner').ok);
engine.equip('battery'); engine.equip('scanner');
check('equipment can be exchanged without a fee', engine.profile.equipped.includes('scanner') && !engine.profile.equipped.includes('battery') && engine.profile.credits === 760);
check('second upgrade costs exactly 180', engine.buy('battery').ok && engine.profile.credits === 580);
check('upgrades stop at level two', !engine.buy('battery').ok && engine.profile.credits === 580 && engine.profile.upgrades.battery === 2);
const broken = model.sanitizeProfile({ version: 2, credits: -90, completed: 999, upgrades: { battery: 999, blast: 1, scanner: 2 }, equipped: ['battery', 'battery', 'blast', 'scanner'] });
check('invalid storage cannot create negative currency or unlimited slots', broken.credits === 0 && broken.equipped.length === 2 && broken.upgrades.battery === 2 && broken.completed === model.contracts.length);
engine.beginRound('contract');
check('a contract has its own target, moves and field', engine.goal === model.contracts[0].quota && engine.moves === model.contracts[0].moves && engine.dims.cols === model.contracts[0].cols && engine.phase === 'idle');
check('scanner marks are capped by upgrade level', engine.scanMarkers.length === 2);
check('purchases and loadout changes are blocked during a run', !engine.buy('blast').ok && !engine.equip('blast').ok);
const balanceBefore = engine.profile.credits;
engine.score = engine.goal; engine.moves = 8; engine.relics = ['umw']; engine.findCount = 1;
engine.finishRound();
check('success advances exactly one contract', engine.phase === 'base' && engine.profile.completed === 1);
check('success gives bounded separate shop credits', engine.profile.credits === balanceBefore + 103);
check('artifacts brought up in the hold join the collection', engine.profile.collection.umw === 1);
const settled = engine.profile.credits; engine.finishRound();
check('round reward cannot be collected twice', engine.profile.credits === settled);
engine.beginRound('contract'); engine.score = 0; engine.moves = 0; engine.finishRound();
check('failure keeps the current contract and awards only salvage', engine.profile.completed === 1 && engine.lastResult.credits === 25);
engine.beginRound('contract'); const beforeAbort = engine.profile.credits; engine.openCamp();
check('abandoning a run cannot farm credits', engine.profile.credits === beforeAbort);
const storage = memoryStorage(); const saved = bootGame({ storage }).__m3;
saved.profile.credits = 200; saved.buy('battery');
const loaded = bootGame({ storage }).__m3;
check('wallet and modules survive reloading', loaded.profile.credits === 120 && loaded.profile.upgrades.battery === 1 && loaded.profile.equipped.includes('battery'));
const a = bootGame().__m3, b = bootGame().__m3;
b.profile.upgrades = { battery: 2, blast: 2, scanner: 2 }; b.profile.equipped = ['battery', 'scanner'];
a.beginRound('daily'); b.beginRound('daily');
check('daily code and ore field are identical across profiles', a.seed === b.seed && a.cells.map(g => g.colour).join() === b.cells.map(g => g.colour).join());
check('daily buried finds are identical across profiles', a.buried.join() === b.buried.join());
check('daily challenge disables paid scanner and all installed modules', b.scanMarkers.length === 0 && Object.values(b.roundModules).every(level => level === 0));
b.moves = 0; b.score = 700; const dailyWallet = b.profile.credits; b.finishRound();
check('daily replays do not generate shop currency', b.profile.credits === dailyWallet && b.profile.dailyBest[b.seed.slice(4)] === 700);
const cap = bootGame().__m3;
cap.profile.upgrades.battery = 2; cap.profile.equipped = ['battery']; cap.beginRound('daily');
const dailySnapshot = cap.roundModules.battery;
cap.openCamp(); cap.beginRound('contract'); cap.goal = 999999;
cap.buried.fill('fuel'); const move = bestVisibleMove(cap); cap.tap(move[0]); cap.tap(move[1]);
for (let i = 0; i < 500; i++) cap.step(1 / 60);
check('extra turns cannot exceed six even with many upgraded batteries', cap.energyGranted === 6 && cap.moves <= model.contracts[0].moves + 5);
check('daily battery strength was zero', dailySnapshot === 0);
check('same explicit seed is reproducible', model.seededRandom('test')() === model.seededRandom('test')());
check('challenge validation rejects impossible dates and arbitrary strings', model.validChallengeCode('PM2-2026-11-01') && !model.validChallengeCode('PM2-2026-02-31') && !model.validChallengeCode('<script>'));
const pastA = bootGame().__m3, pastB = bootGame().__m3;
pastA.beginRound('daily', 'PM2-2026-11-01'); pastB.beginRound('daily', 'PM2-2026-11-01');
check('imported challenge codes replay the same field and finds', pastA.cells.map(g => g.colour).join() === pastB.cells.map(g => g.colour).join() && pastA.buried.join() === pastB.buried.join());
pastA.profile.completed = model.contracts.length; pastA.openCamp(); pastA.beginRound('contract');
check('campaign progression has a finite final contract', pastA.contract === model.contracts.length && pastA.goal === model.contracts.at(-1).quota);
pastA.score = pastA.goal; pastA.moves = 10; pastA.finishRound();
check('winning final contract never increments beyond the campaign', pastA.profile.completed === model.contracts.length && pastA.lastResult.stars === 3);
const inputRuntime = bootGame({ ui: true }), input = inputRuntime.__m3;
input.challengeDialog = { open: true }; inputRuntime.key('Enter');
check('typing in the code dialog cannot start a contract underneath', input.phase === 'base');
inputRuntime.listeners.pointerdown.forEach(fn => fn({ clientX: 400, clientY: 1000 }));
check('dialog pointer input cannot activate covered game buttons', input.phase === 'base');
input.challengeDialog.open = false; input.beginRound('contract'); input.tap(0); input.openCamp(); inputRuntime.tick(2);
check('returning to base with selected ore safely clears selection', input.phase === 'base' && input.selected === -1 && input.cells.length === 0);
{
  // The end of a shift is a beat on the field, not a jump to the base.
  const rt = bootGame(), x = rt.__m3;
  check('a new bourmaster hears the intro before the first contract', x.storyBeat === 0);
  x.beginRound('contract');
  check('the intro is not repeated once a shift starts', x.storyBeat === null);
  const status = () => rt.statics.find(i => i.type === 'StatusText').text;
  rt.tick(2);
  check('the first move of a shift explains the swap', /Поменяй две соседние руды/.test(status()));
  x.buried.fill(null);
  x.goal = 1; const move = bestVisibleMove(x); x.tap(move[0]); x.tap(move[1]);
  for (let i = 0; i < 2000 && x.phase !== 'idle'; i++) x.step(1 / 60);
  rt.tick(1);
  check('meeting the quota keeps the shift going', x.phase === 'idle' && x.quotaMet && x.fuelAtQuota === x.moves);
  check('the cockpit says the quota is met and the rest goes to the pocket', /Норма выполнена/.test(status()));
  rt.key('KeyR');
  check('after the quota one press hands the shift in', x.phase === 'ending');
  let sawEnding = false;
  for (let i = 0; i < 2000 && x.phase !== 'base'; i++) { x.step(1 / 60); if (x.phase === 'ending') { sawEnding = true; rt.tick(1); } }
  check('a handed-in shift shows a banner on the field before the base', sawEnding && x.phase === 'base' && x.profile.completed === 1);
  check('the first win plays the next radio beat', x.storyBeat === 1);
  const low = bootGame(), y = low.__m3;
  y.beginRound('contract'); y.buried.fill(null); y.moves = 4; y.goal = 999999;
  const m = bestVisibleMove(y); y.tap(m[0]); y.tap(m[1]);
  for (let i = 0; i < 2000 && y.phase !== 'idle'; i++) y.step(1 / 60);
  low.tick(1);
  check('three moves left are announced', /Топливо на исходе: 3/.test(low.statics.find(i => i.type === 'StatusText').text));
}
{
  // One stray press of "To base" or R does not lose the shift.
  const rt = bootGame(), x = rt.__m3;
  x.beginRound('contract');
  rt.key('KeyR');
  check('the first press of R only asks to confirm', x.phase === 'idle' && /Нажми ещё раз/.test(x.toast));
  for (let i = 0; i < 240; i++) x.step(1 / 60);
  rt.key('KeyR');
  check('the confirmation expires after three seconds', x.phase === 'idle');
  rt.key('KeyR');
  check('two presses in a row leave for the base without a reward', x.phase === 'base' && x.profile.credits === 0);
}
{
  // The economy: ore over the quota goes into the pocket; replays pay less.
  const E = await import('../scripts/pixel-mine/model/economy.js');
  const first = E.settleShift({ won: true, contract: 1, score: 5000, quota: 4000, finds: 2, fuelAtQuota: 8, used: 14, replays: null });
  check('ore over the quota pays at 20 per credit with the star bonus', first.excess === 1000 && first.stars === 3 && first.excessCredits === 65 && first.reward === 100 + 6 + 65);
  check('stars follow the fuel left at the quota', E.starsFor(8) === 3 && E.starsFor(3) === 2 && E.starsFor(2) === 1);
  const again = E.settleShift({ won: true, contract: 1, score: 5000, quota: 4000, finds: 2, fuelAtQuota: 8, used: 14, replays: 0 });
  const later = E.settleShift({ won: true, contract: 1, score: 5000, quota: 4000, finds: 2, fuelAtQuota: 8, used: 14, replays: 5 });
  check('a replay pays 60%, every later replay 40%', again.reward === Math.round(171 * 0.6) && later.reward === Math.round(171 * 0.4));
  check('the daily challenge pays no credits', E.settleShift({ daily: true, won: true, score: 9999 }).reward === 0);

  const rt = bootGame(), x = rt.__m3;
  x.profile.completed = 3; x.openCamp();
  x.chooseContract(2);
  x.beginRound('contract');
  check('a finished contract can be chosen and replayed', x.contract === 2 && x.dims.cols === model.contracts[1].cols);
  x.score = x.goal + 400; x.fuelAtQuota = 8; x.moves = 8; const wallet = x.profile.credits; x.finishRound();
  check('a replay pays its reduced share and counts the replay', x.profile.replays[2] === 1 && x.lastResult.pay.rate === 0.6 && x.profile.credits - wallet === x.lastResult.credits && x.profile.completed === 3);
  x.chosenContract = 99; x.beginRound('contract');
  check('a contract beyond the next one cannot be chosen', x.contract === 4);
}
{
  // The base: building, neighbours, income over real time, its cap, and what it gives a shift.
  const B = await import('../scripts/pixel-mine/model/base.js');
  const HOUR = 3600000, t0 = 1_000_000_000_000;
  const p = model.freshProfile(); p.completed = 2; p.credits = 1000;
  check('the storage is free and starts the clock', B.build(p, 'storage', 0, 0, t0).ok && p.credits === 1000 && p.base.last === t0);
  check('a two-cell building needs two free cells', !B.build(p, 'smelter', 5, 0, t0).ok && !B.build(p, 'smelter', 0, 0, t0).ok && B.build(p, 'smelter', 1, 0, t0).ok);
  check('a smelter next to a storage works 20% better', B.incomePerHour(p.base) === 8 * 1.2);
  check('buildings that open later cannot be built yet', !B.build(p, 'generator', 0, 2, t0).ok);
  check('income piles up per hour', B.pending(p.base, t0 + 5 * HOUR) === Math.floor(5 * 9.6));
  check('income stops at the storage cap', B.pending(p.base, t0 + 30 * HOUR) === Math.floor(8 * 9.6));
  const wallet = p.credits, got = B.collect(p, t0 + 30 * HOUR);
  check('collecting pays out and restarts the clock', got === 76 && p.credits === wallet + 76 && B.pending(p.base, t0 + 30 * HOUR) === 0);
  check('an upgrade costs its next level', B.upgrade(p, p.base.buildings[1].id, t0 + 30 * HOUR).ok && p.base.buildings[1].level === 2);
  const clean = B.sanitizeBase({ buildings: [{ type: 'storage', x: 0, y: 0, level: 9 }, { type: 'storage', x: 0, y: 0 }, { type: 'nope', x: 1, y: 1 }], last: 'x' });
  check('a broken saved base is cleaned up', clean.buildings.length === 1 && clean.buildings[0].level === 4 && clean.last === null);

  const rt = bootGame(), x = rt.__m3;
  x.profile.completed = 4; x.profile.credits = 5000;
  B.build(x.profile, 'generator', 0, 1, t0); B.build(x.profile, 'lift', 1, 1, t0); B.build(x.profile, 'quarters', 2, 1, t0);
  x.openCamp(); x.chooseContract(1); x.beginRound('contract');
  check('the generator adds fuel to a contract', x.moves === model.contracts[0].moves + 1);
  check('the lift adds room in the hold', x.bonuses.cargo === 1);
  x.buried.fill(null); x.goal = 999999;
  for (let turn = 0; turn < 5; turn++) { const m = bestVisibleMove(x); x.tap(m[0]); x.tap(m[1]); for (let i = 0; i < 2000 && x.phase !== 'idle'; i++) x.step(1 / 60); }
  check('a miner brings fuel every fifth move', x.minersLeft === 0 && x.moves === model.contracts[0].moves + 1 - 5 + 1);
  x.openCamp(); x.beginRound('daily');
  check('the daily challenge ignores the base', x.moves === model.daily.moves && x.bonuses.fuel === 0);
}
{
  // The collection: sets per layer, swapping spares, the museum bonus.
  const C = await import('../scripts/pixel-mine/model/collections.js');
  check('every layer has two common, one rare and one legendary artifact', [0, 1, 2, 3].every(l => C.setOf(l).map(a => a.rarity).sort().join() === 'common,common,legendary,rare'));
  check('a find becomes an artifact of its layer and rarity', C.artifact(C.pickArtifact(2, 'idol', () => 0)).id === 'chisos' && C.artifact(C.pickArtifact(1, 'fossil', () => 0.9)).layer === 1);
  const col = { scrip: 3, ironnews: 2, umw: 1 };
  check('three spares from a set buy its missing item', C.swapForMissing(col, 'wakefield').ok && col.wakefield === 1 && C.setComplete(col, 0) && C.spares(col, 0) === 0);
  check('a swap needs enough spares', !C.swapForMissing({ horseshoe: 2 }, 'assay').ok);
  const E = await import('../scripts/pixel-mine/model/economy.js');
  const plain = E.settleShift({ won: true, contract: 1, score: 5000, quota: 4000, finds: 0, fuelAtQuota: 2, used: 10, replays: null });
  const museum = E.settleShift({ won: true, contract: 1, score: 5000, quota: 4000, finds: 0, fuelAtQuota: 2, used: 10, replays: null, museumPct: 20 });
  check('the museum adds its share to the excess', museum.excessCredits === Math.floor(1000 / 20 * 1.2));
  check('a broken saved collection keeps only real artifacts', JSON.stringify(C.sanitizeCollection({ scrip: 2, ring: 5, miranda: -1 })) === '{"scrip":2}');
}
{
  // The fleet: ships, expeditions, miners away; then gifts.
  const F = await import('../scripts/pixel-mine/model/fleet.js');
  const P = await import('../scripts/pixel-mine/model/profile.js');
  const p = P.freshProfile(); p.completed = 7;
  check('a ship the dock does not give cannot sail', !F.launch(p, 1, 'probe', 0, 1, 0).ok);
  check('a ship sails to an open layer', F.launch(p, 1, 'mole', 2, 1, 1000).ok && p.fleet.trips.length === 1);
  check('a ship cannot sail twice', !F.launch(p, 1, 'mole', 0, 1, 1000).ok);
  check('a layer deeper than the campaign is closed', !F.launch(p, 3, 'tug', 3, 1, 1000).ok);
  check('a ship in the way is not unloaded early', !F.claim(p, 1, 1000 + 3599000).ok);
  const trip = p.fleet.trips[0], before = p.credits;
  check('a haul is decided by its seed', JSON.stringify(F.haul('mole', 2, 1, 'x')) === JSON.stringify(F.haul('mole', 2, 1, 'x')));
  check('a ship back home pays its haul', F.claim(p, 1, 1000 + 3600000).ok && p.credits === before + trip.credits && p.fleet.trips.length === 0);
  check('longer trips pay more', F.haul('tug', 1, 8, 's').credits > F.haul('tug', 1, 0.25, 's').credits);
  F.launch(p, 3, 'tug', 1, 4, 5);
  const saved = P.sanitizeProfile(JSON.parse(JSON.stringify(p)));
  check('a trip survives a reload', saved.fleet.trips.length === 1 && saved.fleet.trips[0].credits === p.fleet.trips[0].credits);
  check('a broken saved fleet is dropped', P.sanitizeProfile({ fleet: { trips: [{ ship: 'yacht', hours: 1, start: 0 }] } }).fleet.trips.length === 0);

  const G = await import('../scripts/pixel-mine/model/gifts.js');
  const giver = P.freshProfile(), friend = P.freshProfile();
  giver.collection = { flask: 2 };
  check('a single copy cannot be given away', !G.makeGift({ ...giver, collection: { flask: 1 } }, 'flask', 0).ok);
  const gift = G.makeGift(giver, 'flask', 123456);
  check('a spare becomes a gift code', gift.ok && /^GIFT-FLASK-\w{4}-\w{4}$/.test(gift.code) && giver.collection.flask === 1);
  check('the giver cannot redeem their own gift', !G.redeemGift(giver, gift.code).ok);
  check('a friend redeems the gift once', G.redeemGift(friend, gift.code.toLowerCase()).ok && friend.collection.flask === 1 && !G.redeemGift(friend, gift.code).ok);
  check('a typo is caught', !G.redeemGift(friend, gift.code.slice(0, -1) + (gift.code.endsWith('A') ? 'B' : 'A')).ok);
}
console.log('\n' + count + ' campaign checks passed');
