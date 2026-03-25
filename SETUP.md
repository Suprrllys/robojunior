# RoboJunior — Инструкция по запуску

## Шаг 1: Настроить Supabase

1. Зайди на [supabase.com](https://supabase.com) → Dashboard → New Project
2. Назови проект `robojunior`, задай пароль базы данных (запомни его)
3. Дождись создания проекта (~2 минуты)
4. Перейди в **SQL Editor** → New query
5. Скопируй весь текст из файла `supabase-schema.sql` и выполни → Run
6. Перейди в **Project Settings → API**
7. Скопируй два значения:
   - `Project URL` → это `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → это `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Шаг 2: Настроить локальный .env

Создай файл `.env.local` в папке `product-mvp/`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## Шаг 3: Запустить локально

```bash
cd product-mvp
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

## Шаг 4: Создать демо-аккаунт (для судей)

1. Зарегистрируйся на сайте как обычный пользователь с email `demo@robojunior.app`
2. Пройди несколько миссий, чтобы в демо-аккаунте был прогресс
3. Кнопка "Demo ⚡" на главной странице автоматически входит от имени этого аккаунта

## Шаг 5: Деплой на Vercel

1. Зайди на [github.com](https://github.com) → New repository → назови `robojunior`
2. В папке `product-mvp` выполни:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/ВАШ_ЛОГИН/robojunior.git
   git push -u origin main
   ```
3. Зайди на [vercel.com](https://vercel.com) → New Project → Import from GitHub → выбери `robojunior`
4. В настройках проекта добавь переменные окружения (те же что в `.env.local`)
5. Deploy → готово! Vercel даст URL типа `robojunior.vercel.app`

## Шаг 6: Настроить Supabase Auth для продакшена

В Supabase → Authentication → URL Configuration:
- Site URL: `https://robojunior.vercel.app`
- Redirect URLs: `https://robojunior.vercel.app/api/auth/callback`
