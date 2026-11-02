// Pure rules for gifts: a spare artifact becomes a code a friend types in.
// The checksum keeps typos and made-up codes out; each code works once.
import { artifact } from "./collections.js";

function checksum(text) {
  var h = 2166136261;
  for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36).toUpperCase().slice(-4).padStart(4, '0');
}

// Gives away one spare copy and returns its code.
export function makeGift(profile, id, now) {
  if (!artifact(id)) return { ok: false, message: 'Нет такого предмета' };
  if ((profile.collection[id] || 0) < 2) return { ok: false, message: 'Дарить можно только лишнюю копию' };
  profile.collection[id] -= 1;
  var body = id.toUpperCase() + '-' + Math.floor(now % 1679616).toString(36).toUpperCase().padStart(4, '0');
  var code = 'GIFT-' + body + '-' + checksum(body);
  profile.redeemed.push(code);
  return { ok: true, code: code, message: artifact(id).name + ': код подарка готов' };
}

export function redeemGift(profile, raw) {
  var code = String(raw || '').trim().toUpperCase();
  var parts = code.split('-');
  if (parts.length !== 4 || parts[0] !== 'GIFT') return { ok: false, message: 'Это не код подарка' };
  var body = parts[1] + '-' + parts[2], item = artifact(parts[1].toLowerCase());
  if (!item || checksum(body) !== parts[3]) return { ok: false, message: 'Код с ошибкой, проверь буквы' };
  if (profile.redeemed.indexOf(code) >= 0) return { ok: false, message: 'Этот код уже использован' };
  profile.redeemed.push(code);
  profile.collection[item.id] = (profile.collection[item.id] || 0) + 1;
  return { ok: true, message: item.name + ': подарок в коллекции' };
}
