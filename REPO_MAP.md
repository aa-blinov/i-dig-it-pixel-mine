# Карта репозитория

Как читать этот репозиторий, если вы пришли из геймдева. Здесь лежит игра целиком: проект движка, код, дизайн-документ, арт, QA и процесс, по которому её делает агент.

## Устройство

```
I Dig It: Pixel Mine
│
├── project.c3proj              Проект Construct 3: точка входа движка
├── layouts/  eventSheets/      Сцена и лист событий Construct
├── objectTypes/  images/       Спрайты и их кадры
├── icons/  files/              Иконки приложения, шрифты, звуки, иконки интерфейса
│
├── scripts/pixel-mine/         КОД ИГРЫ
│   ├── config.js               Все числа баланса: поля, нормы, цены, открытия
│   ├── model/                  Правила: поле, спецфишки, экономика, база, флот…
│   ├── game/                   Игровой цикл: ход, анимация, смена, база
│   ├── ui/                     Интерфейс поверх холста: кабина, меню, окна
│   └── story.js                Реплики сюжета
│
├── docs/                       ДОКУМЕНТАЦИЯ
│   ├── gdd/                    Дизайн-документ: механики, системы, прогрессия, бриф
│   ├── research/               Ресёрч: решалась ли задача раньше, варианты, решение
│   ├── narrative/              Лор и персонажи
│   ├── art-bible/              Визуальное направление, ассеты и лицензии
│   ├── ux/                     Карта экранов: что видит игрок и что проверено
│   ├── qa/                     План теста на людях, симуляция новичков, кадры
│   └── archive/                Ранние версии документов
│
├── assets/                     ИСХОДНИКИ АРТА
│   ├── source/                 Шрифты и векторные руды (скачанные паки не в git)
│   └── generated/              Что собрал арт-пайплайн перед загрузкой в проект
│
├── tests/                      Тесты правил, эталонный прогон, симуляции баланса
├── tools/                      Сборка пакета, арт-пайплайн, страница проверки
├── build/                      Собранный pixel-mine.c3p и отчёты (не в git)
│
├── specs/  .specify/           Spec Kit: спецификации фич и конституция проекта
├── .claude/skills/             Скиллы агента: как он ведёт разработку
├── AGENTS.md                   Инструкция для агента: карта, команды, цикл, готовность
└── README.md                   О проекте
```

## С чего начать по роли

| Роль | Порядок чтения |
| --- | --- |
| Геймдизайнер | [docs/gdd/mechanics.md](docs/gdd/mechanics.md) → [docs/gdd/progression.md](docs/gdd/progression.md) → [scripts/pixel-mine/config.js](scripts/pixel-mine/config.js) |
| Программист | [AGENTS.md](AGENTS.md) → `scripts/pixel-mine/model/` → [tests/test-engine.mjs](tests/test-engine.mjs) |
| Художник | [docs/art-bible/visual-direction.md](docs/art-bible/visual-direction.md) → [docs/art-bible/assets.md](docs/art-bible/assets.md) → [.claude/skills/art-pipeline](.claude/skills/art-pipeline/SKILL.md) |
| UX и QA | [docs/ux/ux-map.md](docs/ux/ux-map.md) → [docs/qa/persona-playtest.md](docs/qa/persona-playtest.md) → [docs/qa/playtest-plan.md](docs/qa/playtest-plan.md) |
| Нарратив | [docs/narrative/lore.md](docs/narrative/lore.md) → [scripts/pixel-mine/story.js](scripts/pixel-mine/story.js) |
| Продюсер, лид | [README.md](README.md) → [AGENTS.md](AGENTS.md) → [.claude/skills/dev-loop](.claude/skills/dev-loop/SKILL.md) → история коммитов |

## Путь одного изменения

На примере «первый контракт слишком сложный»:

1. **Дизайн.** Правило и число находятся через [docs/gdd/mechanics.md](docs/gdd/mechanics.md): норма живёт в `CONTRACTS` в `config.js`.
2. **Баланс.** Скилл `balance`: `tests/simulate-balance.mjs` показывает процент прохождения, норма правится, кривая сверяется с целевой.
3. **Проверка.** Скилл `verify-build`: тесты, эталонный прогон, проверка типов, аудит, сборка `build/pixel-mine.c3p`.
4. **Игрок.** Скилл `construct-preview`: бот играет контракт в настоящем Preview. Скилл `persona-playtest`: не пугает ли новичка.
5. **Запись.** `docs/ux/ux-map.md` и сообщение коммита говорят, что поменялось и почему.

## Где что искать

| Вопрос | Ответ |
| --- | --- |
| Как работает механика X | [docs/gdd/mechanics.md](docs/gdd/mechanics.md): правило и функция в коде |
| Где число, которое хочется поменять | `scripts/pixel-mine/config.js` |
| Что видит игрок на экране Y | [docs/ux/ux-map.md](docs/ux/ux-map.md) |
| Откуда картинка и можно ли её использовать | [docs/art-bible/assets.md](docs/art-bible/assets.md) |
| Как собрать игру | [AGENTS.md](AGENTS.md), раздел «Команды» |
| Почему сделано так | `docs/research/` (варианты и решения), `specs/` и история коммитов |

## Договорённости

- Код и комментарии на английском, тексты игры и документы на русском.
- Чистые правила в `model/` не знают о Construct: их проверяют тесты без движка.
- Всё, что попадает в игру, лежит в папках Construct. Остальное (документы, тесты, инструменты) в пакет не попадает: это проверяет `tools/verify-pack.mjs`.
