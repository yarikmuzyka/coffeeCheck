# Spec Delta

## Purpose

Визначає спільну візуальну мову застосунку Coffee Logger (тема Ceramic Calm), щоб усі сторінки виглядали послідовно, легко читались і лишались доступними на будь-якій ширині екрана.

## ADDED Requirements

### Requirement: Палітра Ceramic Calm
The system SHALL render every page on a warm ivory background with deep espresso text, use a muted sage colour for primary actions, active states and scores, and use terracotta only for secondary accents. Bright orange MUST NOT be used as a dominant colour, and gradients MUST NOT be used for surfaces.

#### Scenario: Світлий фон і шавлієва дія
- **WHEN** користувач відкриває будь-яку сторінку
- **THEN** фон сторінки і топбару світлий, а основна кнопка дії шавлієва

#### Scenario: Денна тема за замовчуванням
- **GIVEN** в операційній системі увімкнена світла тема або тему не вказано
- **WHEN** користувач відкриває застосунок
- **THEN** застосунок відображається в денній палітрі

### Requirement: Нічна тема
The system SHALL switch to a night variant of Ceramic Calm when the operating system prefers a dark colour scheme: a warm dark espresso background, light cream text, lighter sage for primary actions and scores, and lighter terracotta for secondary accents. The night variant MUST keep the same layout, typography and contrast rules as the day variant.

#### Scenario: Системна темна тема
- **GIVEN** в операційній системі увімкнена темна тема
- **WHEN** користувач відкриває будь-яку сторінку
- **THEN** фон сторінки, топбару й карток темний, текст світлий, а основна кнопка дії шавлієва

#### Scenario: Перемикання на льоту
- **GIVEN** застосунок відкрито в денній темі
- **WHEN** у системі вмикається темна тема
- **THEN** застосунок переходить на нічну палітру без перезавантаження

#### Scenario: Контраст уночі
- **WHEN** застосунок у нічній темі
- **THEN** основний і другорядний текст, текст на шавлієвих кнопках та посилання мають контраст не нижче 4.5:1

### Requirement: Типографіка
The system SHALL display page and section headings, prices and scores in a serif typeface and all body text, labels and controls in a sans-serif typeface. Body text MUST NOT use a typewriter or monospace face.

#### Scenario: Сериф у заголовках
- **WHEN** користувач відкриває головну
- **THEN** заголовок привітання і назви секцій набрані серифом, а описи й кнопки — sans-serif

### Requirement: Контраст і фокус
The system SHALL keep text contrast at WCAG AA level (at least 4.5:1 for body text) against its background, and every interactive control MUST show a visible focus indicator when reached by keyboard.

#### Scenario: Фокус з клавіатури
- **WHEN** користувач переходить клавішею Tab на кнопку, посилання або поле форми
- **THEN** навколо елемента видно чіткий індикатор фокусу

#### Scenario: Читабельний приглушений текст
- **WHEN** на картці показано другорядний текст (обсмажчик, дата, ціна)
- **THEN** його контраст із фоном картки не нижчий за 4.5:1

### Requirement: Адаптивність
The system SHALL lay out every page without horizontal scrolling at a 375 px wide viewport and SHALL keep a comfortable multi-column layout on desktop widths.

#### Scenario: Телефон
- **WHEN** головну або сторінку нових лотів відкривають на екрані шириною 375 px
- **THEN** вміст вміщується по ширині без горизонтальної прокрутки

### Requirement: Гліфи в інтерфейсі
The system SHALL NOT use decorative emoji in buttons, navigation or section headings. Emoji MAY appear only as functional lot markers (🎯 🤩 🙂 😐 😖 🤔) and in their legend.

#### Scenario: Кнопки без емодзі
- **WHEN** користувач бачить кнопки «Хоба», «Хочу спробувати» чи дію заварювання на головній
- **THEN** вони підписані лише текстом

#### Scenario: Позначки лотів лишаються
- **GIVEN** лот рекомендований під смак користувача
- **WHEN** користувач відкриває «Нові лоти»
- **THEN** у кутку фото пачки показано 🎯

### Requirement: Ієрархія журналу заварювань
The system SHALL present each brew log entry with the brew method as the most prominent element, followed by date and brew parameters, then tasting notes, with the score shown separately.

#### Scenario: Запис заварювання
- **WHEN** користувач відкриває сторінку кави із заварюваннями
- **THEN** у кожному записі метод виділено заголовком, дата й параметри йдуть під ним, а ноти смаку — окремим рядком із підписом
