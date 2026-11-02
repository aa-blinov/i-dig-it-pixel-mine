// The town over the mine: the strip of sky above the field shows what the
// player has built, each building on a fixed spot along the grass, and the
// light of the chapter (green Llano, yellow Shafter, red Terlingua, night
// over Los Almagres). It is the same town as the base screen, seen from afar.
import { BUILDINGS } from "../config.js";

// Where each building stands, in layout units from the left of the strip,
// right of the camp house that is drawn into the backdrop.
export var SKYLINE_SLOTS = { smelter: 224, storage: 276, autodrill: 324, generator: 372, lift: 420, lab: 468, museum: 516, quarters: 572, dock: 620 };

// The light of each chapter, laid over the painted sky.
export var CHAPTER_SKY = [
  { name: 'Ллано', tint: 'transparent' },
  { name: 'Шафтер', tint: 'linear-gradient(180deg,rgba(255,196,92,.38),rgba(255,170,60,.12) 70%,transparent)' },
  { name: 'Терлингуа', tint: 'linear-gradient(180deg,rgba(214,70,40,.58),rgba(255,110,50,.32) 70%,transparent)' },
  { name: 'Лос-Альмагрес', tint: 'linear-gradient(180deg,rgba(8,12,40,.78),rgba(16,22,60,.55) 75%,rgba(16,22,60,.3))' }
];

export var SKYLINE_CSS = [
  '#mine-cockpit .ck-sky{overflow:hidden;pointer-events:none}',
  '#mine-cockpit .ck-sky .tint,#mine-cockpit .ck-sky .stars{position:absolute;inset:0}',
  '#mine-cockpit .ck-sky .stars{background-image:radial-gradient(1px 1px at 12% 20%,#fff,transparent),radial-gradient(1px 1px at 31% 45%,#fff,transparent),radial-gradient(1px 1px at 52% 15%,#fff,transparent),radial-gradient(1px 1px at 68% 38%,#fff,transparent),radial-gradient(1px 1px at 84% 22%,#fff,transparent),radial-gradient(1px 1px at 93% 50%,#fff,transparent)}',
  '#mine-cockpit .ck-sky img{position:absolute;bottom:calc(var(--u)*20);image-rendering:pixelated;transform:translateX(-50%)}',
  '#mine-cockpit .ck-sky .night img{filter:drop-shadow(0 0 calc(var(--u)*5) rgba(255,214,120,.9))}',
  '#mine-cockpit .ck-sky .smoke{position:absolute;width:calc(var(--u)*8);height:calc(var(--u)*8);border-radius:50%;background:rgba(220,220,220,.7);animation:ck-smoke 2.4s ease-out infinite}',
  '@keyframes ck-smoke{0%{transform:translate(0,0) scale(.6);opacity:.8}100%{transform:translate(calc(var(--u)*6),calc(var(--u)*-34)) scale(1.8);opacity:0}}',
  '@media (prefers-reduced-motion:reduce){#mine-cockpit .ck-sky .smoke{animation:none;opacity:.5}}'
].join('');

// The chapter a shift belongs to: one per layer of the mine.
export function chapterOf(engine) {
  var layer = engine.setup && engine.setup.layer !== undefined ? engine.setup.layer : 0;
  return Math.max(0, Math.min(CHAPTER_SKY.length - 1, layer));
}

// The strip's inner HTML for a base and a chapter; `icon` maps a file name to its URL.
export function skylineHtml(base, chapter, icon) {
  var sky = CHAPTER_SKY[chapter];
  var html = '<div class="tint" style="background:' + sky.tint + '"></div>' + (chapter === 3 ? '<div class="stars"></div>' : '');
  var people = (base && base.buildings || []).filter(function (b) { return SKYLINE_SLOTS[b.type] !== undefined && !BUILDINGS[b.type].decor; });
  html += '<div class="' + (chapter === 3 ? 'night' : '') + '">' + people.map(function (b) {
    // A higher level stands taller on the skyline.
    var size = 34 + b.level * 6, x = SKYLINE_SLOTS[b.type], url = icon('b-' + b.type + '.png');
    var img = url ? '<img src="' + url + '" alt="" style="left:calc(var(--u)*' + x + ');width:calc(var(--u)*' + size + ');height:calc(var(--u)*' + size + ')">' : '';
    var smoke = b.type === 'smelter' ? '<span class="smoke" style="left:calc(var(--u)*' + (x + 6) + ');bottom:calc(var(--u)*' + (20 + size) + ')"></span>'
      + (b.level >= 3 ? '<span class="smoke" style="left:calc(var(--u)*' + (x - 8) + ');bottom:calc(var(--u)*' + (20 + size) + ');animation-delay:1.2s"></span>' : '') : '';
    return img + smoke;
  }).join('') + '</div>';
  return html;
}

// A key that changes only when the picture does.
export function skylineKey(base, chapter) {
  return chapter + ':' + (base && base.buildings || []).map(function (b) { return b.type + b.level; }).join(',');
}
