// Sound effects decoded from the project files after the first user input.

// Real CC0 samples live in registered project files, decoded on first input.
export function unlockAudio(engine) {
  if (engine.audio) { if (engine.audio.context.state === 'suspended') engine.audio.context.resume().catch(function () {}); return; }
  var AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtor || !engine.runtime.assets || typeof fetch !== 'function') return;
  try {
    var ctx = new AudioCtor();
    var audio = engine.audio = { context: ctx, requests: {}, active: 0 };
    ctx.resume().catch(function () {});
    ['select', 'swap', 'dig', 'find', 'boost'].forEach(function (name) {
      audio.requests[name] = Promise.resolve(engine.runtime.assets.getProjectFileUrl('mine-' + name + '.ogg'))
        .then(function (url) { return fetch(url); }).then(function (response) { if (!response.ok) throw new Error('audio unavailable'); return response.arrayBuffer(); })
        .then(function (bytes) { return ctx.decodeAudioData(bytes); }).catch(function () { return null; });
    });
  } catch (_) { engine.audio = null; }
}

export function playSfx(engine, name) {
  if (engine.muted || !engine.audio || !engine.audio.requests[name]) return;
  engine.audio.requests[name].then(function (buffer) {
    var audio = engine.audio;
    if (!buffer || engine.muted || audio.active >= 5 || audio.context.state !== 'running') return;
    var source = audio.context.createBufferSource(), gain = audio.context.createGain();
    source.buffer = buffer;
    gain.gain.value = name === 'select' ? 0.06 : name === 'swap' ? 0.1 : name === 'dig' ? 0.23 : 0.2;
    source.connect(gain); gain.connect(audio.context.destination);
    audio.active++;
    source.onended = function () { audio.active--; source.disconnect(); gain.disconnect(); };
    source.start();
  });
}
