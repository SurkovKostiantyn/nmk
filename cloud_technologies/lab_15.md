# Лабораторна робота №15 (2 години)

**Тема:** Розробка та розгортання Serverless-функцій.

Написання та тестування функцій на AWS Lambda або Cloudflare Workers; налаштування тригерів (HTTP, розклад); інтеграція з іншими хмарними сервісами; моніторинг serverless-застосунку.

**Мета:** Набути практичні навички написання, тестування та розгортання serverless-функцій; зрозуміти модель виконання FaaS (Function as a Service) та її переваги і обмеження порівняно з серверними рішеннями.

**Технологічний стек:**

- **Cloudflare Workers** (рекомендовано) — безкоштовно, 100 000 запитів/день, без картки
- **AWS Lambda** (альтернатива) — 1 млн безкоштовних запитів на місяць
- **Hono.js** — мінімалістичний фреймворк для Workers
- **Wrangler** — CLI для Cloudflare Workers

---

## Завдання

1. Розгорнути першу serverless-функцію (HTTP-тригер)
2. Додати маршрутизацію та обробку різних HTTP-методів
3. Налаштувати Environment Variables у serverless-оточенні
4. Налаштувати Cron Trigger (виконання за розкладом)
5. Перевірити моніторинг та логування функцій
6. (AWS) Інтегрувати Lambda з S3 (тригер при завантаженні файлу)

---

## Хід виконання роботи

### Крок 1. Cloudflare Workers — перша функція

1. Зайдіть на [https://workers.cloudflare.com](https://workers.cloudflare.com) → авторизуйтесь через GitHub
2. Або через CLI:

```bash
# Встановлення Wrangler CLI
npm install -g wrangler

# Авторизація
wrangler login

# Створення нового проєкту
npm create cloudflare@latest lab15-worker -- --type=hello-world
cd lab15-worker
```

Редагуйте `src/index.js`:

```js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Маршрутизація
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          message: "Serverless Lab 15!",
          runtime: "Cloudflare Workers",
          timestamp: new Date().toISOString(),
          region: request.cf?.colo || "unknown",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/echo" && request.method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify({ echo: body }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/env") {
      return new Response(
        JSON.stringify({
          APP_NAME: env.APP_NAME || "not set",
          ENVIRONMENT: env.ENVIRONMENT || "development",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
```

```bash
# Локальний запуск для тестування
wrangler dev

# Тест локально
curl http://localhost:8787/
curl -X POST http://localhost:8787/echo -H "Content-Type: application/json" -d '{"hello":"world"}'

# Розгортання у хмару
wrangler deploy
```

Після деплою ви отримаєте URL вигляду `https://lab15-worker.<ваш-subdomain>.workers.dev`.

### Крок 2. Налаштування Environment Variables

У `wrangler.toml` додайте:

```toml
name = "lab15-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
APP_NAME = "Lab 15 Serverless"
ENVIRONMENT = "production"
```

Для секретних змінних (паролі, токени):

```bash
# Додавання секрету (не зберігається у wrangler.toml)
wrangler secret put API_KEY
# Введіть значення секрету

# Перелік секретів
wrangler secret list
```

### Крок 3. AWS Lambda — альтернативний варіант

```bash
# Встановлення AWS SAM CLI (Serverless Application Model)
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Або через AWS Console: Lambda → Create function
```

**Через AWS Console:**

1. Lambda → **Create function** → **Author from scratch**
2. **Function name:** `lab15-lambda`
3. **Runtime:** Node.js 20.x
4. **Architecture:** x86_64
5. Натисніть **Create function**

Замініть код у вбудованому редакторі:

```js
export const handler = async (event) => {
  const path = event.rawPath || "/";
  const method = event.requestContext?.http?.method || "GET";

  console.log(`${method} ${path}`);

  if (path === "/health") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Hello from Lambda!",
      path,
      method,
      env: process.env.ENVIRONMENT || "unknown",
    }),
  };
};
```

**Додавання Function URL (HTTP-тригер):**

- Lambda → ваша функція → **Configuration** → **Function URL** → **Create function URL**
- Auth type: **NONE** (публічний доступ)
- Скопіюйте URL та перевірте в браузері

### Крок 4. Cron Trigger (виконання за розкладом)

**Cloudflare Workers — Cron:**

Додайте до `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]   # Кожні 5 хвилин
```

Додайте обробник в `src/index.js`:

```js
export default {
  async fetch(request, env, ctx) {
    // ... попередній код ...
  },

  async scheduled(event, env, ctx) {
    console.log(`Cron triggered at: ${new Date().toISOString()}`);
    console.log(`Cron expression: ${event.cron}`);
    // Тут може бути будь-яка логіка: очистка кешу, надсилання звіту тощо
  },
};
```

**AWS Lambda — EventBridge (CloudWatch Events):**

1. Lambda → ваша функція → **+ Add trigger**
2. **Trigger configuration:** EventBridge (CloudWatch Events)
3. **Rule:** Create a new rule
4. **Rule name:** `lab15-cron`
5. **Schedule expression:** `rate(5 minutes)`

### Крок 5. Моніторинг та логування

**Cloudflare Workers:**

- Cloudflare Dashboard → Workers → `lab15-worker` → **Metrics**
- Перегляньте: Requests, Errors, CPU Time
- **Real-time logs:** `wrangler tail`

```bash
# Реальний час логів
wrangler tail

# Надішліть кілька запитів і спостерігайте за логами
curl https://lab15-worker.<subdomain>.workers.dev/
```

**AWS Lambda:**

- Lambda → ваша функція → **Monitor** → **View CloudWatch logs**
- Знайдіть Log Group `/aws/lambda/lab15-lambda`
- Перегляньте INIT_START, START, END, REPORT рядки

```bash
# Останні виклики через CLI
aws lambda invoke \
  --function-name lab15-lambda \
  --payload '{"rawPath": "/health"}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

---

## Контрольні запитання

1. Що таке FaaS (Function as a Service)? Чим serverless-функції відрізняються від звичайних серверних застосунків?
2. Що таке «холодний старт» (cold start) у Lambda/Workers? Як він впливає на продуктивність?
3. Назвіть типи тригерів для AWS Lambda. Наведіть приклади використання кожного.
4. Які є обмеження serverless-функцій (максимальний час виконання, обсяг пам'яті, розмір пакету)?
5. У яких сценаріях serverless-архітектура є оптимальним рішенням, а у яких — ні?
6. Що таке idempotency у контексті serverless-функцій? Чому це важливо при роботі з чергами повідомлень?

---

## Вимоги до звіту

1. Публічне URL розгорнутої функції (Cloudflare Worker або Lambda Function URL)
2. Скриншот браузера з JSON-відповіддю функції
3. Вивід `curl /echo` з POST-запитом та відповіддю
4. Скриншот панелі метрик (Cloudflare Metrics або CloudWatch)
5. Вміст `wrangler.toml` або конфігурації Cron Trigger
6. Відповіді на контрольні запитання у файлі `lab15.md`
7. Посилання на GitHub з кодом надіслати в Classroom
