// The intro before the first contract and the "how to play" page of the menu.
// One card: who you are and what to do. The rest of the rules wait in the
// menu, and the story goes on in the radio between shifts.

export var INTRO = [
  { title: 'Ллано, Техас, 1889', lines: [
    'Компания из Далласа купила гору, а бурмастером взяли тебя',
    'Поменяй две соседние руды, и три одинаковые в ряд уйдут наверх. Набери цель за отведённые ходы',
    'Вся поднятая руда едет в город над шахтой. Из неё ты построишь плавильню, склад и пристань'
  ] }
];

// The rules for the menu, in the same plain words as the cockpit.
var RULES = [
  { title: 'Как добывают руду', lines: [
    'Поменяй две соседние руды. Три одинаковые в ряд уходят наверх, каскады умножают добычу',
    'Каждый обмен, который собрал линию, тратит один ход. У контракта есть цель: столько руды нужно поднять',
    'Четыре или пять в ряд дают ракету, заряд или бур. Две спецфишки рядом можно поменять между собой'
  ] },
  { title: 'Когда цель собрана', lines: [
    'Можно копать дальше или сдать смену кнопкой внизу. Вся руда твоя, она едет в город',
    'Звёзды дают прибавку к руде. Чем больше ходов осталось к цели, тем больше звёзд',
    'Под рудой прячутся находки: руда, ходы, динамит. Позже из них соберётся коллекция'
  ] }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

export function introSlideHtml(index) {
  var slide = INTRO[index];
  return (INTRO.length > 1 ? '<p class="mine-step">' + (index + 1) + ' из ' + INTRO.length + '</p>' : '') + '<h1 id="mine-intro-title">' + escapeHtml(slide.title) + '</h1>'
    + slide.lines.map(function (line) { return '<p>' + escapeHtml(line) + '</p>'; }).join('');
}

export function howToHtml() {
  return '<h1>Как играть</h1>' + RULES.map(function (slide) {
    return '<h2>' + escapeHtml(slide.title) + '</h2>' + slide.lines.map(function (line) { return '<p>' + escapeHtml(line) + '</p>'; }).join('');
  }).join('') + '<h2>Кабина</h2><p>Сверху добыча и меню. Внизу ходы, трюм и способности. Кнопка «i» рассказывает о корабле</p>';
}
