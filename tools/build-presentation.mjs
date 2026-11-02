// Builds the lecture deck from its sources in docs/presentation:
//   project/deck.json      slide order and title
//   project/slides/*.html  one <section> per slide, as the Slides editor saves it
//   assets/, icons/        the images and icons the slides use
//   fonts/                 the display font (EORA, not in git; a fallback is used without it)
// Writes docs/presentation/lecture-deck.html and, with --pdf, lecture-deck.pdf.
// With --check it compares slide titles with the script in lecture.md and fails on a mismatch.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = resolve('docs/presentation');
const deck = JSON.parse(readFileSync(join(DIR, 'project/deck.json'), 'utf8'));
const assets = readdirSync(join(DIR, 'assets'));
const args = process.argv.slice(2);

function styleOf(attrs) { const m = /style="([^"]*)"/.exec(attrs); return m ? m[1] : ''; }
function prop(style, name) { const m = new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;]+)').exec(style); return m ? m[1].trim() : ''; }
function text(html) { return html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

// The editor's own elements become plain HTML and SVG.
function icon(attrs) {
  const name = /name="([^"]+)"/.exec(attrs)[1], style = styleOf(attrs);
  const svg = readFileSync(join(DIR, 'icons', name + '.svg'), 'utf8').replace(/<!--.*?-->/s, '');
  return svg.replace('<svg', `<svg style="${style};display:block;flex:none"`).replace(/\s(width|height)="24"/g, '');
}
function shape(attrs) {
  const kind = /kind="([^"]+)"/.exec(attrs)[1], style = styleOf(attrs);
  const clip = { 'arrow-right': 'polygon(0 30%,60% 30%,60% 0,100% 50%,60% 100%,60% 70%,0 70%)', 'arrow-left': 'polygon(100% 30%,40% 30%,40% 0,0 50%,40% 100%,40% 70%,100% 70%)', ellipse: 'ellipse(50% 50%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' }[kind];
  return `<div style="${style};flex:none${clip ? ';clip-path:' + clip : ''}"></div>`;
}
function connector(attrs) {
  const n = k => Number((new RegExp(k + '="([^"]+)"').exec(attrs) || [])[1]);
  const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(n), style = styleOf(attrs);
  const colour = prop(style, 'color') || '#fff', width = parseFloat(prop(style, 'border-width')) || 2;
  const dash = prop(style, 'border-style') === 'dashed' ? ` stroke-dasharray="${width * 4} ${width * 3}"` : '';
  const both = /head="both"/.test(attrs), none = /head="none"/.test(attrs);
  return `<svg style="position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none" viewBox="0 0 1920 1080">`
    + `<defs><marker id="h${x1}${y1}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="${colour}" stroke-width="1.5"/></marker></defs>`
    + `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="${width}"${dash}`
    + (none ? '' : ` marker-end="url(#h${x1}${y1})"`) + (both ? ` marker-start="url(#h${x1}${y1})"` : '') + '/></svg>';
}
function blob(id) { const file = assets.find(f => f.startsWith(id)); if (!file) throw new Error('missing asset ' + id); return 'assets/' + file; }

const slides = deck.order.map(id => {
  let html = readFileSync(join(DIR, 'project/slides', id + '.html'), 'utf8');
  const notes = text((/<aside>([\s\S]*?)<\/aside>/.exec(html) || ['', ''])[1]);
  // The title is the first line set in the display face, a heading or a quote.
  const title = text((/<(h1|h2|p)[^>]*Grandis[^>]*>([\s\S]*?)<\/\1>/.exec(html) || ['', '', ''])[2]);
  html = html.replace(/<aside>[\s\S]*?<\/aside>/, '')
    .replace(/\/_blob\/([0-9a-f]+)/g, (_, b) => blob(b))
    .replace(/<x-icon([^>]*)><\/x-icon>/g, (_, a) => icon(a))
    .replace(/<x-shape([^>]*)><\/x-shape>/g, (_, a) => shape(a))
    .replace(/<x-connector([^>]*)><\/x-connector>/g, (_, a) => connector(a));
  return { id, title, notes, html };
});

const font = existsSync(join(DIR, 'fonts/GrandisExtended-Medium.ttf'))
  ? '@font-face{font-family:"Grandis Extended";src:url(fonts/GrandisExtended-Medium.ttf)}' : '';
const page = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${deck.title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
<style>${font}
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0}
body{background:#0b0b0c}
section{position:relative;width:1920px;height:1080px;overflow:hidden;break-after:page;color:#F2F4FA;font-family:Inter,Arial,sans-serif}
h1,h2,h3{font-weight:600}
p,h1,h2,h3{overflow-wrap:break-word}
table{border-collapse:collapse;width:100%}
th,td{padding:12px 16px;text-align:left;vertical-align:top;line-height:1.35;border-bottom:1px solid rgba(255,255,255,.12)}
</style></head><body>
${slides.map(s => s.html).join('\n')}
</body></html>`;
writeFileSync(join(DIR, 'lecture-deck.html'), page);
console.log('ok   lecture-deck.html, ' + slides.length + ' slides' + (font ? '' : ' (display font missing, fallback used)'));

if (args.includes('--pdf')) {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
  if (!chrome) throw new Error('Chrome or Edge is needed for the PDF');
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000', '--print-to-pdf=' + join(DIR, 'lecture-deck.pdf'), pathToFileURL(join(DIR, 'lecture-deck.html')).href], { stdio: 'ignore' });
  console.log('ok   lecture-deck.pdf');
}

if (args.includes('--check')) {
  // The script in lecture.md has one "### Слайд N. Title" per slide, in deck order.
  const script = readFileSync(join(DIR, 'lecture.md'), 'utf8');
  const heads = [...script.matchAll(/^### Слайд (\d+)\. (.+)$/gm)].map(m => ({ n: Number(m[1]), title: m[2].trim() }));
  const norm = s => s.replace(/[«»"]/g, '').toLowerCase();
  let bad = 0;
  if (heads.length !== slides.length) { console.log(`fail script has ${heads.length} slides, deck has ${slides.length}`); bad++; }
  slides.forEach((s, i) => {
    const h = heads[i];
    if (!h || h.n !== i + 1 || norm(h.title) !== norm(s.title)) { console.log(`fail slide ${i + 1}: deck «${s.title}», script «${h ? h.title : 'нет'}»`); bad++; }
  });
  if (bad) process.exit(1);
  console.log('ok   script and deck match, ' + slides.length + ' slides');
}
