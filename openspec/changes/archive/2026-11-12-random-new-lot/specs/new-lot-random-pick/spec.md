# Spec Delta

## Purpose

Допомагає користувачу швидко вибрати, яку каву спробувати: на запит показує один випадковий лот зі списку нових лотів замість ручного перегляду всього списку.

## ADDED Requirements

### Requirement: Кнопка «Хоба» на вкладці «Новинки»
The system SHALL show a button labelled «Хоба» on the «Новинки» tab of the new lots page whenever that tab lists at least one lot. The button MUST NOT appear on the «Для мене» and «Хочу спробувати» tabs.

#### Scenario: Кнопка видна, коли є лоти
- **WHEN** користувач відкриває вкладку «Новинки», де є хоча б один лот
- **THEN** на сторінці видно кнопку «Хоба»

#### Scenario: Кнопки немає без лотів
- **WHEN** вкладка «Новинки» з поточними фільтрами не містить жодного лота
- **THEN** кнопка «Хоба» не показується

#### Scenario: Кнопки немає на інших вкладках
- **WHEN** користувач відкриває вкладку «Для мене» або «Хочу спробувати»
- **THEN** кнопка «Хоба» не показується

### Requirement: Випадковий лот з видимого списку
The system SHALL pick the random lot only from the lots currently listed on the «Новинки» tab, after the active roaster, country and process filters are applied. Every listed lot MUST be eligible to be picked.

#### Scenario: Вибір з урахуванням фільтрів
- **GIVEN** на вкладці «Новинки» активний фільтр «Країна: Kenya»
- **WHEN** користувач натискає «Хоба»
- **THEN** показаний лот має країну Kenya

#### Scenario: Будь-який лот може випасти
- **GIVEN** у вкладці три лоти
- **WHEN** користувач натискає «Хоба» багато разів
- **THEN** з часом випадає кожен із трьох лотів

### Requirement: Без повтору поспіль
The system SHALL NOT show the same lot on two consecutive presses of «Хоба» when the tab lists more than one lot. When exactly one lot is listed, the system SHALL show that lot on every press.

#### Scenario: Наступний клік дає інший лот
- **GIVEN** у вкладці щонайменше два лоти і щойно випав лот A
- **WHEN** користувач знову натискає «Хоба»
- **THEN** показаний лот відрізняється від A

#### Scenario: Єдиний лот
- **GIVEN** у вкладці рівно один лот
- **WHEN** користувач натискає «Хоба» двічі
- **THEN** обидва рази показано цей лот

### Requirement: Показ результату
The system SHALL display the picked lot as a highlighted card above the list without reloading the page. The card MUST show the lot name, roaster, country and processes when known, price, and the lot's emoji marker when it has one.

#### Scenario: Картка результату
- **WHEN** користувач натискає «Хоба»
- **THEN** над списком з'являється виділена картка з назвою, обсмажчиком, країною, обробкою та ціною випалого лота
- **AND** сторінка не перезавантажується

#### Scenario: Емодзі-позначка на результаті
- **GIVEN** випалий лот рекомендований під смак користувача
- **WHEN** показується картка результату
- **THEN** на ній видно позначку 🎯

### Requirement: Дії над результатом
The system SHALL let the user open the picked lot in its shop in a new tab, add it to the «Хочу спробувати» list, and close the result card.

#### Scenario: Перехід до магазину
- **WHEN** користувач натискає «До магазину ↗» на картці результату
- **THEN** сторінка лота в магазині відкривається в новій вкладці

#### Scenario: Додати в «Хочу спробувати»
- **GIVEN** випалий лот ще не в списку «Хочу спробувати»
- **WHEN** користувач натискає «♡ Хочу спробувати» на картці результату
- **THEN** лот додається до списку «Хочу спробувати»

#### Scenario: Закрити результат
- **WHEN** користувач закриває картку результату
- **THEN** картка зникає, а список лотів лишається без змін

### Requirement: Результат не зберігається
The system SHALL NOT persist the picked lot: reloading or reopening the page MUST show no result card until «Хоба» is pressed again.

#### Scenario: Після перезавантаження
- **GIVEN** користувач отримав випадковий лот
- **WHEN** сторінку перезавантажують
- **THEN** картки результату немає
