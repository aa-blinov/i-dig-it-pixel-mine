// Seeded randomness and the daily challenge code.

export function seededRandom(seed) {
  var value = 2166136261;
  for (var i = 0; i < String(seed).length; i++) value = Math.imul(value ^ String(seed).charCodeAt(i), 16777619);
  return function () { value += 0x6D2B79F5; var n = value; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

export function dailyCode() {
  try { var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); return ['year', 'month', 'day'].map(function (key) { return parts.find(function (p) { return p.type === key; }).value; }).join('-'); }
  catch (_) { return new Date().toISOString().slice(0, 10); }
}

export function validChallengeCode(code) {
  if (!/^PM2-\d{4}-\d{2}-\d{2}$/.test(code)) return false;
  var date = new Date(code.slice(4) + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === code.slice(4);
}
