# Лекція №10 (2 години). Основи PaaS та хмарні платформи розробки

## План лекції

1. Концепція PaaS та відмінності від IaaS
2. Хмарні платформи розробки: Elastic Beanstalk, Azure App Service, Google App Engine
3. Середовища виконання та керовані рантайми
4. Автоматичне масштабування та розгортання в PaaS
5. Обмеження PaaS та критерії вибору між PaaS і IaaS
6. Нове покоління PaaS: Vercel, Netlify, Render, Railway

## Перелік умовних скорочень

Списком

- **PaaS** — Platform as a Service — платформа як послуга
- **IaaS** — Infrastructure as a Service — інфраструктура як послуга
- **FaaS** — Function as a Service — функції як послуга
- **SaaS** — Software as a Service — програмне забезпечення як послуга
- **App Service** — Azure App Service — хмарна PaaS-платформа Azure
- **GAE** — Google App Engine — PaaS-платформа Google
- **EB** — Elastic Beanstalk — PaaS-платформа AWS
- **CI/CD** — Continuous Integration / Continuous Delivery
- **SDK** — Software Development Kit
- **CLI** — Command Line Interface
- **WSGI** — Web Server Gateway Interface (Python)
- **JVM** — Java Virtual Machine
- **TLS** — Transport Layer Security
- **CDN** — Content Delivery Network
- **API** — Application Programming Interface
- **DX** — Developer Experience — досвід розробника
- **Edge Network** — розподілена мережа серверів поблизу кінцевих користувачів
- **Serverless DB** — база даних, що масштабується до нуля при відсутності запитів
- **Neon** — serverless PostgreSQL-сервіс
- **Supabase** — відкрита Firebase-альтернатива (PostgreSQL + Auth + Storage + Realtime)

---

## Вступ

Модель PaaS (Platform as a Service) стала відповіддю на потребу розробників зосередитись виключно на написанні коду, не витрачаючи час на управління серверами, операційними системами, веб-серверами та іншою інфраструктурою. PaaS надає повністю готову платформу для розробки, розгортання та масштабування застосунків — хмарний провайдер бере на себе відповідальність за весь стек нижче рівня застосунку.

---

## 1. Концепція PaaS та відмінності від IaaS

### 1.1 Що надає PaaS

Порівняно з IaaS, PaaS бере на себе додаткові рівні стека:

```
┌─────────────────────────────────────────────────────────────┐
│ Шар             │  Клієнт (On-Premise) │  IaaS   │  PaaS   │
├─────────────────────────────────────────────────────────────┤
│ Дані            │       Клієнт         │ Клієнт  │ Клієнт  │
│ Застосунок      │       Клієнт         │ Клієнт  │ Клієнт  │
│ Рантайм (Node, Python, JVM) │ Клієнт  │ Клієнт  │Провайдер│
│ Middleware      │       Клієнт         │ Клієнт  │Провайдер│
│ Операційна система │    Клієнт         │ Клієнт  │Провайдер│
│ Віртуалізація   │       Клієнт         │Провайдер│Провайдер│
│ Мережа/обладнання│      Клієнт        │Провайдер│Провайдер│
└─────────────────────────────────────────────────────────────┘
```

**Ключові характеристики PaaS:**

- Розробник надає лише **код застосунку** (та залежності)
- Провайдер управляє ОС, рантаймом, веб-сервером, балансувальниками
- Автоматичне масштабування (як правило)
- Вбудовані CI/CD та деплоймент через CLI або Git push
- Оплата за ресурси, що споживає застосунок

### 1.2 Переваги PaaS

| Перевага                      | Опис                                                    |
| ----------------------------- | ------------------------------------------------------- |
| **Швидкість розробки**        | Деплоймент у хвилини: `git push` → застосунок запущений |
| **Менше DevOps**              | Не потрібен спеціаліст з адміністрування серверів       |
| **Автоматичні патчі**         | ОС та рантайм оновлюються провайдером                   |
| **Вбудована масштабованість** | Конфігурується у кілька кліків або автоматично          |
| **Інтеграція з екосистемою**  | Готові конектори до БД, черг, моніторингу               |

### 1.3 Обмеження PaaS

| Обмеження              | Вплив                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| **Менше контролю**     | Не можна налаштувати ОС, веб-сервер, мережевий стек              |
| **Vendor lock-in**     | Специфічні API та конфігурації прив'язують до провайдера         |
| **Обмеження рантайму** | Лише підтримувані версії мов та фреймворків                      |
| **Більша ціна**        | PaaS коштує більше, ніж аналогічний IaaS для великих навантажень |

---

## 2. AWS Elastic Beanstalk

### 2.1 Концепція Elastic Beanstalk

**AWS Elastic Beanstalk (EB)** — PaaS-сервіс AWS, що автоматично провізіонує та управляє EC2-інстансами, Load Balancer, Auto Scaling Group та іншою інфраструктурою для запуску веб-застосунків.

**Підтримувані платформи:**

- Node.js, Python, Ruby, PHP, Java (Tomcat), .NET (Windows та Linux), Go
- Docker (однойменний або Docker Compose)
- Java з кастомними платформами (Packer)

**Як це працює:**

```
Розробник:   eb init → eb create → eb deploy
                                      │
AWS:          EC2 Launch Template    ──► Auto Scaling Group
              ALB + Target Group     ──► EC2 Instances (рантайм)
              CloudWatch Alarms      ──► RDS (опціонально)
              Route 53 CNAME         ──►
```

### 2.2 Розгортання через EB CLI

```bash
# Ініціалізація проєкту
eb init my-app --platform python-3.11 --region eu-central-1

# Створення середовища
eb create my-app-prod --instance-type t3.medium --elb-type application

# Деплоймент
eb deploy

# Перегляд логів
eb logs

# Відкрити застосунок у браузері
eb open

# SSH до інстансу
eb ssh
```

### 2.3 Конфігурація EB (.ebextensions)

Кастомне налаштування через YAML-файли у директорії `.ebextensions/`:

```yaml
# .ebextensions/01-packages.config
packages:
  yum:
    git: []
    postgresql-devel: []

option_settings:
  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health
```

### 2.4 Схема розгортання EB (Blue/Green)

EB підтримує **Blue/Green Deployment** — стратегію нульового downtime при оновленнях:

1. Розгорнути нову версію у окремому середовищі (Green)
2. Протестувати Green
3. Переключити DNS (Route 53) з Blue на Green → миттєво
4. Старе Blue-середовище залишається як резервне

---

## 3. Azure App Service

### 3.1 Концепція Azure App Service

**Azure App Service** — повноцінна PaaS-платформа Azure для веб-застосунків та API. Є більш зрілою та функціонально багатою PaaS-платформою порівняно з Elastic Beanstalk.

**Підтримувані стеки:**

- Node.js, Python, PHP, Ruby
- Java (Tomcat або embedded)
- .NET (.NET 8, ASP.NET)
- Docker + Docker Compose

**App Service Plan (план)** — визначає обчислювальні ресурси та рівень сервісу:

| Tier                 | Рівень     | Особливості                                       |
| -------------------- | ---------- | ------------------------------------------------- |
| Free (F1)            | Dev/Test   | 60 хв/день CPU, без SLA                           |
| Basic (B1–B3)        | Dev/Test   | Без auto scaling, без staging slots               |
| Standard (S1–S3)     | Production | Auto scaling, до 5 slots, custom domains+SSL      |
| Premium (P1v3–P3v3)  | Production | Покращені Azure VNet Integration, zone redundancy |
| Isolated (I1v2–I3v2) | Enterprise | Повна ізоляція, ASE                               |

### 3.2 Deployment Slots

**Deployment Slots** — одна з найпотужніших функцій Azure App Service: окремі екземпляри застосунку в межах одного App Service Plan:

```
Production slot: → my-app.azurewebsites.net (реальні користувачі)
Staging slot:    → my-app-staging.azurewebsites.net (тестування)

Після тестування: Swap → Production ↔ Staging (миттєве переключення)
```

**Переваги Swap:**

- Нульовий downtime при деплойменті
- Можливість швидкого rollback (ще один swap)
- Slot-specific налаштування (staging підключається до тестової БД, production — до продуктивної)

### 3.3 Azure App Service: додаткові можливості

- **Authentication/Authorization**: вбудована інтеграція з Azure AD, Google, Facebook, Twitter — без змін у коді
- **Custom Domains + Free SSL**: автоматичні сертифікати від Let's Encrypt
- **VNet Integration**: підключення App Service до Azure VNet для доступу до приватних ресурсів
- **Scale Out (Auto Scale)**: горизонтальне масштабування за метриками CPU, RAM, HTTP-черга

---

## 4. Google App Engine

### 4.1 Концепція Google App Engine

**Google App Engine (GAE)** — один із перших PaaS-сервісів у хмарній індустрії (2008). Існує у двох варіантах:

**Standard Environment:**

- Повністю ізольоване пісочниця-середовище
- Підтримані: Python, Java, Node.js, Go, PHP, Ruby
- Масштабування до нуля (якщо немає трафіку — інстансів немає, плата нульова)
- Максимальна швидкість масштабування: секунди

**Flexible Environment:**

- Запускається на Docker-контейнерах (power Compute Engine VM під капотом)
- Підтримує будь-яку мову та бібліотеку через Docker
- Не масштабується до нуля (мінімум 1 інстанс)
- Більш гнучкий, але повільніше масштабується

### 4.2 Конфігурація GAE (app.yaml)

```yaml
runtime: python311
entrypoint: gunicorn -b :$PORT main:app

automatic_scaling:
  min_instances: 0
  max_instances: 20
  target_cpu_utilization: 0.65

env_variables:
  DATABASE_URL: postgresql://...

handlers:
  - url: /static
    static_dir: static
  - url: /.*
    script: auto
```

```bash
# Деплоймент
gcloud app deploy

# Перегляд логів
gcloud app logs tail

# Перегляд версій
gcloud app versions list

# Розподіл трафіку між версіями (A/B testing)
gcloud app services set-traffic default --splits v1=0.8,v2=0.2
```

---

## 5. Порівняння PaaS-платформ та критерії вибору

### 5.1 Порівняльна таблиця

| Критерій                 | AWS Elastic Beanstalk | Azure App Service | Google App Engine |
| ------------------------ | :-------------------: | :---------------: | :---------------: |
| Простота старту          |         ★★★★☆         |       ★★★★★       |       ★★★★☆       |
| Підтримка мов            |         ★★★★☆         |       ★★★★★       |       ★★★★☆       |
| Deployment Slots         |     ❌ (Swap env)     | ✅ (до 20 slots)  |    ✅ (версії)    |
| Масштабування до 0       |          ❌           |    ❌ (min 1)     |   ✅ (Standard)   |
| Кастомний Docker         |          ✅           |        ✅         |   ✅ (Flexible)   |
| Інтеграція з екосистемою |          AWS          |     Microsoft     |        GCP        |
| VNet/VPC інтеграція      |          ✅           |        ✅         |        ✅         |
| Матуральність            |        Висока         |    Дуже висока    |      Висока       |

### 5.2 Коли обирати PaaS замість IaaS

**Оберіть PaaS, якщо:**

- Мала або середня команда без виділеного DevOps-спеціаліста
- Стандартний веб-застосунок або REST API на поширеній мові
- Потрібна максимальна швидкість від ідеї до деплойменту
- Бюджет включає підвищену вартість PaaS (менше DevOps-зарплат)

**Залишайтесь на IaaS (K8s/EC2), якщо:**

- Специфічні вимоги до ОС або системних бібліотек
- Потрібна максимальна оптимізація вартості для великого масштабу
- Складні архітектурні вимоги (кастомна мережева топологія)
- Вже є DevOps-команда і K8s-досвід

### 5.3 Trenд: Container-based PaaS

Сучасні PaaS рухаються у бік контейнерів:

- **AWS App Runner**: ще простіший PaaS — достатньо надати образ контейнера або репозиторій
- **Azure Container Apps**: PaaS на базі K8s для мікросервісів та KEDA
- **Google Cloud Run**: запуск stateless контейнерів, масштабування до нуля
- **Render, Railway, Fly.io**: нові SaaS-PaaS платформи, що радикально спрощують деплоймент

---

## 6. Нове покоління PaaS: Vercel, Netlify, Render, Railway

### 6.1 Концепція Developer Experience (DX) First

Традиційний PaaS (Elastic Beanstalk, App Service) розроблявся для enterprise-команд із DevOps-спеціалістами та зосереджений на **надійності та контролі**. Нове покоління PaaS обрало протилежний пріоритет: **максимально спростити шлях від коду до продакшну** для окремого розробника або малої команди. Підхід отримав назву **«DX First» (Developer Experience First)**.

```
Традиційний PaaS шлях:          Нове покоління PaaS:

git push                         git push
  │                                │
  ▼                                ▼
налаштуй buildspec.yml          Автоматичне визначення фреймворку
створи середовище               Автоматична збірка
налаштуй ALB/auto-scaling       ✅ Deployed: https://myapp.vercel.app
додай SSL-сертифікат            (< 30 секунд)
підключи CDN
додай env variables
...7–15 кроків...
✅ Deployed
```

**Ключові характеристики нового покоління PaaS:**

- **Zero-config deployment**: автоматичне визначення фреймворку (Next.js, Vite, Django тощо)
- **Git-native workflow**: кожен PR отримує Preview URL → ревʼю прямо на живому середовищі
- **Edge-first**: глобальна CDN-мережа «з коробки»
- **Serverless infrastructure**: немає постійно запущених серверів → масштабування до нуля
- **Інтегровані Add-ons**: бази даних, черги, кеш — підключаються одним кліком

### 6.2 Vercel

**Vercel** — найпопулярніша платформа для frontend та full-stack застосунків, створена командою Next.js (тепер: Vercel Inc.).

**Ключові можливості:**

- **Next.js-native**: найкраща підтримка SSR/SSG/ISR/Server Components
- **Edge Functions**: функції виконуються на 100+ PoP з затримкою < 10 мс
- **Preview Deployments**: кожен Git branch/PR → окремий Preview URL (наприклад, `feature-login.vercel.app`)
- **Vercel Storage**: вбудовані сховища — Vercel KV (Redis), Vercel Postgres, Vercel Blob
- **Analytics & Web Vitals**: вбудований аналіз Core Web Vitals

**Підтримувані фреймворки:**
Next.js, React, Vue, Nuxt, SvelteKit, Astro, Remix, Angular, та інші.

**Розгортання на Vercel:**

```bash
# Варіант 1: через CLI
npm install -g vercel
vercel login
vercel                    # деплоймент поточної директорії
vercel --prod             # деплоймент у production

# Варіант 2: Git-інтеграція (рекомендований)
# 1. Підключіть GitHub репозиторій у Vercel Dashboard
# 2. Кожен push → автоматичний деплоймент
# 3. Кожен PR → Preview URL
```

**Vercel + Neon (serverless PostgreSQL):**

```javascript
// Підключення Neon через Vercel Storage (Next.js API Route)
import { sql } from "@vercel/postgres";
// або через Neon serverless driver:
import { neon } from "@neondatabase/serverless";

const db = neon(process.env.DATABASE_URL);

export async function GET() {
  const users = await db`SELECT * FROM users LIMIT 10`;
  return Response.json(users);
}
```

### 6.3 Netlify

**Netlify** — піонер Jamstack-деплойменту (2015), зосереджений на статичних сайтах та serverless functions.

**Ключові можливості:**

- **Jamstack-native**: статична збірка → CDN-деплоймент із мінімальною latency
- **Netlify Functions**: AWS Lambda під капотом (Node.js, Go)
- **Netlify Edge Functions**: Deno-based functions на Netlify Edge Network
- **Split Testing**: A/B тестування між deployment branches
- **Form Handling**: прийом HTML-форм без backend-коду
- **Identity**: вбудована автентифікація (JWT, OAuth)
- **Netlify DB (via Neon)**: PostgreSQL інтегровано безпосередньо у Netlify

**netlify.toml — конфігурація:**

```toml
[build]
  command   = "npm run build"
  publish   = "dist"           # або "out", ".next", тощо

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from   = "/api/*"
  to     = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for    = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

**Netlify Function (serverless backend):**

```javascript
// netlify/functions/users.js
export default async function handler(req, context) {
  const { neon } = await import("@neondatabase/serverless");
  const db = neon(process.env.DATABASE_URL);
  const users = await db`SELECT id, name FROM users`;
  return Response.json(users);
}
```

### 6.4 Render

**Render** — найпоширеніша альтернатива Heroku для backend-застосунків (веб-сервіси, фонові задачі, PostgreSQL, Redis).

**Ключові можливості:**

- **Web Services**: постійно запущені сервіси (Node.js, Python, Ruby, Go, Docker)
- **Static Sites**: безкоштовний CDN-хостинг
- **PostgreSQL**: керована БД із щоденними бекапами
- **Redis**: керований Redis
- **Background Workers**: фонові задачі
- **Cron Jobs**: задачі за розкладом
- **Private Services**: мікросервіси у приватній мережі

**`render.yaml` — Infrastructure as Code для Render:**

```yaml
services:
  # Основний веб-сервіс
  - type: web
    name: my-api
    runtime: node
    buildCommand: npm ci
    startCommand: node server.js
    plan: starter # безкоштовний тир
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: my-db
          property: connectionString

  # Воркер
  - type: worker
    name: email-worker
    runtime: node
    startCommand: node workers/email.js

databases:
  - name: my-db
    plan: starter # безкоштовно (90 днів)
    databaseName: myapp
```

**Особливість:** Render — єдина з нових платформ, що надає **постійно запущені** процеси (на відміну від serverless Vercel/Netlify), що робить її ідеальною для WebSocket-серверів, фонових задач та будь-яких застосунків зі станом.

### 6.5 Railway

**Railway** — платформа з фокусом на максимальну простоту деплойменту будь-якого backend-стека.

**Ключові можливості:**

- «Знайти **Dockerfile** → запустити» або авто-визначення стека (Nixpacks buildpack)
- Надежня підтримка PostgreSQL, MySQL, MongoDB, Redis як служб у рамках одного проєкту
- **Private Network**: всі сервіси одного проєкту спілкуються по приватній мережі
- **Environments**: dev/staging/prod середовища з різними змінними
- Тарифікація: **pay-per-use** (немає фіксованої ціни — платиш за реальне споживання)

```yaml
# railway.toml
[build]
nixpacks_config_file = "nixpacks.toml"

[deploy]
healthcheck_path = "/health"
restart_policy_type = "ON_FAILURE"
```

### 6.6 Serverless бази даних: Neon та Supabase

Нове покоління PaaS вводить концепцію **serverless database** — БД, що як і застосунок, масштабується до нуля при відсутності навантаження.

**Neon (serverless PostgreSQL):**

- Повний стандартний PostgreSQL
- **Branching**: база даних як Git-гілка — кожен Preview Deployment отримує окрему БД-гілку
- Масштабується до нуля → ідеально для dev/staging середовищ
- Нативна інтеграція з Vercel та Netlify

```bash
# Підключення Neon до Vercel проєкту
vercel env add DATABASE_URL
# або через Vercel Marketplace → Neon → Connect

# Migration (Prisma):
npx prisma db push
npx prisma migrate deploy
```

**Supabase (Firebase-альтернатива на PostgreSQL):**

- PostgreSQL + REST API (автогенерований з таблиць) + GraphQL
- **Realtime**: WebSocket-підписки на зміни у таблицях
- **Auth**: вбудована автентифікація (Email, OAuth, Phone)
- **Storage**: S3-сумісне файлове сховище
- **Edge Functions**: Deno-based serverless functions
- **Безкоштовний тир**: 500 MB БД, 2 GB зберігання, 50 тис. MAU

```javascript
// supabase/client.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

// Select
const { data, error } = await supabase
  .from("users")
  .select("*")
  .order("created_at", { ascending: false });

// Realtime subscription
supabase
  .channel("users")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "users" },
    (payload) => console.log("New user:", payload.new),
  )
  .subscribe();
```

### 6.7 Порівняльна таблиця: нові PaaS-платформи

| Критерій                  | Vercel                   | Netlify                   | Render                     | Railway                       |
| ------------------------- | ------------------------ | ------------------------- | -------------------------- | ----------------------------- |
| **Ідеально для**          | Next.js, frontend, Edge  | Jamstack, static, forms   | Backend сервіси, Always-on | Будь-який стек, швидкий старт |
| **Backend runtime**       | Edge/Serverless          | Serverless (Lambda)       | Постійний процес           | Постійний процес              |
| **PostgreSQL**            | Vercel Postgres (Neon)   | Netlify DB (Neon)         | Вбудований                 | Вбудований                    |
| **Безкоштовний тир**      | Hobby (100 GB bandwidth) | Free (125k functions/міс) | Free (750 год/міс)         | $5 credit/міс                 |
| **Preview URLs**          | ✅ (кожен PR)            | ✅ (кожен PR)             | ✅ (PR environments)       | ✅ (environments)             |
| **websocket / always-on** | ❌                       | ❌                        | ✅                         | ✅                            |
| **Docker підтримка**      | ❌                       | ❌                        | ✅                         | ✅                            |
| **Vendor lock-in**        | Середній                 | Середній                  | Низький                    | Низький                       |

### 6.8 Коли обирати нове покоління PaaS замість традиційного

**Оберіть Vercel/Netlify, якщо:**

- Frontend-застосунок (React, Next.js, SvelteKit, Astro)
- Потрібні Preview Deployments для code review
- Stateless API / serverless функції
- Глобальна CDN-швидкість є пріоритетом
- Команда 1–5 розробників без DevOps

**Оберіть Render/Railway, якщо:**

- Backend-сервіс з постійним процесом (WebSocket, фонові задачі)
- Потрібна БД поруч із сервісом у приватній мережі
- Docker-based деплоймент
- Потрібна проста Heroku-альтернатива

**Оберіть традиційний PaaS або IaaS, якщо:**

- Enterprise з вимогами до compliance (ISO 27001, SOC 2 Type II)
- Потрібна глибока інтеграція з корпоративними сервісами
- Масштаб понад 10M запитів/день (вартість нового PaaS зростає)
- Специфічна мережева топологія або on-premise компоненти

---

## Висновки

1. **PaaS** звільняє розробника від управління інфраструктурою (ОС, рантайм, веб-сервер), дозволяючи зосередитись на бізнес-логіці. За це доводиться платити зниженим контролем та vendor lock-in.

2. **AWS Elastic Beanstalk** є оркестратором AWS-ресурсів (EC2, ALB, ASG), що підтримує широкий спектр платформ та кастомних конфігурацій через `.ebextensions`.

3. **Azure App Service** є найзрілішою PaaS-платформою з потужними Deployment Slots, вбудованою автентифікацією та глибокою інтеграцією з Microsoft-екосистемою.

4. **Google App Engine Standard** унікальний можливістю масштабування до нуля — ідеальний для застосунків з нерівномірним навантаженням та мінімальними витратами при простої.

5. **Container-based PaaS** (Cloud Run, Azure Container Apps, App Runner) стає новим стандартом — поєднує простоту PaaS з гнучкістю контейнерів.

6. **Нове покоління PaaS** (Vercel, Netlify, Render, Railway) ставить Developer Experience (DX) на перше місце: git push → автоматичний деплоймент, Preview URLs для кожного PR, serverless бази даних (Neon, Supabase). Vercel/Netlify оптимальні для frontend/Jamstack, Render/Railway — для backend із постійними процесами.

---

## Джерела

1. AWS Documentation. (2024). _AWS Elastic Beanstalk Developer Guide_. https://docs.aws.amazon.com/elasticbeanstalk/
2. Microsoft. (2024). _Azure App Service Documentation_. https://learn.microsoft.com/en-us/azure/app-service/
3. Google Cloud. (2024). _App Engine Documentation_. https://cloud.google.com/appengine/docs
4. Wittig, A., & Wittig, M. (2018). _Amazon Web Services in Action_ (2nd ed.). Manning.
5. Krishnan, S. (2022). _Cloud-Native Applications with Kubernetes_. Packt.
6. Vercel Documentation. (2024). _Vercel Platform Documentation_. https://vercel.com/docs
7. Netlify Documentation. (2024). _Netlify Docs_. https://docs.netlify.com/
8. Neon Documentation. (2024). _Neon Serverless Postgres_. https://neon.tech/docs

---

## Запитання для самоперевірки

1. Поясніть, які шари стека бере на себе PaaS порівняно з IaaS. Що залишається відповідальністю розробника?
2. Назвіть три ключові переваги та три ключові обмеження PaaS.
3. Як AWS Elastic Beanstalk пов'язаний з IaaS-ресурсами AWS? Які ресурси він автоматично створює?
4. Що таке Deployment Slots в Azure App Service та яку проблему вони вирішують?
5. Чим відрізняються GAE Standard та GAE Flexible? Що означає «масштабування до нуля»?
6. Для яких команд і проєктів PaaS є кращим вибором порівняно з IaaS/K8s?
7. Що таке Blue/Green Deployment? Яким чином Elastic Beanstalk та App Service реалізують цю стратегію?
8. Порівняйте Google Cloud Run та Google App Engine. У чому полягає концептуальна різниця?
9. Поясніть концепцію vendor lock-in у контексті PaaS. Наведіть конкретний приклад.
10. Як PaaS вирішує проблему security patching (оновлення безпеки ОС)? Чи несе клієнт за це відповідальність?
11. Що таке «DX First» підхід у новому поколінні PaaS? Чим Vercel відрізняється від Elastic Beanstalk за ідеологією?
12. Що таке Preview Deployments? Яку проблему в командній розробці вони вирішують?
13. Порівняйте Neon та Supabase як serverless бази даних: для яких сценаріїв підходить кожна?
