// Pure rules for the collection: the artifacts of each layer, which one a
// buried find turns out to be, complete sets, swapping spares, and the
// chronicle a complete set opens. The history behind each item is in docs/narrative/lore.md.

// A buried valuable has a rarity; the artifact is drawn from the layer's set.
export var FIND_RARITY = { fossil: 'common', ring: 'rare', idol: 'legendary' };
export var RARITY_NAMES = { common: 'обычный', rare: 'редкий', legendary: 'легендарный' };
export var SPARES_FOR_SWAP = 3;

export var ARTIFACTS = [
  { id: 'scrip', layer: 0, rarity: 'common', name: 'Талон-скрип', about: 'Монетка Texas and Pacific Coal. В лавке компании её брали со скидкой в пятую часть' },
  { id: 'ironnews', layer: 0, rarity: 'common', name: 'Номер Iron City News', about: 'Газета обещает Ллано славу «Питтсбурга Запада»' },
  { id: 'umw', layer: 0, rarity: 'rare', name: 'Значок профсоюза, 1903', about: 'Им гордились в Тербере, городе за колючей проволокой' },
  { id: 'wakefield', layer: 0, rarity: 'legendary', name: 'Акция Wakefield Iron, 1887', about: 'Бумага на целую гору железа, которое так и не переплавили' },
  { id: 'horseshoe', layer: 1, rarity: 'common', name: 'Подкова мула', about: 'Руду и воду в пустыне возили на мулах' },
  { id: 'carbide', layer: 1, rarity: 'common', name: 'Карбидная лампа', about: 'Шипит и пахнет чесноком, зато светит в забое' },
  { id: 'assay', layer: 1, rarity: 'rare', name: 'Пробирная квитанция', about: 'Анализ образца, который возчик Спенсер показал полковнику Шафтеру' },
  { id: 'silverbar', layer: 1, rarity: 'legendary', name: 'Слиток Presidio Mining Co.', about: 'Клеймо компании, руда шла по 45 долларов за тонну' },
  { id: 'furnacebrick', layer: 2, rarity: 'common', name: 'Кирпич ртутной печи', about: 'Трогать без перчаток не стоит и сейчас' },
  { id: 'mailbag', layer: 2, rarity: 'common', name: 'Конверт с почтой', about: 'Почту в Терлингуа возили три раза в неделю' },
  { id: 'flask', layer: 2, rarity: 'rare', name: 'Ртутная фляга', about: 'Железная, на 76 фунтов, тяжёлая даже пустой' },
  { id: 'chisos', layer: 2, rarity: 'legendary', name: 'Жетон Chisos Mining Co.', about: 'Расчётная бирка лавки, по ней жили сотни семей' },
  { id: 'ochre', layer: 3, rarity: 'common', name: 'Красная охра', about: '«Альмагре», от которого холм получил имя' },
  { id: 'real', layer: 3, rarity: 'common', name: 'Испанский серебряный реал', about: 'Такие ходили в Сан-Антонио в 1750-е' },
  { id: 'bowie', layer: 3, rarity: 'rare', name: 'Нож боуи', about: 'Говорят, братья Боуи искали рудник с таким же' },
  { id: 'miranda', layer: 3, rarity: 'legendary', name: 'Дневник Миранды, 1756', about: 'Строка про «громадный пласт руды», с которой началась легенда' }
];

// One chronicle entry per complete set.
export var CHRONICLE = [
  'Ллано, 1893. Банки закрылись, улицы Бессемер и Шеффилд опустели. Железо оказалось жидким, а угля для печей не нашли.',
  'Шафтер. Серебро везли тоннами, пока жила не кончилась. Рудник закрыли в 1942 году, но мулы помнили дорогу дольше людей.',
  'Терлингуа. В 1922 году отсюда шло сорок процентов ртути страны. Печи остыли в 1942-м, а кирпичи ядовиты до сих пор.',
  'Лос-Альмагрес. Испанцы нашли холм красной охры в 1756 году. Геологи назвали его пустым в 1909-м. Дневник Томаса говорит, что пусто только для тех, кто ищет серебро.'
];

export function artifact(id) {
  return ARTIFACTS.filter(function (a) { return a.id === id; })[0] || null;
}

export function setOf(layer) {
  return ARTIFACTS.filter(function (a) { return a.layer === layer; });
}

// Which artifact a buried valuable of `kind` turns out to be on `layer`.
export function pickArtifact(layer, kind, rand) {
  var pool = setOf(layer).filter(function (a) { return a.rarity === FIND_RARITY[kind]; });
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length)].id;
}

export function setComplete(collection, layer) {
  return setOf(layer).every(function (a) { return (collection[a.id] || 0) > 0; });
}

export function completedSets(collection) {
  return [0, 1, 2, 3].filter(function (layer) { return setComplete(collection, layer); });
}

export function ownedCount(collection) {
  return ARTIFACTS.filter(function (a) { return (collection[a.id] || 0) > 0; }).length;
}

export function spares(collection, layer) {
  return setOf(layer).reduce(function (sum, a) { return sum + Math.max(0, (collection[a.id] || 0) - 1); }, 0);
}

// Three spare copies from a set buy one missing item of that set.
export function swapForMissing(collection, id) {
  var wanted = artifact(id);
  if (!wanted) return { ok: false, message: 'Нет такого предмета' };
  if ((collection[id] || 0) > 0) return { ok: false, message: 'Этот предмет уже есть' };
  if (spares(collection, wanted.layer) < SPARES_FOR_SWAP) return { ok: false, message: 'Нужно ' + SPARES_FOR_SWAP + ' лишних копии из этого набора' };
  var left = SPARES_FOR_SWAP;
  setOf(wanted.layer).forEach(function (a) {
    while (left > 0 && (collection[a.id] || 0) > 1) { collection[a.id]--; left--; }
  });
  collection[id] = 1;
  return { ok: true, message: wanted.name + ': в коллекции' };
}

export function sanitizeCollection(raw) {
  var out = {};
  if (!raw || typeof raw !== 'object') return out;
  ARTIFACTS.forEach(function (a) {
    var n = Math.floor(Number(raw[a.id]));
    if (n > 0 && isFinite(n)) out[a.id] = Math.min(9999, n);
  });
  return out;
}
