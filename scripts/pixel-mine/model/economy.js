// Pure rules for what a shift pays: the contract reward, the finds, the ore
// over the quota, stars and the replay rate.
import { ECONOMY } from "../config.js";

// Stars for the fuel left at the moment the quota was met.
export function starsFor(fuelLeft) {
  return fuelLeft >= ECONOMY.starFuel[1] ? 3 : fuelLeft >= ECONOMY.starFuel[0] ? 2 : 1;
}

// The share a contract pays: full on its first win, less on each replay.
export function replayRate(replays) {
  if (replays === null || replays === undefined || replays < 0) return 1;
  return ECONOMY.replayRates[Math.min(replays, ECONOMY.replayRates.length - 1)];
}

// What a finished shift pays. `replays` is null for a first win (or a
// failure), otherwise the number of earlier replays of this contract.
export function settleShift(shift) {
  var out = { reward: 0, base: 0, finds: 0, excess: 0, excessCredits: 0, stars: 0, rate: 1 };
  if (shift.daily) return out;
  out.rate = replayRate(shift.replays);
  if (shift.won) {
    out.base = 100 + (shift.contract - 1) * 15;
    out.finds = Math.min(30, shift.finds * 3);
    out.stars = starsFor(shift.fuelAtQuota);
    out.excess = Math.max(0, shift.score - shift.quota);
    out.excessCredits = Math.floor(out.excess / ECONOMY.orePerCredit * (1 + ECONOMY.starBonus[out.stars - 1]) * (1 + (shift.museumPct || 0) / 100));
    out.reward = Math.round((out.base + out.finds + out.excessCredits) * out.rate);
  } else if (shift.used >= 5) {
    out.base = 25;
    out.finds = Math.min(15, shift.finds * 3);
    out.reward = Math.round((out.base + out.finds) * out.rate);
  }
  return out;
}
