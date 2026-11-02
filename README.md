# I Dig It: Pixel Mine

Игра три в ряд про шахту в Техасе 1889 года для iOS и Android, сделанная в Construct 3. Игрок выполняет контракты на добычу, строит базу, собирает находки и отправляет корабли в рейсы.

Проект разрабатывается агентом: правила, цикл работы и скиллы описаны так, чтобы любой агент мог продолжить работу без устных объяснений.

## С чего начать

| Кто вы | Читать |
| --- | --- |
| Хотите понять игру | [docs/gdd/mechanics.md](docs/gdd/mechanics.md) — все механики и где они в коде |
| Хотите увидеть экраны | [docs/ux/ux-map.md](docs/ux/ux-map.md) — карта экранов и что проверено |
| Хотите понять, как ведётся разработка | [AGENTS.md](AGENTS.md) и скиллы в [.claude/skills/](.claude/skills) |
| Хотите добавить фичу | Spec Kit: [.specify/memory/constitution.md](.specify/memory/constitution.md), спецификации в [specs/](specs) |

## Структура

Полная карта с порядком чтения для геймдизайнера, программиста, художника, QA и продюсера: [REPO_MAP.md](REPO_MAP.md).

```
project.c3proj, layouts/, objectTypes/ …   проект Construct 3: это и есть игра
scripts/pixel-mine/                        код: model/ правила, game/ цикл, ui/ интерфейс, config.js числа
docs/                                      gdd/, narrative/, art-bible/, ux/, qa/
assets/                                    исходники арта и результат арт-пайплайна
tests/  tools/                             тесты и инструменты сборки
specs/  .specify/  .claude/skills/         процесс: спецификации, конституция, скиллы агента
build/                                     собранный pixel-mine.c3p (не в git)
```

## Как это разрабатывается

Каждая задача идёт по циклу из [dev-loop](.claude/skills/dev-loop/SKILL.md):

1. **Понять.** Где механика, что должен увидеть игрок. Новая фича начинается со спецификации Spec Kit.
2. **Тест.** Правило сначала получает проверку, которая падает.
3. **Изменить.** Правило в `model/`, связка в `game/`, экран в `ui/`, числа в `config.js`.
4. **Проверить.** Тесты, эталонный прогон кадр за кадром, проверка типов, аудит проекта, сборка пакета.
5. **Показать.** Экран на телефонах и планшетах, Preview в настоящем Construct, симуляция новичков.
6. **Записать.** Механика, экран и ассет попадают в документы.

Цикл повторяется, пока все проверки не зелёные. Что значит «готово», записано в [AGENTS.md](AGENTS.md).

## Команды

```bash
node tests/test-engine.mjs && node tests/test-campaign.mjs && node tests/golden.mjs
node tools/sync-scripts.mjs && node tools/audit-project.mjs
node tools/pack.mjs && node tools/verify-pack.mjs     # build/pixel-mine.c3p
```

Собранный `build/pixel-mine.c3p` открывается в [Construct 3](https://editor.construct.net): перетащите файл в окно редактора.

Сборка и проверка пакета используют MCP-сервер Construct из соседней папки `../tools/construct3-mcp`.

## Документы

- [Механики](docs/gdd/mechanics.md), [прогрессия](docs/gdd/progression.md), [дизайн систем](docs/gdd/systems-design.md), [лор](docs/narrative/lore.md)
- [Карта экранов](docs/ux/ux-map.md), [симуляция новичков](docs/qa/persona-playtest.md), [сценарий теста на людях](docs/qa/playtest-plan.md)
- [Визуальное направление](docs/art-bible/visual-direction.md), [ассеты и лицензии](docs/art-bible/assets.md)

Все ассеты CC0 или SIL OFL, источники в [docs/art-bible/assets.md](docs/art-bible/assets.md).
