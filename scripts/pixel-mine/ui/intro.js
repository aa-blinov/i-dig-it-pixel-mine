// The intro before the first contract and the "how to play" page of the menu.
// Told like the opening of a book: who you are and why you dig, then the
// rules inside the story, in three short chapters.

export var INTRO = [
  { title: 'Ллано, Техас, 1889', lines: [
    'Весной в Ллано приехали люди из Далласа и купили гору. Говорили, что под ней железа хватит на новый Питтсбург',
    'Бурмастером взяли тебя. Твоя смена начинается в клети, которая уходит в темноту под гранитом',
    'Наверху остаются Марта у телеграфа и старый Илай, который помнит каждую жилу в этих холмах'
  ] },
  { title: 'Как добывают руду', lines: [
    'Внизу руда лежит плотно, камень к камню. Поменяй две соседние, и три одинаковые в ряд уйдут наверх',
    'Каждый такой ход стоит одного топлива. Контракт назначает норму: столько руды компания ждёт от смены',
    'Сложи четыре или пять в ряд, и получится ракета, заряд или бур. Тогда шахта ответит громче'
  ] },
  { title: 'Когда норма собрана', lines: [
    'Норма есть, а топливо ещё осталось? Копай дальше: всё сверх нормы компания платит кредитами',
    'Под рудой прячутся находки. Они летят в трюм корабля и потом ложатся в коллекцию',
    'Сдай смену кнопкой наверху. Между сменами ты на базе: строишь, читаешь телеграммы и решаешь, куда спускаться дальше'
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
