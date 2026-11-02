# AGENTS.md

Инструкция для агентов, которые разрабатывают эту игру. Людям лучше начать с [README.md](README.md).

## Проект

**I Dig It: Pixel Mine** — игра три в ряд про шахту в Техасе 1889 года для iOS и Android. Это проект Construct 3: логика написана модулями JavaScript, а Construct отвечает за рендер, слой и упаковку.

## Карта

| Путь | Что там | Кто меняет |
| --- | --- | --- |
| `project.c3proj`, `layouts/`, `eventSheets/`, `objectTypes/`, `images/`, `icons/`, `files/` | Проект Construct. Эти файлы попадают в `.c3p` | Скрипты из `tools/`, руками только по необходимости |
| `scripts/pixel-mine/model/` | Правила без Construct и страницы | Агент, сначала тест |
| `scripts/pixel-mine/game/` | Спрайты, анимация, ход, смена, база | Агент |
| `scripts/pixel-mine/ui/` | Страница поверх холста: база, кабина, меню, окна | Агент |
| `scripts/pixel-mine/config.js` | Все числа: нормы, цены, поля, открытия | Агент, после симуляции баланса |
| `tests/` | Тесты, эталонный прогон, симуляции | Агент |
| `tools/` | Сборка, арт-пайплайн, страница проверки | Агент |
| `docs/` | `gdd/` дизайн-документ, `research/` ресёрч и решения, `narrative/` лор, `art-bible/` арт и лицензии, `ux/` экраны, `qa/` тесты на игроках | Агент вместе с кодом |
| `assets/` | `source/` исходники арта (скачанные паки не в git), `generated/` результат арт-пайплайна | Скилл art-pipeline |
| `specs/`, `.specify/` | Спецификации фич и конституция Spec Kit | Агент по Spec Kit |
| `build/` | Пакет `pixel-mine.c3p` и отчёты. Не в git | Генерируется |

Где какая механика в коде: [docs/gdd/mechanics.md](docs/gdd/mechanics.md). Как читать репозиторий: [REPO_MAP.md](REPO_MAP.md).

## Команды

```bash
node tests/test-engine.mjs        # правила поля, спецфишек, способностей
node tests/test-campaign.mjs      # кампания, экономика, база, коллекция, флот
node tests/golden.mjs             # поведение всей игры кадр за кадром; --write только при осознанном изменении
node tests/simulate-balance.mjs   # проход норм жадным и случайным игроком
node tools/sync-scripts.mjs       # регистрирует скрипты в project.c3proj
node tools/audit-project.mjs      # целостность проекта Construct
node tools/pack.mjs               # собирает build/pixel-mine.c3p
node tools/verify-pack.mjs        # проверяет, что в пакете только игра
```

Проверка типов (ошибки TS6133 в `importsForEvents.js` и `FontFaceSet.add` ожидаемы):

```bash
node ../tools/construct3-mcp/node_modules/typescript/bin/tsc --allowJs --checkJs --noEmit --noUnusedLocals --target es2022 --module es2022 --moduleResolution bundler --lib es2022,dom --skipLibCheck $(find scripts -name "*.js")
```

## Цикл работы

Любая задача идёт по циклу из скилла [dev-loop](.claude/skills/dev-loop/SKILL.md): понять → тест → изменить → проверить → показать → записать. Цикл повторяется, пока не выполнены все условия готовности.

**Готово, когда:**
1. Тесты, эталонный прогон и проверка типов зелёные. Эталон перезаписан, только если поведение поменялось намеренно.
2. Изменение экрана проверено в браузере на 375×667, 390×844, 360×800 и 768×1024 ([mobile-check](.claude/skills/mobile-check/SKILL.md)).
3. Пакет собран и проверен (`pack`, `verify-pack`). Для заметных изменений открыт в Preview Construct ([construct-preview](.claude/skills/construct-preview/SKILL.md)).
4. Документы обновлены: механика в `docs/gdd/mechanics.md`, экран в `docs/ux/ux-map.md`, ассет в `docs/art-bible/assets.md`.

## Правила

- Правило игры живёт в `model/` и не знает о Construct. Новая система — новый модуль.
- Числа только в `config.js`. Новую норму проверяют `tests/simulate-balance.mjs`.
- Сохранение игрока проходит через `sanitizeProfile`: новое поле профиля обязано иметь значение по умолчанию.
- Текст для игрока по [game-copy](.claude/skills/game-copy/SKILL.md): коротко, по-русски, без точки в конце подписи, без «·» и тире.
- Ассеты только CC0 или OFL, каждый с источником в `docs/art-bible/assets.md`.
- Игрок не должен пугаться: необратимое действие переспрашивает, провал говорит, что не потеряно. Спорные экраны проверяет [persona-playtest](.claude/skills/persona-playtest/SKILL.md).
- Цель для пальца не меньше 44 px, текст интерфейса рисуется страницей, а не Text-объектом холста.

## Скиллы

| Скилл | Когда |
| --- | --- |
| [dev-loop](.claude/skills/dev-loop/SKILL.md) | Любая задача: основной цикл и условия готовности |
| [verify-build](.claude/skills/verify-build/SKILL.md) | Перед сдачей: тесты, проверка типов, аудит, пакет |
| [mobile-check](.claude/skills/mobile-check/SKILL.md) | Изменился экран: размеры телефонов и планшетов, Impeccable |
| [construct-preview](.claude/skills/construct-preview/SKILL.md) | Проверка в настоящем редакторе Construct |
| [persona-playtest](.claude/skills/persona-playtest/SKILL.md) | Не пугает ли экран новичка: симуляция игроков разных типов |
| [art-pipeline](.claude/skills/art-pipeline/SKILL.md) | Новая или изменённая графика, шрифты, иконки |
| [balance](.claude/skills/balance/SKILL.md) | Изменились нормы, поля, топливо или награды |
| [game-copy](.claude/skills/game-copy/SKILL.md) | Любой текст, который видит игрок |
| `speckit-*` | Новая фича: спецификация, план, задачи, реализация |

## Известные ловушки

- В Git Bash heredoc съедает обратные слэши: скрипты с `\n` и регулярками пишите файлом, а не через `cat <<EOF`.
- Страница проверки в скрытой панели браузера грузится до 40 секунд: ждите `window.__mineReview`, а не таймер.
- `requestAnimationFrame` в фоновой вкладке стоит: двигайте игру через `__mineReview.advance(секунды)`.
- Preview Construct открывается отдельным окном. Чтобы его проверить, перехватите `window.open` в редакторе, и Preview откроется вкладкой.
