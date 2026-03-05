# Лабораторна робота №10 (2 години)

**Тема:** Розгортання веб-застосунку на PaaS-платформі.

Розгортання веб-застосунку (Node.js / Python) на AWS Elastic Beanstalk або Azure App Service; налаштування середовища виконання та змінних оточення; конфігурація автоматичного масштабування; управління середовищами staging/production.

**Мета:** Набути практичні навички розгортання застосунків на PaaS-платформах, навчитись керувати середовищами та конфігурацією без потреби адміністрування серверної інфраструктури.

**Технологічний стек:**

- **Railway** або **Render** (рекомендовано) — сучасні PaaS без кредитної картки
- **AWS Elastic Beanstalk** (альтернатива) — класичний PaaS від AWS
- **Node.js 20** або **Python 3.12** — мова застосунку
- **GitHub** — для інтеграції з PaaS

---

## Завдання

1. Підготувати простий веб-застосунок та завантажити до GitHub
2. Підключити репозиторій до PaaS-платформи та виконати перше розгортання
3. Налаштувати змінні оточення через PaaS-консоль
4. Оновити застосунок та переконатись у автоматичному перерозгортанні
5. Налаштувати second environment (staging)
6. Дослідити логи та метрики застосунку в PaaS-консолі

---

## Хід виконання роботи

### Крок 1. Підготовка застосунку

Якщо ще не маєте застосунку з Лаб. №6 — створіть новий:

```bash
mkdir lab10-paas && cd lab10-paas
```

**Node.js застосунок:**

```bash
npm init -y
npm install express
```

```js
// server.js
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const visits = {};

app.get("/", (req, res) => {
  res.json({
    message: process.env.WELCOME_MSG || "Hello from PaaS!",
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "1.0.0",
    hostname: require("os").hostname(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

app.listen(PORT, () =>
  console.log(`Running on port ${PORT} in ${process.env.NODE_ENV} mode`),
);
```

```json
// package.json — додайте до scripts:
"start": "node server.js"
```

Ініціалізуйте Git та завантажте до GitHub:

```bash
git init
echo "node_modules/" > .gitignore
git add .
git commit -m "Initial commit — Lab 10 PaaS app"
# Створіть репозиторій на GitHub та:
git remote add origin https://github.com/<username>/lab10-paas.git
git push -u origin main
```

### Крок 2. Розгортання на Railway (рекомендовано)

Railway — сучасна PaaS-платформа з безкоштовним тарифом ($5 кредитів щомісяця, без картки).

1. Зайдіть на [https://railway.app](https://railway.app) та авторизуйтесь через GitHub
2. Натисніть **New Project** → **Deploy from GitHub repo**
3. Оберіть `lab10-paas`
4. Railway автоматично визначить Node.js і розпочне збірку
5. Перейдіть до **Settings** → **Networking** → **Generate Domain** для отримання публічного URL
6. Відкрийте URL у браузері — ви маєте побачити JSON-відповідь

**Альтернатива — Render:**

1. Зайдіть на [https://render.com](https://render.com) → **New Web Service**
2. Підключіть GitHub → оберіть `lab10-paas`
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. **Instance Type:** Free
6. Натисніть **Create Web Service**

### Крок 3. Налаштування змінних оточення

У Railway:

- Ваш проєкт → **Variables** → **New Variable**
- Додайте:
  - `WELCOME_MSG` = `Привіт від ETI Cloud Club!`
  - `APP_VERSION` = `1.0.0`
  - `NODE_ENV` = `production`

Після збереження Railway автоматично перерозгорне застосунок. Перевірте зміни у відповіді API.

### Крок 4. Оновлення застосунку (автодеплой)

Змініть `server.js` — додайте новий маршрут:

```js
app.get("/about", (req, res) => {
  res.json({
    name: "Lab 10 — PaaS Deployment",
    student: process.env.STUDENT_NAME || "Unknown",
    platform: "Railway / Render",
  });
});
```

```bash
git add .
git commit -m "Add /about endpoint"
git push origin main
```

Railway / Render автоматично виявить push та запустить новий деплой. Слідкуйте за процесом у **Deployments** → відкрийте новий URL і перевірте `/about`.

### Крок 5. AWS Elastic Beanstalk (альтернативний варіант)

```bash
# Встановлення EB CLI
pip install awsebcli

# Ініціалізація у директорії застосунку
eb init lab10-app --platform node.js-20 --region eu-central-1

# Створення та розгортання середовища
eb create lab10-production

# Перегляд статусу
eb status

# Відкрити застосунок у браузері
eb open

# Розгортання після змін
eb deploy

# Перегляд логів
eb logs

# Знищення середовища (після завершення)
eb terminate lab10-production
```

### Крок 6. Дослідження логів та метрик

**Railway:**

- Ваш проєкт → вкладка **Logs** — логи в реальному часі
- **Metrics** — графіки CPU, Memory, Network

**Render:**

- Service → **Logs** — стрімінг логів
- **Metrics** → графіки utilization

Згенеруйте трафік для спостереження:

```bash
# Надішліть 50 запитів
for i in {1..50}; do curl -s https://<your-app-url> > /dev/null; done
```

---

## Контрольні запитання

1. Що таке PaaS (Platform as a Service)? Яку частину управління інфраструктурою бере на себе провайдер, а яку залишає розробнику?
2. Чим відрізняється PaaS від IaaS? Наведіть конкретні приклади, коли варто обрати кожну модель.
3. Що таке environment variables (змінні оточення)? Чому їх потрібно використовувати замість жорстко вписаних значень у коді?
4. Що таке Blue/Green Deployment? Як PaaS-платформи використовують цей підхід для оновлень без простою?
5. Що таке Procfile у контексті PaaS (Heroku/Railway)? Для чого він використовується?
6. Які обмеження мають PaaS-платформи порівняно з IaaS? Коли PaaS не є оптимальним рішенням?

---

## Вимоги до звіту

1. Посилання на GitHub-репозиторій із кодом застосунку
2. Публічне URL застосунку на Railway / Render — скриншот у браузері
3. Скриншот панелі змінних оточення з налаштованими значеннями
4. Скриншот або лог автоматичного деплою після push до GitHub
5. Скриншот метрик або логів застосунку в PaaS-консолі
6. Відповіді на контрольні запитання у файлі `lab10.md`
7. Посилання на GitHub та публічний URL надіслати в Classroom
