# Лабораторна робота №13 (2 години)

**Тема:** Побудова CI/CD пайплайну у хмарі.

Налаштування репозиторію та гілок у Git; створення CI/CD пайплайну засобами GitHub Actions; автоматичне тестування, збірка Docker-образу та розгортання на хмарний сервіс; реалізація стратегії розгортання.

**Мета:** Набути практичні навички побудови автоматизованого пайплайну безперервної інтеграції та доставки (CI/CD) з використанням GitHub Actions: від коміту до автоматичного розгортання у хмарі.

**Технологічний стек:**

- **GitHub Actions** — платформа CI/CD (безкоштовно: 2000 хвилин/місяць)
- **Docker Hub** — реєстр образів
- **Railway** або **Render** — цільова платформа розгортання
- **Node.js** — мова застосунку з тестами (Jest)

---

## Завдання

1. Написати застосунок з unit-тестами
2. Налаштувати GitHub Actions workflow для автоматичного тестування (CI)
3. Додати крок збірки та публікації Docker-образу
4. Налаштувати автоматичне розгортання на Railway/Render (CD)
5. Перевірити, що провальний тест блокує деплой
6. Ознайомитись з концепцією Secrets у GitHub

---

## Хід виконання роботи

### Крок 1. Застосунок з тестами

Підготуйте проєкт (або розширте з Лаб. №10):

```bash
mkdir lab13-cicd && cd lab13-cicd
npm init -y
npm install express
npm install --save-dev jest supertest
```

```js
// server.js
const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) =>
  res.json({ message: "Hello CI/CD!", version: "1.0.0" }),
);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.post("/sum", (req, res) => {
  const { a, b } = req.body;
  if (typeof a !== "number" || typeof b !== "number")
    return res.status(400).json({ error: "a and b must be numbers" });
  res.json({ result: a + b });
});

module.exports = app;
if (require.main === module)
  app.listen(process.env.PORT || 3000, () => console.log("Running"));
```

```js
// server.test.js
const request = require("supertest");
const app = require("./server");

describe("API Tests", () => {
  test("GET / returns hello message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Hello CI/CD!");
  });

  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("POST /sum calculates correctly", async () => {
    const res = await request(app).post("/sum").send({ a: 5, b: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(8);
  });

  test("POST /sum returns error for non-numbers", async () => {
    const res = await request(app).post("/sum").send({ a: "abc", b: 3 });
    expect(res.statusCode).toBe(400);
  });
});
```

Додайте до `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "test": "jest"
}
```

Перевірте тести локально:

```bash
npm test
```

### Крок 2. Dockerfile та .github/workflows

Створіть `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Створіть `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/lab13-cicd

jobs:
  # ─── 1. CI: Тести ──────────────────────────────────────────────
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  # ─── 2. Build & Push Docker Image ──────────────────────────────
  build:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: test # Запускається ТІЛЬКИ після успішних тестів
    if: github.ref == 'refs/heads/main' # Тільки для main-гілки
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:latest
            ${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── 3. CD: Deploy ─────────────────────────────────────────────
  deploy:
    name: Deploy to Railway
    runs-on: ubuntu-latest
    needs: build
    environment: production
    steps:
      - name: Deploy via Railway CLI
        run: |
          npm install -g @railway/cli
          railway up --service lab13-cicd
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Крок 3. Налаштування Secrets у GitHub

1. GitHub → ваш репозиторій → **Settings** → **Secrets and variables** → **Actions**
2. Додайте:
   - `DOCKERHUB_USERNAME` — ваш логін Docker Hub
   - `DOCKERHUB_TOKEN` — Docker Hub → **Account Settings** → **Security** → **New Access Token**
   - `RAILWAY_TOKEN` — Railway → **Account Settings** → **Tokens** → **New Token**

### Крок 4. Перший запуск пайплайну

```bash
git init
git add .
git commit -m "Initial commit — Lab 13 CI/CD"
echo "node_modules\n.env" > .gitignore
# Створіть репозиторій на GitHub та:
git remote add origin https://github.com/<username>/lab13-cicd.git
git push -u origin main
```

Відкрийте **Actions** у GitHub репозиторії — спостерігайте за виконанням пайплайну:

- ✅ Test → Build → Deploy
- Всі три кроки мають пройти успішно

### Крок 5. Тест провального пайплайну

Навмисно зламайте тест, щоб переконатися, що деплой блокується:

```js
// server.test.js — тимчасово змініть:
test("POST /sum calculates correctly", async () => {
  const res = await request(app).post("/sum").send({ a: 5, b: 3 });
  expect(res.body.result).toBe(999); // навмисна помилка
});
```

```bash
git add . && git commit -m "Broken test (intentional)" && git push
```

У GitHub Actions ви маєте побачити:

- ❌ Test (failed)
- ⏭ Build — НЕ запустився
- ⏭ Deploy — НЕ запустився

Поверніть правильне значення та запушіть знову.

### Крок 6. Badges у README

Додайте бейдж статусу до `README.md`:

```markdown
# Lab 13 — CI/CD

![CI/CD](https://github.com/<username>/lab13-cicd/actions/workflows/ci-cd.yml/badge.svg)
```

---

## Контрольні запитання

1. Що таке Continuous Integration (CI)? Чому важливо запускати тести при кожному коміті?
2. Що таке Continuous Delivery (CD) та Continuous Deployment? В чому між ними різниця?
3. Що таке GitHub Actions workflow, job та step? Як вони співвідносяться між собою?
4. Що таке GitHub Secrets? Чому важливо не зберігати паролі та токени безпосередньо у YAML-файлі пайплайну?
5. Поясніть ключове слово `needs` у GitHub Actions. Для чого воно використовується?
6. Що таке Blue/Green Deployment та Canary Deployment? Які переваги кожного підходу?

---

## Вимоги до звіту

1. Вміст файлу `.github/workflows/ci-cd.yml`
2. Скриншот успішного виконання всіх трьох jobs у GitHub Actions
3. Скриншот провального пайплайну (job Test failed, Build та Deploy не запустились)
4. Посилання на GitHub-репозиторій з видимими Actions
5. Посилання на опублікований образ на Docker Hub
6. Відповіді на контрольні запитання у файлі `lab13.md`
7. Посилання на GitHub надіслати в Classroom
