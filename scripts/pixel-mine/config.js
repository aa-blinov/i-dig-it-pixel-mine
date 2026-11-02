// Game constants and definitions shared by every module.

export var START_MOVES = 20;    // the gauge's full scale; a contract sets its own moves
export var CELL = 64;
// The field fits a 595 square between the ladder and the shaft; small fields
// get bigger cells, up to CELL_MAX, so they stay easy to hit on a phone.
export var BOARD_AREA = 595, CELL_MAX = 112;
export var BOARD = { cell: CELL };
export var BOARD_TOP = 312;
export var BOARD_CENTER_X = 360;
export var MAX_COLS = 9;
export var MAX_ROWS = 9;
export var FALL_SPEED = 1800;   // top speed of falling ore, layout pixels per second
export var CLEAR_FX_SECONDS = 0.22;
export var MAX_SPECIALS = 4;    // specials allowed on the board at once

// Every ore the mine knows, in the frame order of the Ore sprite. The last
// frame of the Ore sprite is the diamond drill, which belongs to no ore.
export var ORES = [
  { id: 'coal', name: 'Уголь', value: 8 },
  { id: 'copper', name: 'Медь', value: 10 },
  { id: 'iron', name: 'Железо', value: 12 },
  { id: 'gold', name: 'Золото', value: 18 },
  { id: 'llanite', name: 'Льянит', value: 16 },
  { id: 'silver', name: 'Серебро', value: 14 },
  { id: 'turquoise', name: 'Бирюза', value: 18 },
  { id: 'malachite', name: 'Малахит', value: 16 },
  { id: 'cinnabar', name: 'Киноварь', value: 20 },
  { id: 'platinum', name: 'Платина', value: 24 },
  { id: 'bluetopaz', name: 'Голубой топаз', value: 26 },
  { id: 'citrine', name: 'Цитрин', value: 24 },
  { id: 'garnet', name: 'Гранат', value: 28 },
  { id: 'crystal', name: 'Горный хрусталь', value: 34 },
  { id: 'amethyst', name: 'Аметист', value: 30 },
  { id: 'emerald', name: 'Изумруд', value: 32 }
];
export var DRILL_FRAME = ORES.length;
export var DRILL_VALUE = 40;

// The layers of the mine, each a real Texas mining place of the 1880s–1910s
// (docs/narrative/lore.md). A contract plays the ores of its layer.
export var LAYERS = [
  { id: 'llano', name: 'Ллано', ores: [0, 1, 2, 3, 4] },
  { id: 'shafter', name: 'Шафтер', ores: [2, 1, 5, 6, 7] },
  { id: 'terlingua', name: 'Терлингуа', ores: [0, 8, 3, 9, 10, 11] },
  { id: 'almagres', name: 'Лос-Альмагрес', ores: [13, 14, 15, 12, 10, 9] }
];

// The campaign. The board grows with depth; the moves differ per contract
// (layers with six ores get one more). Quotas come from
// tests/simulate-balance.mjs: a greedy player passes about 90% of contract 1
// and about 35% of contract 12.
export var CONTRACTS = [
  { quota: 1800, moves: 22, cols: 4, rows: 4, layer: 0 },
  { quota: 2000, moves: 22, cols: 4, rows: 4, layer: 0 },
  { quota: 2700, moves: 21, cols: 5, rows: 5, layer: 0 },
  { quota: 2800, moves: 21, cols: 5, rows: 5, layer: 1 },
  { quota: 2800, moves: 20, cols: 5, rows: 5, layer: 1 },
  { quota: 3600, moves: 20, cols: 6, rows: 6, layer: 1 },
  { quota: 3650, moves: 22, cols: 6, rows: 6, layer: 2 },
  { quota: 3900, moves: 22, cols: 6, rows: 6, layer: 2 },
  { quota: 5000, moves: 21, cols: 7, rows: 7, layer: 2 },
  { quota: 5800, moves: 19, cols: 7, rows: 7, layer: 3 },
  { quota: 5900, moves: 19, cols: 7, rows: 7, layer: 3 },
  { quota: 6000, moves: 19, cols: 7, rows: 7, layer: 3 }
];
// The economy of a shift. Ore over the quota goes into the pocket at
// orePerCredit; stars (fuel left when the quota was met) raise that share;
// a contract replayed after its first win pays less each time.
export var ECONOMY = {
  orePerCredit: 20,
  starBonus: [0, 0.15, 0.3],
  starFuel: [3, 8],        // fuel left for two and for three stars
  replayRates: [0.6, 0.4], // first replay, every later replay
  cargoSlots: 1
};
// The contract after which each system opens: one new thing at a time, each
// with a reason in the story (docs/gdd/progression.md).
export var UNLOCKS = { replay: 1, daily: 1, base: 2, workshop: 3, miners: 4, lab: 5, museum: 6, fleet: 7 };

// The base on the surface: a 6 x 6 grid. Buildings are 1 or 2 cells wide.
// `opens` is the unlock key that makes a building available.
export var BASE_SIZE = 6;
export var BUILDINGS = {
  storage: { name: 'Склад', w: 1, opens: 'base', costs: [0, 120, 260, 480], capHours: [8, 12, 18, 24], about: 'Копит доход, пока тебя нет' },
  smelter: { name: 'Плавильня', w: 2, opens: 'base', costs: [150, 320, 640], income: [8, 14, 22], likes: 'storage', about: 'Плавит руду в кредиты. Рядом со складом работает на 20% лучше' },
  autodrill: { name: 'Автобур', w: 1, opens: 'base', costs: [100, 230, 470], income: [5, 9, 14], likes: 'generator', about: 'Бурит сам. Рядом с генератором на 25% лучше' },
  generator: { name: 'Генератор', w: 1, opens: 'workshop', costs: [140, 330], fuel: [1, 2], about: 'Топливо в начале каждой смены' },
  quarters: { name: 'Общежитие', w: 1, opens: 'miners', costs: [120, 280, 540], miners: [1, 2, 3], about: 'Горняки: спускаются по лестнице и приносят топливо' },
  lift: { name: 'Подъёмник', w: 1, opens: 'base', costs: [120, 300], cargo: [1, 2], about: 'Клеть в шахте поднимает больше: ещё место в трюме на каждом уровне' },
  lab: { name: 'Лаборатория', w: 1, opens: 'lab', costs: [200, 460], slots: [2, 3], about: 'Способности для смены' },
  museum: { name: 'Музей', w: 2, opens: 'museum', costs: [180, 420], bonus: [5, 10], about: 'Выставка реликвий: процент к излишку за каждый полный набор' },
  dock: { name: 'Док', w: 2, opens: 'fleet', costs: [260, 560, 980], ships: [1, 2, 3], about: 'Корабли для экспедиций' },
  lantern: { name: 'Фонарь', w: 1, opens: 'base', costs: [30], decor: true, about: 'Для уюта' },
  cart: { name: 'Вагонетка', w: 1, opens: 'base', costs: [50], decor: true, about: 'Для уюта' },
  rails: { name: 'Рельсы', w: 1, opens: 'base', costs: [20], decor: true, about: 'Для уюта' },
  statue: { name: 'Статуя', w: 1, opens: 'museum', costs: [90], decor: true, about: 'Памятник первому бурмастеру' }
};
export var NO_STORAGE_CAP_HOURS = 2;

// The daily challenge: one layout for everyone, from the middle of the mine.
export var DAILY = { quota: 0, moves: 20, cols: 6, rows: 6, layer: 1 };
// The shared daily card: ore per move from which a move counts as good and as big.
// The greedy bot's moves split about a quarter to each square (median 108, upper quarter 390).
export var DAILY_CARD = { good: 100, big: 300 };

export var FIND_DEFS = {
  ring: { name: 'Редкая находка', value: 250, weight: 3 },
  idol: { name: 'Легендарная находка', value: 500, weight: 1 },
  fossil: { name: 'Обычная находка', value: 150, weight: 3 },
  fuel: { name: 'Топливная ячейка', moves: 3, weight: 3 },
  dynamite: { name: 'Динамит', blast: 'area', weight: 2 },
  drill: { name: 'Буровой заряд', blast: 'column', weight: 2 }
};
export var MODULES = {
  battery: { name: 'Аккумулятор', costs: [80, 180] },
  blast: { name: 'Детонатор', costs: [80, 180] },
  scanner: { name: 'Геосканер', costs: [80, 180] }
};
export var PROFILE_KEY = 'pixel-mine.profile.v2';
