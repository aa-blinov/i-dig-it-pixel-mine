// The HUD texts, gauge and cargo caption that live in the layout.
import { ORES, START_MOVES } from "../config.js";
import { oreValue } from "../model/contracts.js";
import { updateInterface } from "../ui/canvas-ui.js";
import { SPECIAL_NAMES, cargoSlots } from "./turn.js";

export function textOf(engine, name) {
  var objectClass = engine.types.texts[name];
  if (!objectClass) return null;
  return objectClass.getFirstInstance();
}

export function setText(engine, name, value) {
  // The texts are written when they change. The layout's own instances may
  // not exist yet when the layout starts, so a write that finds no
  // instance is tried again on the next tick.
  if (engine.shown[name] === value) return;
  var instance = textOf(engine, name);
  if (!instance) return;
  instance.text = value;
  engine.shown[name] = value;
}

// What the selected cell holds, for the status line and the field sheet.
export function describeCell(engine, index) {
  var gem = engine.cells[index];
  if (!gem) return '';
  if (gem.special) return SPECIAL_NAMES[gem.special] + (gem.colour >= 0 ? ', ' + ORES[engine.palette[gem.colour]].name.toLowerCase() : '');
  return ORES[engine.palette[gem.colour]].name + ', ' + oreValue(engine.palette, gem.colour) + ' за кусок';
}

// One or two short lines for the cockpit: what just happened or what to do next.
export function statusLine(engine) {
  if (engine.phase === 'over') return 'Смена завершена\nДобыто ' + engine.score;
  if (engine.phase === 'ending') return engine.quotaMet ? 'Смена сдана\nДобыто ' + engine.score + ' руды' : engine.mode === 'daily' ? 'Ходы закончились\nДобыто ' + engine.score : 'Ходы закончились\nДобыто ' + engine.score + ' из ' + engine.goal;
  if (engine.toast) return engine.toast;
  if (engine.selected >= 0) return describeCell(engine, engine.selected).split(', ')[0] + '\nВыбери соседнюю клетку';
  if (!engine.turns) return 'Поменяй две соседние руды\nТри в ряд уходят в добычу';
  if (engine.quotaMet) return 'Цель есть\nКопай дальше или сдай смену';
  // Nothing to say: the sky stays clear.
  return '';
}

export function updateTexts(engine) {
  updateInterface(engine);
  // With the page cockpit the layout texts stay empty; without it (tests, a
  // bare runtime) they still show the numbers.
  var cockpit = !!engine.cockpit;
  setText(engine, 'ScoreText', cockpit ? '' : String(engine.score));
  setText(engine, 'MovesText', cockpit ? '' : String(engine.moves));
  setText(engine, 'StatusText', cockpit ? '' : statusLine(engine));
  var gaugeType = engine.runtime.objects.GaugeNeedle;
  var gauge = gaugeType && gaugeType.getFirstInstance();
  var full = Math.max(START_MOVES, engine.setup ? engine.setup.moves : START_MOVES);
  if (gauge) gauge.angle = (-144 + 108 * Math.min(1, engine.moves / full)) * Math.PI / 180;
  var cargoText = engine.runtime.objects.LootText && engine.runtime.objects.LootText.getFirstInstance();
  if (cargoText) cargoText.text = cockpit ? '' : engine.cargo && engine.cargo.length ? 'В трюме ' + engine.cargo.length + ' из ' + cargoSlots(engine) : 'Находки скрыты под рудой';
  var soundButton = engine.runtime.objects.SoundButton && engine.runtime.objects.SoundButton.getFirstInstance();
  if (soundButton) { soundButton.animationFrame = engine.muted ? 1 : 0; soundButton.isVisible = !cockpit; }
}
