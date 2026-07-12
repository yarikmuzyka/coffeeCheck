# ☕ coffeeCheck — Coffee Tracker / Brew Journal

Веб-сервіс для відстеження specialty кави: журнал покупок, журнал заварювань, оцінки та персональна аналітика смакових вподобань.

## Стек

- **Next.js 14** (App Router, Server Actions)
- **Prisma** ORM + **PostgreSQL** (Neon / Supabase / Vercel Postgres)
- Single-user HTTP Basic Auth через `APP_USERNAME` / `APP_PASSWORD`
- Деплой: **Vercel** (безкоштовно) — див. [DEPLOY.md](DEPLOY.md)

## Запуск

Потрібен Postgres-конект (напр. безкоштовний [Neon](https://neon.tech)).
Створи `.env` за зразком `.env.example` (`DATABASE_URL`, `DIRECT_URL`,
`APP_USERNAME` і `APP_PASSWORD`), тоді:

```bash
npm install          # встановити залежності + prisma generate
npm run db:push      # створити таблиці зі схеми
npm run db:seed      # засідити демо-даними (10 обсмажчиків + приклади)
npm run dev          # http://localhost:3000
```

Корисні команди:

```bash
npm run db:reset     # перестворити базу + пересідити
npm run build        # production-білд
```

## Що вміє MVP

- **Обсмажчики** — CRUD, середня оцінка кожного
- **Кави** — картка (країна, регіон, сорт, обробка, ціна), список із пошуком, фільтрами (обсмажчик / країна / обробка / статус) і сортуванням (дата / рейтинг / ціна)
- **Dashboard** — summary-картки (куплено / витрачено) + топи (обсмажчики / країни / обробки / сорти)
- **Аналітика** — розширені топи + прості рекомендації на основі історії

Оцінка кави = середній `overallScore` усіх її заварювань.

## Структура

```
app/
  dashboard/        головна зі статистикою + графіки
  coffees/          список + фільтри
  coffees/new/      форма додавання кави
  coffees/[id]/     детальна сторінка + заварювання
  brew-logs/new/    форма заварювання з оцінками
  roasters/         список обсмажчиків
  roasters/new/     форма обсмажчика
  analytics/        розширена аналітика + рекомендації
lib/
  prisma.js         клієнт БД
  actions.js        server actions (CRUD)
  stats.js          обчислення аналітики
  constants.js      опції для форм
prisma/
  schema.prisma     Roaster / Coffee / BrewLog
  seed.js           демо-дані
```

## Definition of Done — статус

- [x] Додати обсмажчика
- [x] Додати куплену каву
- [x] Додати заварювання для кави
- [x] Оцінити заварювання
- [x] Список кав
- [x] Детальна сторінка кави
- [x] Базовий dashboard зі статистикою
- [x] Аналітика: країни / обробки / сорти / обсмажчики

## Наступні кроки (з брифу)

- Auth (Google OAuth / NextAuth)
- Завантаження фото пакету в S3 + розпізнавання
- Публічні рейтинги, соціальна частина
- Price tracking
