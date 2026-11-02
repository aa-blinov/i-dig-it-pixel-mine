// Markup, styles and help text of the semantic DOM interface. It is drawn
// like the canvas cockpit: dark outlines, bevelled steel panels, brass
// buttons, square corners and a pixel font. No decorative stripes or rules.
import { LAYERS, ORES } from "../config.js";

// The cockpit's colours, taken from the backdrop.
export var UI_THEME = {
  ink: '#faf0cf', muted: '#c9d3c8', gold: '#edc271',
  outline: '#111719', bevel: '#69736e', shade: '#10181b',
  steel: '#263034', deep: '#172022', ground: '#1d2629',
  brass: '#8a5f2a', brassLight: '#d9a85a', brassDark: '#6b4a22'
};

// The font stack: the pixel font is loaded from the project files at start.
export var UI_FONT = '"Pixel Mine", Verdana, sans-serif';
export var UI_TITLE_FONT = '"Pixel Mine Title", "Pixel Mine", Verdana, sans-serif';

export function interfaceCss() {
  var t = UI_THEME, s = '#mine-interface';
  var bevel = 'border:3px solid ' + t.outline + ';box-shadow:inset 0 0 0 3px ' + t.bevel + ',inset 0 -7px 0 3px ' + t.shade;
  var brass = 'border:3px solid ' + t.outline + ';box-shadow:inset 0 0 0 2px ' + t.brassLight + ',inset 0 -5px 0 2px ' + t.brassDark;
  return [
    s + '{position:fixed;inset:0;z-index:100;pointer-events:none;color:' + t.ink + ';font:18px/1.45 ' + UI_FONT + ';color-scheme:dark;-webkit-font-smoothing:none}',
    s + ' h1,' + s + ' h2,' + s + ' h3,' + s + ' button,' + s + ' .mine-logo,' + s + ' .chip,' + s + ' .mine-stars,' + s + ' .mine-wallet,' + s + ' .mine-rows dd,' + s + ' summary{font-family:' + UI_TITLE_FONT + ';letter-spacing:.5px}',
    s + ' *{box-sizing:border-box}',
    s + ' .mine-camp,' + s + ' .mine-sheet,' + s + ' .mine-tools,' + s + ' .mine-result-back{pointer-events:auto}',
    s + ' [hidden]{display:none!important}',
    // Panels and buttons: the same bevel as the cockpit.
    s + ' .panel{background:' + t.steel + ';' + bevel + ';padding:18px 20px 22px;margin:0 0 16px}',
    s + ' button{font-size:inherit;line-height:1.2;color:' + t.ink + ';background:' + t.steel + ';' + bevel + ';padding:10px 18px 13px;min-height:48px;cursor:pointer;overflow-wrap:anywhere;text-align:center}',
    s + ' button:hover:not(:disabled){background:#2f3c40}',
    s + ' button:active:not(:disabled){transform:translateY(2px)}',
    s + ' button.primary{background:' + t.brass + ';' + brass + ';color:#fff6dc;text-shadow:2px 2px 0 ' + t.brassDark + '}',
    s + ' button.primary:hover:not(:disabled){background:#bd8a45}',
    s + ' button:disabled{color:#8e9a93;background:' + t.deep + ';cursor:default}',
    s + ' button[aria-pressed=true]{background:#3a4a3f;color:' + t.gold + '}',
    s + ' :focus-visible{outline:3px solid #ffe3a0;outline-offset:2px}',
    s + ' h1{font-size:30px;line-height:1.15;margin:0 0 12px;color:' + t.gold + ';text-shadow:3px 3px 0 ' + t.outline + '}',
    s + ' h1:focus,' + s + ' h2:focus{outline:none}',
    s + ' p{text-wrap:pretty} #mine-interface h2{font-size:24px;margin:0 0 10px;color:' + t.gold + ';text-shadow:2px 2px 0 ' + t.outline + '}',
    s + ' h3{font-size:18px;margin:0 0 6px}',
    s + ' p{margin:8px 0}',
    s + ' .muted{color:' + t.muted + '}',
    // Base.
    s + ' .mine-camp{position:fixed;inset:0;z-index:100;background:' + t.ground + ';overflow:auto;padding:16px max(16px,calc((100vw - 720px)/2)) 32px;scrollbar-color:' + t.bevel + ' ' + t.ground + '}',
    s + ' .mine-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px 15px}',
    s + ' .mine-logo{font-size:24px;color:' + t.gold + ';text-shadow:2px 2px 0 ' + t.outline + ';letter-spacing:1px}',
    s + ' .mine-wallet{margin:0;font-size:20px;font-variant-numeric:tabular-nums}',
    // A contract fact: a quiet label over its value.
    s + ' .chips .chip.stat{display:flex;flex-direction:column;gap:4px;flex:1 1 110px;padding:8px 12px 10px}',
    s + ' .chips .chip.stat small{font-size:13px;color:' + t.muted + '}',
    s + ' .chips .chip.stat b{font-family:"Pixel Mine Title","Pixel Mine",monospace;font-weight:normal;font-size:15px;color:' + t.gold + '}',
    s + ' .chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;padding:0}',
    s + ' .chip{display:inline-block;background:' + t.deep + ';border:3px solid ' + t.outline + ';padding:3px 10px 5px;color:' + t.ink + '}',
    s + ' .chip.gold{color:' + t.gold + '}',
    s + ' .mine-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0 0}',
    s + ' .mine-actions>button{flex:1 1 180px}',
    s + ' .mine-chooser{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    s + ' .mine-chooser button{min-width:52px;flex:0 0 auto;padding:8px 12px 11px}',
    s + ' .mine-radio{background:' + t.deep + '}',
    s + ' .mine-radio p{margin:6px 0 10px}',
    s + ' .mine-radio .voice{display:block;color:' + t.gold + ';font-family:' + UI_TITLE_FONT + ';font-size:16px}',
    s + ' .mine-module{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 18px;padding:14px 16px 17px;margin:12px 0 0;background:' + t.deep + ';border:3px solid ' + t.outline + '}',
    s + ' .mine-module p{max-width:46ch;margin:4px 0 0}',
    s + ' .mine-module .mine-actions{margin:0;flex-direction:column;align-items:stretch;min-width:150px}',
    s + ' .mine-module .level{color:' + t.gold + '}',
    s + ' details>summary{cursor:pointer;min-height:44px;padding:4px 0;color:' + t.gold + '}',
    s + ' table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;margin:10px 0}',
    s + ' caption{text-align:left;color:' + t.gold + ';padding:6px 0}',
    s + ' th,' + s + ' td{text-align:left;padding:6px 10px}',
    s + ' tbody tr:nth-child(odd){background:' + t.deep + '}',
    // In the shift: toolbar, sheet and the accessible field.
    s + ' .mine-tools{position:fixed;left:0;right:0;top:0;z-index:110;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:6px 12px;background:' + t.steel + ';border-bottom:3px solid ' + t.outline + '}',
    s + ' .mine-tools p{margin:0;display:flex;gap:14px;font-variant-numeric:tabular-nums}',
    s + ' .mine-tools button{flex-shrink:0;min-height:44px;padding:6px 14px 9px}',
    // The pause menu and the intro: one narrow card over a dimmed shaft.
    s + ' .mine-sheet,' + s + ' .mine-intro{position:fixed;inset:0;z-index:120;background:rgba(10,14,16,.72);overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px}',
    s + ' .mine-sheet[hidden],' + s + ' .mine-intro[hidden]{display:none}',
    s + ' .mine-card{box-sizing:border-box;width:min(100%,400px);max-height:100%;overflow:auto;background:' + t.steel + ';border:3px solid ' + t.outline + ';box-shadow:inset 0 0 0 3px ' + t.bevel + ';padding:20px}',
    s + ' .mine-card h1{margin:0 0 6px;font-size:28px}',
    s + ' .mine-card .mine-menu{display:grid;gap:10px;margin-top:14px}',
    s + ' .mine-card .mine-menu button{width:100%;min-height:52px}',
    s + ' .mine-card .mine-page p{margin:0 0 10px}',
    s + ' .mine-card .mine-step{color:' + t.muted + ';margin:0 0 4px}',
    s + ' .mine-tabs button.is-new{border-color:' + t.brassLight + ';color:' + t.gold + '}',
    s + ' .mine-tabs button.is-new::after{content:" новое";color:' + t.brassLight + '}',
    s + ' .mine-card .mine-nav{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}',
    s + ' .mine-card button{white-space:nowrap;padding-left:8px;padding-right:8px}',
    s + ' .mine-grid{display:grid;gap:4px;margin:12px 0;overflow:auto}',
    s + ' .mine-row{display:grid;gap:4px;min-width:440px}',
    s + ' .mine-grid button{padding:8px 2px;font-size:14px;min-height:52px}',
    s + ' .mine-grid button[aria-selected=true]{background:' + t.brass + '}',
    s + ' .mine-live{font-variant-numeric:tabular-nums}',
    // The result of a shift: a small window over the mine, not a new screen.
    s + ' .mine-result-back{position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,14,16,.55);animation:mine-fade .25s ease-out}',
    s + ' .mine-result{width:min(440px,100%);max-height:92vh;overflow:auto;margin:0;animation:mine-pop .32s cubic-bezier(.2,1.4,.4,1)}',
    s + ' .mine-result h2{font-size:26px;margin:0 0 6px}',
    s + ' .mine-stars{font-size:26px;letter-spacing:4px;color:' + t.gold + ';margin:0 0 8px;text-shadow:2px 2px 0 ' + t.outline + '}',
    s + ' .mine-stars .off{color:#4a5652}',
    s + ' .mine-rows{display:grid;grid-template-columns:1fr auto;gap:6px 16px;margin:10px 0;padding:10px 12px 12px;background:' + t.deep + ';border:3px solid ' + t.outline + ';font-variant-numeric:tabular-nums}',
    s + ' .mine-rows dt{color:' + t.muted + '}',
    s + ' .mine-rows dd{margin:0;text-align:right}',
    s + ' .mine-rows dd.gold{color:' + t.gold + '}',
    s + ' .mine-unlock{color:' + t.gold + '}',
    s + ' .mine-card{background:' + t.deep + ';margin:8px 0;padding:10px 12px;font:16px/1.5 system-ui,sans-serif;white-space:pre-wrap;text-align:center}',
    s + ' [data-result-share-note]:empty{display:none}',
    // Abilities in the toolbar.
    s + ' .mine-abilities{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}',
    s + ' .mine-abilities button{min-height:44px;padding:4px 10px 7px;font-size:15px}',
    s + ' .mine-abilities button.ready{background:' + t.brass + ';' + brass + ';color:#fff6dc}',
    s + ' .mine-charge{font-variant-numeric:tabular-nums;color:' + t.gold + '}',
    // Tabs and the base grid.
    s + ' .mine-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}',
    s + ' .mine-tabs button{flex:1 1 120px;min-height:44px;padding:8px 10px 11px}',
    s + ' .mine-income{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin:0 0 12px}',
    s + ' .mine-income p{margin:0}',
    s + ' [data-panel=base].is-empty:not([hidden]){display:flex;flex-direction:column}',
    s + ' [data-panel=base].is-empty [data-basecell]{order:-1}',
    s + ' .mine-basegrid{display:grid;grid-template-columns:repeat(6,minmax(44px,1fr));gap:4px;padding:6px;background:#3b2a1d;border:3px solid ' + t.outline + '}',
    s + ' .mine-basegrid button{min-height:56px;padding:2px;position:relative;background:#5a4128;box-shadow:inset 0 0 0 2px #7a5a3a,inset 0 -4px 0 2px #2e2014;display:flex;align-items:center;justify-content:center;color:#d8c7a3}',
    s + ' .mine-basegrid button.empty{background:#4a3522;color:#9a8466;font-size:22px}',
    s + ' .mine-basegrid button[aria-pressed=true]{background:#6b5a2e;outline:3px solid #ffe3a0;outline-offset:-3px}',
    s + ' .mine-basegrid img{width:40px;height:40px;image-rendering:pixelated}',
    s + ' .mine-basegrid .lvl{position:absolute;right:3px;bottom:2px;font-size:14px;color:' + t.gold + ';text-shadow:1px 1px 0 ' + t.outline + '}',
    s + ' .mine-build{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:10px 12px 12px;margin:10px 0 0;background:' + t.deep + ';border:3px solid ' + t.outline + '}',
    s + ' .mine-build img{width:48px;height:48px;image-rendering:pixelated}',
    s + ' .mine-build p{margin:2px 0 0;color:' + t.muted + '}',
    s + ' .mine-build button{min-width:150px}',
    // On a phone the score and fuel are already on the board, so the bar keeps
    // only the buttons and stays one or two rows high above the field.
    '@media(max-width:540px){' + s + ' .mine-tools{gap:6px;padding:4px 6px}' + s + ' .mine-tools p{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' + s + ' .mine-tools button{padding:4px 10px 7px}' + s + ' .mine-abilities button{padding:4px 8px 7px;font-size:14px}}',
    '@media(max-width:540px){' + s + ' .mine-build{grid-template-columns:48px minmax(0,1fr)}' + s + ' .mine-build button{grid-column:1/-1}}',
    '@keyframes mine-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes mine-pop{from{opacity:0;transform:translateY(16px) scale(.94)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){' + s + ' .mine-result-back,' + s + ' .mine-result{animation:none}}',
    s + ' .mine-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}',
    '@media(max-width:540px){' + s + ' .mine-module{grid-template-columns:1fr}' + s + ' .mine-module .mine-actions{flex-direction:row;flex-wrap:wrap}' + s + ' .mine-module .mine-actions button{flex:1}' + s + ' h1{font-size:26px}}'
  ].join('');
}

export var INTERFACE_HTML = ''
  + '<main class="mine-camp" aria-labelledby="mine-camp-title">'
  + '<header class="mine-head panel"><strong class="mine-logo">I DIG IT</strong><p class="mine-wallet" data-wallet></p><button data-sound></button></header>'
  + '<nav class="mine-tabs" data-tabs hidden aria-label="Разделы"><button data-tab="shift">Смена</button><button data-tab="base">База</button><button data-tab="lab">Лаборатория</button><button data-tab="collection">Коллекция</button><button data-tab="fleet">Флот</button></nav>'
  + '<div data-panel="base" hidden><section class="panel"><h2>База</h2><div class="mine-income"><p data-income></p><button class="primary" data-collect></button></div>'
  + '<div class="mine-basegrid" data-basegrid role="grid" aria-label="Участок базы, 6 на 6"></div><p role="status" data-base-status></p></section>'
  + '<section class="panel" data-basecell hidden></section></div>'
  + '<div data-panel="lab" hidden></div><div data-panel="collection" hidden></div><div data-panel="fleet" hidden></div>'
  + '<div data-panel="shift">'
  + '<section class="panel"><h1 id="mine-camp-title" tabindex="-1"></h1><ul class="chips" data-card></ul><p data-summary></p>'
  + '<div class="mine-actions"><button class="primary" data-start></button><button data-daily data-after-daily>Шахта дня: одно поле на всех</button></div>'
  + '<div data-contracts hidden><p class="muted">Повторить пройденный контракт. Награда меньше, излишек и находки твои</p><div class="mine-chooser" data-contract-list></div></div></section>'
  + '<section class="panel mine-radio" data-radio hidden aria-label="Рация"><h2>Рация</h2><div data-radio-lines></div></section>'
  + '<p class="muted" data-collection></p>'
  + '<section class="panel" data-workshop hidden><h2 data-slots></h2><p class="muted">Модули ставятся на корабль перед сменой. Кредиты приходят за каждую смену и за руду сверх нормы</p><div data-modules></div><p role="status" data-shop-status></p></section>'
  + '<section class="panel" data-after-daily><h2>Шахта дня</h2><p class="muted">Одно поле на всех, без модулей и без награды в кредитах. Сравнивай добычу с друзьями по коду</p><div class="mine-actions"><button data-share>Копировать итог</button><button data-code>Ввести код друга</button></div></section>'
  + '<details class="panel" data-guide><summary>Как добывать и что можно найти</summary><div data-guide-body></div></details>'
  + '</div>'
  + '<p class="muted">Прогресс сохраняется на этом устройстве. Проваленный контракт можно начать снова</p>'
  + '</main>'
  + '<div class="mine-tools" hidden><p data-hud></p><div class="mine-abilities" data-abilities></div><button data-open-sheet>Управление</button></div>'
  + '<section class="mine-sheet" hidden aria-labelledby="mine-sheet-title"><div class="mine-card">'
  + '<div data-menu-main><h1 id="mine-sheet-title">Пауза</h1><p class="mine-live" role="status" data-game-status></p>'
  + '<div class="mine-menu"><button class="primary" data-close-sheet>Продолжить</button><button data-menu-page="howto">Как играть</button><button data-menu-page="story">Сюжет</button><button data-game-sound></button><button data-leave>Выйти на базу</button></div></div>'
  + '<div data-menu-sub hidden><div class="mine-page" data-menu-body></div><div class="mine-menu"><button data-menu-back>Назад</button></div></div>'
  // The field as buttons, for screen readers only; the canvas is the field for everyone else.
  + '<div class="mine-sr"><button data-cancel-selection>Снять выбор</button><div class="mine-grid" role="grid" aria-label="Поле шахты" data-grid></div><div data-game-guide></div></div>'
  + '</div></section>'
  + '<section class="mine-intro" hidden aria-labelledby="mine-intro-title"><div class="mine-card"><div class="mine-page" data-intro-body></div><div class="mine-nav"><button data-intro-skip>Пропустить</button><button class="primary" data-intro-next>Дальше</button></div></div></section>'
  + '<div class="mine-result-back" data-result hidden><section class="mine-result panel" role="dialog" aria-modal="true" aria-labelledby="mine-result-title">'
  + '<h2 id="mine-result-title" tabindex="-1" data-result-title></h2><p class="mine-stars" data-result-stars></p><dl class="mine-rows" data-result-rows></dl>'
  + '<div class="mine-radio" data-result-radio hidden></div><p class="mine-unlock" data-result-unlock hidden></p>'
  + '<pre class="mine-card" data-result-card hidden></pre><p class="muted" data-result-share-note role="status"></p>'
  + '<div class="mine-actions"><button class="primary" data-result-share hidden>Поделиться итогом</button><button class="primary" data-result-next></button><button data-result-base>На базу</button></div></section></div>'
  + '<p class="mine-sr" role="status" aria-live="polite" data-announcement></p>';

export function guideHtml() {
  return '<p>Каждый обмен, который собирает линию, сжигает единицу топлива. У каждого контракта своя норма, свой запас топлива и свой размер поля: чем глубже, тем больше поле и тем меньше топлива. Каскады умножают добычу.</p>'
    + '<p>Норма закрывает контракт. Всё, что добудешь сверх нормы, идёт в карман: 20 руды дают кредит, а запас топлива на момент нормы добавляет до 30%. Смену можно сдать сразу после нормы или копать до последней капли топлива.</p>'
    + '<h3>Спецфишки</h3><ul><li>Четыре в ряд: ракета. Сносит строку, если менял руду по горизонтали, или столбец, если по вертикали</li><li>Г или Т из пяти: заряд, взрыв 3×3</li><li>Пять в ряд: алмазный бур. Поменяй его с любой рудой, и он заберёт всю руду этого вида</li><li>Две спецфишки рядом можно поменять местами: выйдет крест, широкий крест или большой взрыв</li></ul>'
    + LAYERS.map(function (layer) { return '<table><caption>' + layer.name + '</caption><thead><tr><th>Руда</th><th>Очки за кусок</th></tr></thead><tbody>' + layer.ores.map(function (ore) { return '<tr><td>' + ORES[ore].name + '</td><td>' + ORES[ore].value + '</td></tr>'; }).join('') + '</tbody></table>'; }).join('')
    + '<h3>Находки</h3><ul><li>Кольцо +250, окаменелость +150, череп ящера +500. Улетают в трюм, в нём три места. Если трюм полон, находка продаётся на месте</li><li>Топливная ячейка +3 топлива. Без модулей до 3 дополнительных единиц за смену, с аккумулятором до 5 или 6. Лишнее превращается в 50 руды</li><li>Динамит вскрывает 3×3, буровой заряд вскрывает столбец. Взрыв может открыть другие находки и спецфишки</li><li>Геосканер отмечает тайники, но не показывает, что в них</li></ul><p>Модули стоят 80 и 180 кредитов. Слота два, сборка фиксируется при старте смены</p>';
}
