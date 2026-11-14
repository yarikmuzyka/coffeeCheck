# Spec Delta

## Purpose

Визначає спільну візуальну мову застосунку Coffee Logger (тема Ceramic Calm), щоб усі сторінки виглядали послідовно, легко читались і лишались доступними на будь-якій ширині екрана.

## ADDED Requirements

### Requirement: Палітра Ceramic Calm
The system SHALL render every page on a flat light milk/oat background without texture, with white cards separated by a clearly visible border, and deep espresso text, use a warm clay colour for primary actions and the active navigation state, and use muted sage only for secondary states. Bright orange MUST NOT be used as a dominant colour, and gradients and heavy shadows MUST NOT be used for surfaces.

#### Scenario: Глиняна основна дія
- **WHEN** користувач відкриває головну
- **THEN** кнопка «+ Додати каву» має глиняний фон, а фон сторінки світлий вівсяний

#### Scenario: Денна тема за замовчуванням
- **GIVEN** в операційній системі увімкнена світла тема або тему не вказано
- **WHEN** користувач відкриває застосунок
- **THEN** застосунок відображається в денній палітрі

### Requirement: Нічна тема
The system SHALL switch to a night variant of Ceramic Calm when the operating system prefers a dark colour scheme: a warm dark espresso background, light cream text, lighter clay for primary actions and lighter sage for secondary states. The night variant MUST keep the same layout, typography and contrast rules as the day variant.

#### Scenario: Системна темна тема
- **GIVEN** в операційній системі увімкнена темна тема
- **WHEN** користувач відкриває будь-яку сторінку
- **THEN** фон сторінки, топбару й карток темний, текст світлий, а основна кнопка дії глиняна

#### Scenario: Перемикання на льоту
- **GIVEN** застосунок відкрито в денній темі
- **WHEN** у системі вмикається темна тема
- **THEN** застосунок переходить на нічну палітру без перезавантаження

#### Scenario: Контраст уночі
- **WHEN** застосунок у нічній темі
- **THEN** основний і другорядний текст, текст на глиняних кнопках та посилання мають контраст не нижче 4.5:1

### Requirement: Типографіка
The system SHALL display large page headings, section headings, prices and scores in a low-contrast serif typeface with full Cyrillic support, and all navigation, forms, labels and data in a sans-serif typeface. Body text SHALL be at least 16 px, secondary text at least 14 px, and no text SHALL be smaller than 13 px. Headings MUST NOT be set in italic, labels MUST NOT use uppercase letter-spaced text, and body text MUST NOT use a typewriter or monospace face.

#### Scenario: Редакційний заголовок
- **WHEN** користувач відкриває головну або «Нові лоти»
- **THEN** заголовок сторінки набраний серифом без курсиву, а навігація, фільтри й кнопки — sans-serif

#### Scenario: Мінімальний розмір тексту
- **WHEN** користувач переглядає будь-яку сторінку
- **THEN** жоден текст не менший за 13 px, а підписи полів, дат і бейджів не набрані великими літерами з розрідженням

### Requirement: Щоденник на головній
The system SHALL compose the home page as a coffee journal: a greeting with the current date first, an obvious primary action to add a coffee beside it, the most recent coffee entries as the main content, and statistics condensed into a row of four compact tiles that does not compete with the entries.

#### Scenario: Перший екран головної
- **WHEN** користувач відкриває головну на десктопі
- **THEN** у верхній частині видно привітання з датою, кнопку «+ Додати каву» і початок списку «Останні записи»

#### Scenario: Компактна статистика
- **WHEN** користувач відкриває головну
- **THEN** кількість кав, розхід, покупки за 30 днів і середня оцінка показані рядом із чотирьох компактних плиток «цифра + підпис» під привітанням; на 375 px плитки йдуть сіткою 2×2

### Requirement: Стани не лише кольором
The system SHALL convey every state with text or a symbol in addition to colour: unrated coffees show the word «Оцінити», scores show the number with «/5», lot markers show a short text label next to the emoji, and the active tab or navigation item is underlined.

#### Scenario: Неоцінена кава
- **GIVEN** відкрита кава без оцінки
- **WHEN** вона показана в «Останніх записах»
- **THEN** поруч є текстова мітка «Оцінити»

#### Scenario: Позначка лота з підписом
- **GIVEN** лот рекомендований під смак користувача
- **WHEN** користувач відкриває «Нові лоти»
- **THEN** на фото пачки видно позначку 🎯 разом із текстом «під твій смак»

### Requirement: Контраст і фокус
The system SHALL keep text contrast at WCAG AA level (at least 4.5:1 for body text) against its background, and every interactive control MUST show a visible focus indicator when reached by keyboard.

#### Scenario: Фокус з клавіатури
- **WHEN** користувач переходить клавішею Tab на кнопку, посилання або поле форми
- **THEN** навколо елемента видно чіткий індикатор фокусу

#### Scenario: Читабельний приглушений текст
- **WHEN** на картці показано другорядний текст (обсмажчик, дата, ціна)
- **THEN** його контраст із фоном картки не нижчий за 7:1 у денній і нічній темі

### Requirement: Адаптивність
The system SHALL lay out every page without horizontal scrolling at a 375 px wide viewport and SHALL keep a comfortable multi-column layout on desktop widths.

#### Scenario: Телефон
- **WHEN** головну або сторінку нових лотів відкривають на екрані шириною 375 px
- **THEN** вміст вміщується по ширині без горизонтальної прокрутки, а картки лотів ідуть в одну колонку

### Requirement: Гліфи в інтерфейсі
The system SHALL NOT use decorative emoji in buttons, navigation or section headings. Emoji MAY appear only as functional lot markers (🎯 🤩 🙂 😐 😖 🤔) and in their legend.

#### Scenario: Кнопки без емодзі
- **WHEN** користувач бачить кнопки «Хоба», «Хочу спробувати» чи дію заварювання на головній
- **THEN** вони підписані лише текстом

### Requirement: Ієрархія журналу заварювань
The system SHALL present each brew log entry with the brew method as the most prominent element, followed by date and brew parameters, then tasting notes, with the score shown separately.

#### Scenario: Запис заварювання
- **WHEN** користувач відкриває сторінку кави із заварюваннями
- **THEN** у кожному записі метод виділено заголовком, дата й параметри йдуть під ним, а ноти смаку — окремим рядком із підписом
