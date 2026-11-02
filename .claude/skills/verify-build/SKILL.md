---
name: verify-build
description: Полная проверка Pixel Mine перед сдачей — тесты, эталонный прогон, проверка типов, регистрация скриптов, аудит Construct, сборка и проверка пакета build/pixel-mine.c3p. Использовать после любого изменения кода или проекта.
---

# Проверка и сборка

Цель: доказать выводом команд, что игра цела и пакет собран.

## Цикл

Запускать из корня репозитория, по порядку. Упало — исправить причину и начать с упавшего шага.

```bash
node tests/test-engine.mjs          # ждём «N engine checks passed»
node tests/test-campaign.mjs        # ждём «N campaign checks passed»
node tests/test-daily-replay.mjs    # ждём строку с "passes"
node tests/golden.mjs               # ждём «golden master matches»
node ../tools/construct3-mcp/node_modules/typescript/bin/tsc --allowJs --checkJs --noEmit --noUnusedLocals --target es2022 --module es2022 --moduleResolution bundler --lib es2022,dom --skipLibCheck $(find scripts -name "*.js")
node tools/sync-scripts.mjs         # ждём «N script files on disk»
node tools/audit-project.mjs        # ждём "critical": 0 и "warning": 0
node tools/pack.mjs                 # ждём «build/pixel-mine.c3p written»
node tools/verify-pack.mjs          # ждём «the archive holds the game»
```

Проверка типов: допустимы только TS6133 в `importsForEvents.js` и `Property 'add' does not exist on type 'FontFaceSet'`.

## Готово, когда

Все девять шагов дали ожидаемую строку в этом прогоне.

## Если эталонный прогон расходится

1. Посмотреть, на каком кадре и в каком поле (`checkpoint N differs`).
2. Расхождение объясняется намеренным изменением (новое поле профиля, новый текст подсказки, другие нормы)? Тогда `node tests/golden.mjs --write` и упомянуть это в отчёте.
3. Не объясняется — это баг, чинить код.

## Ловушки

- `tools/pack.mjs` и `tools/verify-pack.mjs` ходят в MCP-сервер Construct из `../tools/construct3-mcp`. Без него сборка не пойдёт.
- В пакет попадают только папки Construct (белый список в `tools/pack.mjs`). Не добавлять туда `docs/`, `tests/`, `tools/`.
