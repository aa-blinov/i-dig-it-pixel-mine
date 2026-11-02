// Pointer and keyboard input for the canvas.
import { unlockAudio } from "./audio.js";
import { cellAt, setSelected, showMarker, startGame } from "./board.js";
import { updateTexts } from "./hud.js";
import { beginRound, openCamp, requestLeave, resultNext, shareResult, shopAction } from "./round.js";
import { tap } from "./turn.js";
import { cellIndex, colOf, rowOf } from "../model/grid.js";
import { enterChallenge } from "../ui/challenge-dialog.js";

export function pointer(engine, event) {
  if (!event) return;
  if (event.target && event.target.closest && event.target.closest('#mine-interface, .mine-code-dialog')) return;
  if (engine.challengeDialog && engine.challengeDialog.open) return;
  unlockAudio(engine);
  var layer = engine.runtime.layout.getLayer('Game');
  if (!layer) return;
  var point = layer.cssPxToLayer(event.clientX, event.clientY);
  if (!engine.cockpit && point[0] >= 256 && point[0] <= 320 && point[1] >= 24 && point[1] <= 88) {
    engine.muted = !engine.muted; updateTexts(engine); return;
  }
  if (engine.phase === 'base') { campPointer(engine, point[0], point[1]); return; }
  if (engine.phase === 'result') return;
  if (!engine.cockpit && point[0] >= 286 && point[0] <= 668 && point[1] >= 1150 && point[1] <= 1228) {
    requestLeave(engine);
    return;
  }
  var index = cellAt(engine, point[0], point[1]);
  engine.swipeFrom = null;
  if (index >= 0) {
    tap(engine, index);
    if (engine.selected === index) engine.swipeFrom = { index: index, x: point[0], y: point[1] };
  }
}

// A swipe from the selected ore swaps it with its neighbour that way, so on a
// phone only the first touch has to land on the right cell.
export function pointerUp(engine, event) {
  var from = engine.swipeFrom;
  engine.swipeFrom = null;
  if (!from || !event || engine.phase !== 'idle' || engine.selected !== from.index) return;
  var layer = engine.runtime.layout.getLayer('Game');
  if (!layer) return;
  var point = layer.cssPxToLayer(event.clientX, event.clientY);
  var dx = point[0] - from.x, dy = point[1] - from.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  var dims = engine.dims, col = colOf(dims, from.index), row = rowOf(dims, from.index);
  if (Math.abs(dx) > Math.abs(dy)) col += dx > 0 ? 1 : -1; else row += dy > 0 ? 1 : -1;
  if (col < 0 || row < 0 || col >= dims.cols || row >= dims.rows) return;
  tap(engine, cellIndex(dims, col, row));
}

export function key(engine, event) {
  // Native controls own their keys; do not also trigger canvas shortcuts.
  if (event.target && event.target.closest && event.target.closest('#mine-interface, .mine-code-dialog')) return;
  if (globalThis.document && document.activeElement && document.activeElement.closest && document.activeElement.closest('#mine-interface, .mine-code-dialog')) return;
  if (engine.challengeDialog && engine.challengeDialog.open) return;
  unlockAudio(engine);
  var code = event.code || event.key;
  if (code === 'KeyM' || code === 'm' || code === 'M') { engine.muted = !engine.muted; updateTexts(engine); return; }
  if (engine.phase === 'base') {
    if (code === 'Enter') beginRound(engine, 'contract');
    else if (code === 'KeyD') beginRound(engine, 'daily');
    else if (code === 'KeyC') shareResult(engine);
    else if (code === 'KeyV') { if (event.preventDefault) event.preventDefault(); enterChallenge(engine); }
    else { var buyAt = ['Digit1', 'Digit2', 'Digit3'].indexOf(code), equipAt = ['KeyQ', 'KeyW', 'KeyE'].indexOf(code); if (buyAt >= 0) shopAction(engine, buyAt, false); if (equipAt >= 0) shopAction(engine, equipAt, true); }
    return;
  }
  if (engine.phase === 'result') {
    if (code === 'Enter' || code === 'Space' || code === ' ') resultNext(engine);
    else if (code === 'Escape' || code === 'KeyR') openCamp(engine);
    return;
  }
  if (code === 'KeyR' || code === 'r' || code === 'R') {
    requestLeave(engine);
    return;
  }
  if (engine.phase === 'over' && code === 'Enter') { startGame(engine); return; }
  if (engine.phase !== 'idle') return;
  if (code === 'Escape') { if (engine.aiming) { engine.aiming = null; engine.toast = ''; updateTexts(engine); return; } setSelected(engine, -1); return; }
  var dims = engine.dims, col = colOf(dims, engine.cursor || 0), row = rowOf(dims, engine.cursor || 0);
  if (code === 'ArrowLeft') col = Math.max(0, col - 1);
  else if (code === 'ArrowRight') col = Math.min(dims.cols - 1, col + 1);
  else if (code === 'ArrowUp') row = Math.max(0, row - 1);
  else if (code === 'ArrowDown') row = Math.min(dims.rows - 1, row + 1);
  else if (code === 'Enter' || code === 'Space' || code === ' ') { tap(engine, engine.cursor || 0); return; }
  else return;
  if (event.preventDefault) event.preventDefault();
  engine.cursor = cellIndex(dims, col, row);
  showMarker(engine, engine.cursor);
}

export function campPointer(engine, x, y) {
  for (var index = 0; index < 3; index++) {
    var row = 404 + index * 160;
    if (x >= 508 && x <= 666 && y >= row + 10 && y <= row + 66) { shopAction(engine, index, false); return; }
    if (x >= 508 && x <= 666 && y >= row + 78 && y <= row + 130) { shopAction(engine, index, true); return; }
  }
  if (x >= 44 && x <= 676 && y >= 966 && y <= 1044) beginRound(engine, 'contract');
  else if (x >= 44 && x <= 676 && y >= 1062 && y <= 1130) beginRound(engine, 'daily');
  else if (x >= 44 && x <= 348 && y >= 1146 && y <= 1208) shareResult(engine);
  else if (x >= 372 && x <= 676 && y >= 1146 && y <= 1208) enterChallenge(engine);
}
