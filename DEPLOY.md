# Деплой coffeeCheck на Vercel (безкоштовно)

Стек рантайму: **Vercel (Hobby, $0)** + **Neon Postgres (Free, $0)**.
GitHub Pages не підходить — застосунок динамічний (SSR + Server Actions + БД).

---

## 1. Створити базу на Neon

1. Зареєструйся на <https://neon.tech> (через GitHub).
2. **Create project** → назва `coffeecheck`, регіон ближчий до тебе (напр. EU Frankfurt).
3. У **Connection Details** візьми два рядки:
   - **Pooled connection** (хост містить `-pooler`) → це `DATABASE_URL`
   - **Direct connection** (без `-pooler`) → це `DIRECT_URL`
4. До pooled додай у кінці `&pgbouncer=true`, до обох переконайся що є `?sslmode=require`.

Приклад — див. `.env.example`.

## 2. Створити таблиці + (опційно) демо-дані

Локально, вказавши Neon-конект (одноразово):

```bash
# створи локальний .env з DATABASE_URL та DIRECT_URL від Neon
npx prisma db push        # створить таблиці в Neon
npm run db:seed           # (опційно) залити демо-обсмажчиків/кави
```

## 3. Задеплоїти на Vercel

1. Зайди на <https://vercel.com> через GitHub.
2. **Add New → Project** → імпортуй репозиторій `yarikmuzyka/coffeeCheck`.
3. Framework Vercel визначить сам (Next.js). Build/Install не чіпай.
4. **Environment Variables** — додай:
   - `DATABASE_URL` = pooled-рядок Neon (з `&pgbouncer=true`)
   - `DIRECT_URL` = direct-рядок Neon
   - `AUTH_GOOGLE_ID` = OAuth Client ID з Google Cloud
   - `AUTH_GOOGLE_SECRET` = OAuth Client Secret
   - `AUTH_SECRET` = випадковий секрет (`openssl rand -base64 32`)
   - `AUTH_URL` = production URL застосунку
5. **Deploy**.

У Google Cloud Console створи OAuth client типу **Web application** і додай callback:

```text
https://<project>.vercel.app/api/auth/callback/google
```

### Одноразове перенесення наявних даних

Після оновлення схеми й першого успішного входу власника через Google виконай локально
з production-підключенням до БД:

```bash
OWNER_EMAIL="твій-google-email" npm run db:claim-owner
```

Backfill змінює лише записи без власника й може бути безпечно запущений повторно.

Готово — застосунок буде на `https://<project>.vercel.app`.
Кожен `git push` у `main` = автоматичний редеплой.

---

## Нотатки

- **Локальна розробка**: тепер БД — Postgres. Локальний `.env` можна вказати на ту саму
  базу Neon (або на окрему Neon-гілку/локальний Postgres). SQLite більше не використовується.
- **Neon free** присипляє базу після ~5 хв простою → перший запит ~1 с «на прогрів».
- Схема вже налаштована: `binaryTargets` містить `rhel-openssl-3.0.x` для рантайму Vercel.
