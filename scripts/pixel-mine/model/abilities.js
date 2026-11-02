// Pure rules for abilities: what each costs in charge and which cells it
// opens. Charge builds up from every piece of ore cleared in a shift.
import { mostCommonColour, square } from "./effects.js";
import { cellIndex, colOf, rowOf } from "./grid.js";

export var CHARGE_MAX = 60;

export var ABILITIES = {
  dynamite: { name: 'Динамит', cost: 24, target: true, about: 'Взрыв 3×3 там, где укажешь' },
  cutter: { name: 'Резак', cost: 28, target: true, about: 'Срезает всю строку' },
  borer: { name: 'Бур-заряд', cost: 28, target: true, about: 'Пробивает весь столбец' },
  magnet: { name: 'Магнит', cost: 36, target: true, about: 'Забирает всю руду того вида, на который укажешь' },
  seismo: { name: 'Сейсмозонд', cost: 18, target: false, about: 'Показывает все тайники на 3 хода' },
  shuffle: { name: 'Перемешать', cost: 14, target: false, about: 'Перемешивает руду, спецфишки остаются' },
  reserve: { name: 'Запас ходов', cost: 30, target: false, about: '+2 хода сразу' },
  rush: { name: 'Лихорадка', cost: 26, target: false, about: 'Два следующих хода дают +50% руды' }
};
export var DEFAULT_LOADOUT = ['dynamite', 'shuffle', 'reserve'];

// The cells a targeted ability opens at `index`.
export function abilityCells(id, index, dims, grid) {
  var cells = [], col = colOf(dims, index), row = rowOf(dims, index), k;
  if (id === 'dynamite') return square(dims, index, 1);
  if (id === 'cutter') { for (k = 0; k < dims.cols; k++) cells.push(cellIndex(dims, k, row)); return cells; }
  if (id === 'borer') { for (k = 0; k < dims.rows; k++) cells.push(cellIndex(dims, col, k)); return cells; }
  if (id === 'magnet') {
    var colour = grid[index] >= 0 ? grid[index] : mostCommonColour(grid);
    grid.forEach(function (value, i) { if (value === colour) cells.push(i); });
    return cells;
  }
  return cells;
}

// The abilities a player takes into a shift, trimmed to the slots they have.
export function loadout(chosen, slots) {
  var picked = (Array.isArray(chosen) ? chosen : DEFAULT_LOADOUT).filter(function (id, i, all) { return ABILITIES[id] && all.indexOf(id) === i; });
  return picked.slice(0, Math.max(0, slots));
}
