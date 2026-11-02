// Styles and markup of the challenge code dialog, in the cockpit's look.

var BEVEL = 'border:3px solid #111719;box-shadow:inset 0 0 0 3px #69736e,inset 0 -7px 0 3px #10181b';
var BRASS = 'border:3px solid #111719;box-shadow:inset 0 0 0 2px #d9a85a,inset 0 -5px 0 2px #6b4a22';

export var DIALOG_CSS = [
  '.mine-code-dialog{box-sizing:border-box;width:min(90vw,460px);max-height:85dvh;overflow:auto;padding:20px 22px 24px;background:#263034;' + BEVEL + ';color:#faf0cf;font:18px/1.45 "Pixel Mine",Verdana,sans-serif;-webkit-font-smoothing:none}',
  '.mine-code-dialog::backdrop{background:rgba(10,14,16,.6)}',
  '.mine-code-dialog form{display:grid;gap:12px}',
  '.mine-code-dialog h2{margin:0;font:26px "Pixel Mine Title","Pixel Mine",Verdana,sans-serif;color:#edc271;text-shadow:2px 2px 0 #111719}',
  '.mine-code-dialog p{margin:0}',
  '.mine-code-dialog input{box-sizing:border-box;width:100%;min-height:48px;padding:8px 12px;background:#172022;color:#fff1cc;border:3px solid #111719;font:22px "Pixel Mine Title","Pixel Mine",monospace;letter-spacing:1px}',
  '.mine-code-dialog button{min-height:48px;padding:10px 12px 13px;background:#263034;' + BEVEL + ';color:#faf0cf;font:18px "Pixel Mine Title","Pixel Mine",Verdana,sans-serif;cursor:pointer}',
  '.mine-code-dialog button[type=submit]{background:#8a5f2a;' + BRASS + ';color:#fff6dc;text-shadow:2px 2px 0 #6b4a22}',
  '.mine-code-dialog :focus-visible{outline:3px solid #ffe3a0;outline-offset:2px}',
  '.mine-code-dialog .mine-code-error{color:#ffb39b;min-height:1.4em}',
  '.mine-code-dialog .mine-code-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
].join('');

export var DIALOG_HTML = '<form><h2 id="mine-code-title">Код шахты</h2><p>Код шахты PM2 открывает ту же шахту дня, что у друга. Код GIFT кладёт подарок в коллекцию</p><label for="mine-code-input">Код</label><input id="mine-code-input" name="challenge" maxlength="24" autocomplete="off" spellcheck="false" required><p class="mine-code-error" role="alert"></p><div class="mine-code-actions"><button type="button">Отмена</button><button type="submit">Ввести</button></div></form>';
