// The intro before the first contract and the "how to play" page of the menu.
// Who you are and why you dig first, then the rules in three short steps.

export var INTRO = [
  { title: 'Ллано, Техас, 1889', lines: [
    'Ты бурмастер новой шахты. Город ждёт железного бума',
    'Выполняй контракты, и участок не закроют. По телеграфу помогут Марта и старый Илай'
  ] },
  { title: 'Как добывать', lines: [
    'Поменяй местами две соседние руды. Три одинаковые в ряд уходят в добычу',
    'Каждый ход тратит одно топливо. Набери норму, то есть столько руды, сколько просит контракт, пока топливо не кончилось',
    'Четыре и пять в ряд дают спецфишки: ракеты, заряды и бур'
  ] },
  { title: 'Что сверху нормы', lines: [
    'Норма есть, а топливо осталось? Копай дальше: всё сверх нормы превращается в кредиты, это твои деньги',
    'Под рудой спрятаны находки. Они летят в трюм корабля внизу и пополняют коллекцию',
    'Сдай смену кнопкой вверху. Между сменами на базе строишь и открываешь новое'
  ] }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

export function introSlideHtml(index) {
  var slide = INTRO[index];
  return '<p class="mine-step">' + (index + 1) + ' из ' + INTRO.length + '</p><h1 id="mine-intro-title">' + escapeHtml(slide.title) + '</h1>'
    + slide.lines.map(function (line) { return '<p>' + escapeHtml(line) + '</p>'; }).join('');
}

export function howToHtml() {
  return '<h1>Как играть</h1>' + INTRO.slice(1).map(function (slide) {
    return '<h2>' + escapeHtml(slide.title) + '</h2>' + slide.lines.map(function (line) { return '<p>' + escapeHtml(line) + '</p>'; }).join('');
  }).join('') + '<h2>Кабина</h2><p>Сверху добыча и меню. Внизу топливо, трюм и способности. Кнопка «i» рассказывает о корабле</p>';
}
