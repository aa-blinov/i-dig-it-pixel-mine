// Pure rules for what a shift sends to the town. There is one currency, ore:
// everything dug in a shift goes up, stars and the museum add a share on top,
// a replay sends less, a shift that missed its goal sends half.
import { ECONOMY } from "../config.js";

// Stars for the moves left at the moment the goal was met.
export function starsFor(fuelLeft) {
  return fuelLeft >= ECONOMY.starFuel[1] ? 3 : fuelLeft >= ECONOMY.starFuel[0] ? 2 : 1;
}

// The share a contract pays: full on its first win, less on each replay.
export function replayRate(replays) {
  if (replays === null || replays === undefined || replays < 0) return 1;
  return ECONOMY.replayRates[Math.min(replays, ECONOMY.replayRates.length - 1)];
}

// What a finished shift sends to the town. `replays` is null for a first win
// (or a miss), otherwise the number of earlier replays of this contract.
export function settleShift(shift) {
  var out = { reward: 0, mined: shift.score || 0, bonus: 0, bonusPct: 0, stars: 0, rate: 1, share: 1 };
  if (shift.daily) return out;
  out.rate = replayRate(shift.replays);
  if (shift.won) {
    out.stars = starsFor(shift.fuelAtQuota);
    out.bonusPct = Math.round(ECONOMY.starBonus[out.stars - 1] * 100) + (shift.museumPct || 0);
    out.bonus = Math.floor(out.mined * out.bonusPct / 100);
  } else if (shift.used >= ECONOMY.minMovesForPay) {
    out.share = ECONOMY.missShare;
  } else {
    out.share = 0;
  }
  out.reward = Math.round((out.mined + out.bonus) * out.share * out.rate);
  return out;
}
