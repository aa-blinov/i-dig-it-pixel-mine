// The daily card: the shift as a row of squares, one per move, that a player
// can paste into a chat. It shows how the shift went, not where the ore was.
import { DAILY_CARD } from "../config.js";

// Marks are taken when a move is spent: the score and finds before it.
// The gain of a move runs to the next mark, the last one to the final score.
export function moveGains(marks, score, finds) {
  return (marks || []).map(function (mark, i) {
    var next = marks[i + 1] || { score: score, finds: finds };
    return { ore: Math.max(0, next.score - mark.score), find: next.finds > mark.finds };
  });
}

export function moveSquare(gain) {
  if (gain.find) return '💎';
  // Blue, yellow and a star differ in hue, lightness and shape, so a
  // colour-blind player can still tell a weak move from a strong one.
  return gain.ore >= DAILY_CARD.big ? '⭐' : gain.ore >= DAILY_CARD.good ? '🟨' : gain.ore > 0 ? '🟦' : '⬛';
}

// Ten squares a line keeps the card narrow on a phone.
export function dailyCard(result) {
  var squares = (result.gains || []).map(moveSquare), rows = [];
  for (var i = 0; i < squares.length; i += 10) rows.push(squares.slice(i, i + 10).join(''));
  return ['I Dig It: Pixel Mine', 'Шахта дня ' + result.seed.slice(4), 'Добыто ' + result.score + ', находок ' + result.finds]
    .concat(rows)
    .concat(['Код ' + result.seed, 'Побьёшь мои ' + result.score + '?'])
    .join('\n');
}
