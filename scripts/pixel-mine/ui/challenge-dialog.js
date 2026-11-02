// The dialog that takes a friend's challenge code.
import { beginRound } from "../game/round.js";
import { dailyCode, validChallengeCode } from "../model/challenge.js";
import { redeemGift } from "../model/gifts.js";
import { saveProfile } from "../model/profile.js";
import { updateInterface } from "./canvas-ui.js";
import { DIALOG_CSS, DIALOG_HTML } from "./dialog-markup.js";

export function enterChallenge(engine) {
  if (!globalThis.document) { engine.shopMessage = 'Ввод кода сейчас недоступен'; updateInterface(engine); return; }
  if (!engine.challengeDialog) {
    if (!document.getElementById('pixel-mine-dialog-style')) {
      var style = document.createElement('style'); style.id = 'pixel-mine-dialog-style';
      style.textContent = DIALOG_CSS;
      document.head.appendChild(style);
    }
    var dialog = engine.challengeDialog = document.createElement('dialog');
    dialog.className = 'mine-code-dialog'; dialog.setAttribute('aria-labelledby', 'mine-code-title');
    dialog.innerHTML = DIALOG_HTML;
    document.body.appendChild(dialog);
    dialog.querySelector('button[type=button]').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      var code = dialog.querySelector('input').value.trim().toUpperCase();
      if (code.indexOf('GIFT-') === 0) {
        var gift = redeemGift(engine.profile, code);
        if (!gift.ok) { dialog.querySelector('.mine-code-error').textContent = gift.message; return; }
        engine.shopMessage = engine.collectionMessage = gift.message; saveProfile(engine); dialog.close(); updateInterface(engine); return;
      }
      if (!validChallengeCode(code)) { dialog.querySelector('.mine-code-error').textContent = 'Нужен код PM2-ГГГГ-ММ-ДД с настоящей датой или код GIFT'; dialog.querySelector('input').focus(); return; }
      dialog.close(); beginRound(engine, 'daily', code);
    });
  }
  dialog = engine.challengeDialog;
  dialog.querySelector('.mine-code-error').textContent = '';
  dialog.querySelector('input').value = 'PM2-' + dailyCode();
  dialog.showModal(); dialog.querySelector('input').focus(); dialog.querySelector('input').select();
}
