// Review renderer, not a Construct export. It runs the exact shipped engine modules
// against a small documented-interface adapter and reads the real project art.
// ?demo seeds a mid-campaign profile with every base tab open.
if (new URLSearchParams(location.search).has('demo')) localStorage.setItem('pixel-mine.profile.v2', JSON.stringify({ version: 2, credits: 900, completed: 8, collection: { scrip: 3, ironnews: 2, flask: 2 }, abilities: ['dynamite', 'cutter'], fleet: { seq: 1, trips: [{ id: 1, ship: 'probe', layer: 2, hours: 1, start: Date.now(), credits: 30, artifact: null }] }, base: { seq: 4, last: Date.now(), buildings: [{ id: 1, type: 'storage', x: 0, y: 0, level: 1 }, { id: 2, type: 'dock', x: 2, y: 2, level: 2 }, { id: 3, type: 'lab', x: 5, y: 5, level: 1 }, { id: 4, type: 'museum', x: 0, y: 4, level: 1 }] } }));
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const state = document.querySelector('#state');
const layout = await fetch('/layouts/Play.json').then(response => response.json());
const project = await fetch('/project.c3proj').then(response => response.json());
const types = new Map();
let instances = [];
let currentLayer = '';
// Say something while the art loads, the way Construct shows its loader.
context.fillStyle = '#12181b'; context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = '#edc271'; context.font = '22px Verdana, sans-serif'; context.textAlign = 'center';
context.fillText('Шахта загружается…', canvas.width / 2, canvas.height / 2);
const loaded = await Promise.all(project.objectTypes.items.map(async name => {
  const definition = await fetch(`/objectTypes/${name}.json`).then(response => response.json());
  const frame = definition.animations?.items[0]?.frames[0];
  const images = !frame ? [] : await Promise.all(definition.animations.items[0].frames.map(async (_, index) => {
    const current = new Image();
    current.src = `/images/${name.toLowerCase()}-animation%201-${String(index).padStart(3, '0')}.png`;
    await current.decode();
    return current;
  }));
  return [name, { definition, frame, image: images[0], images }];
}));
for (const [name, type] of loaded) types.set(name, type);
class Instance {
  constructor(name, x, y, world = {}, properties = {}) {
    const type = types.get(name);
    this.type = name; this.x = x; this.y = y;
    this.width = world.width ?? type.frame?.width ?? 64;
    this.height = world.height ?? type.frame?.height ?? 64;
    this.originX = world.originX ?? type.frame?.originX ?? 0;
    this.originY = world.originY ?? type.frame?.originY ?? 0;
    this.angle = world.angle ?? 0; this.opacity = 1; this.isVisible = true;
    this.animationFrame = 0;
    this.properties = properties; this.text = properties.text || '';
    this.layer = currentLayer;
    instances.push(this);
  }
  setSize(width, height) { this.width = width; this.height = height; }
  setPosition(x, y) { this.x = x; this.y = y; }
  destroy() { this.destroyed = true; }
  moveToTop() { const at = instances.indexOf(this); if (at >= 0) { instances.splice(at, 1); instances.push(this); } }
  setAutoResolutionMode() {}
}
const listeners = {};
const runtime = {
  dt: 1 / 60,
  assets: { getProjectFileUrl(name) { return '/files/' + name; } },
  objects: Object.fromEntries([...types.keys()].map(name => [name, {
    createInstance(layer, x, y) { currentLayer = layer; return new Instance(name, x, y); },
    getFirstInstance() { return instances.find(instance => !instance.destroyed && instance.type === name); },
  }])),
  addEventListener(name, listener) { (listeners[name] ||= []).push(listener); },
  layout: { getLayer() { return { layerToCssPx(x, y) {
    const bounds = canvas.getBoundingClientRect();
    return [bounds.left + x * bounds.width / 720, bounds.top + y * bounds.height / 1280];
  }, cssPxToLayer(x, y) {
    const bounds = canvas.getBoundingClientRect();
    return [(x - bounds.left) * 720 / bounds.width, (y - bounds.top) * 1280 / bounds.height];
  } }; } },
};
for (const layer of layout.layers) for (const placed of layer.instances) {
  currentLayer = layer.name;
  new Instance(placed.type, placed.world.x, placed.world.y, placed.world, placed.properties);
}
globalThis.runtime = runtime;
// The same call the event sheet makes: PixelMine.start(runtime).
const PixelMine = await import('/scripts/pixel-mine/index.js');
PixelMine.start(runtime);
canvas.addEventListener('pointerup', event => listeners.pointerup?.forEach(listener => listener(event)));
canvas.addEventListener('pointerdown', event => { canvas.focus({ preventScroll: true }); listeners.pointerdown?.forEach(listener => listener(event)); });
canvas.addEventListener('keydown', event => { if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault(); listeners.keydown?.forEach(listener => listener(event)); });
function drawText(instance) {
  const props = instance.properties;
  const size = Number(instance.sizePt ?? props.size ?? 20) * 4 / 3;
  const color = instance.fontColor || props.color || [1, 1, 1];
  context.fillStyle = `rgb(${color.slice(0, 3).map(value => Math.round(value * 255)).join(' ')})`;
  context.font = `${(instance.isBold ?? props.bold) ? 'bold ' : ''}${size}px "${instance.fontFace || props.font || 'Verdana'}", sans-serif`;
  const left = instance.horizontalAlign === 'left';
  context.textAlign = left ? 'left' : 'center'; context.textBaseline = 'middle';
  const lines = [];
  for (const paragraph of instance.text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const trial = line ? `${line} ${word}` : word;
      if (line && context.measureText(trial).width > instance.width - 12) { lines.push(line); line = word; }
      else line = trial;
    }
    lines.push(line);
  }
  lines.forEach((line, index) => context.fillText(line, left ? 4 : instance.width / 2, instance.height / 2 + (index - (lines.length - 1) / 2) * size * 1.15));
}
function draw() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(bounds.width * ratio), height = Math.round(bounds.height * ratio);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  context.setTransform(width / 720, 0, 0, height / 1280, 0, 0);
  context.clearRect(0, 0, 720, 1280); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
  for (const instance of instances) {
    if (instance.destroyed || !instance.isVisible) continue;
    const type = types.get(instance.type);
    context.save(); context.globalAlpha = instance.opacity;
    context.translate(Math.round(instance.x), Math.round(instance.y)); context.rotate(instance.angle);
    context.translate(-instance.originX * instance.width, -instance.originY * instance.height);
    if (type.image) context.drawImage(type.images[instance.animationFrame] || type.image, 0, 0, instance.width, instance.height);
    else drawText(instance);
    context.restore();
  }
}
let last = performance.now();
let lastState = '';
function frame(now) {
  runtime.dt = Math.min((now - last) / 1000, 0.05); last = now;
  listeners.tick?.forEach(listener => listener());
  instances = instances.filter(instance => !instance.destroyed);
  draw();
  const engine = runtime.__m3;
  const summary = `Добыча ${engine.score}, топливо ${engine.moves}, ${engine.phase}, руды ${engine.cells.filter(Boolean).length}, находок ${engine.findCount}, звук ${engine.muted ? 'выключен' : 'включён'}`;
  if (summary !== lastState) { state.value = summary; lastState = summary; }
  requestAnimationFrame(frame);
}
// For automated checks in a background tab, where animation frames do not run:
// advance the game by `seconds` of 60 fps ticks and draw once.
function advance(seconds = 1) {
  runtime.dt = 1 / 60;
  for (let i = 0; i < Math.round(seconds * 60); i++) { listeners.tick?.forEach(listener => listener()); instances = instances.filter(instance => !instance.destroyed); }
  draw();
}
globalThis.__mineReview = { runtime, instances: () => instances, canvas, advance };
requestAnimationFrame(frame);
// ?tab=fleet opens a base tab, so URL scanners can check each screen.
const reviewTab = new URLSearchParams(location.search).get('tab');
if (reviewTab) { advance(0.5); document.querySelector(`[data-tab="${reviewTab}"]`)?.click(); advance(0.5); }
