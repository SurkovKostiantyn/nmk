# Лекція 18 (2 години). Виробнича збірка, оптимізація бандлу, CI/CD та хмарний деплоймент

## План лекції

- 1. Анатомія виробничої збірки (Production Build): мініфікація, Tree Shaking та оптимізація Rollup;
- 2. Динамічне розділення коду (Code Splitting): маршрутна оптимізація через `React.lazy` та `Suspense`;
- 3. Візуалізація та аудит ваги бандлу за допомогою `rollup-plugin-visualizer`;
- 4. Автоматизація конвеєра CI/CD у GitHub Actions: матриця лінтингу, типізації, модульних тестів та збірки;
- 5. Контейнеризація застосунку за допомогою Docker: оптимізований Multi-stage build на базі сервера Nginx;
- 6. Хмарний деплоймент (Vercel, Cloudflare Pages, AWS) та підсумковий огляд дорожньої карти розробника.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **CI** (Continuous Integration) — безперервна інтеграція коду;
- **CD** (Continuous Delivery / Deployment) — безперервна доставка та розгортання;
- **SPA** (Single Page Application) — односторінковий веб-додаток;
- **ESM** (ECMAScript Modules) — стандарт модульної системи JavaScript;
- **CDN** (Content Delivery Network) — мережа доставки контенту.

## Вступ

Створення коду на локальній машині розробника (`npm run dev`) є лише першим етапом життєвого циклу програмного забезпечення. Локальне середовище оптимізоване для швидкості розробки: воно містить детальні повідомлення про помилки, sourcemaps у пам'яті та механізм гарячої заміни модулів (HMR).

Виробниче середовище (Production) має діаметрально протилежні пріоритети: мінімальний розмір файлів, максимальна швидкість мережевої передачі через стиснення Gzip/Brotli, агресивне кешування у браузерах та абсолютна автоматизація процесів перевірки коду перед його виходом до кінцевих користувачів.

У заключній лекції дисципліни детально аналізується механіка створення виробничого бандлу у Vite, розглядаються техніки динамічного завантаження сторінок (`React.lazy`), демонструється налаштування конвеєра CI/CD у GitHub Actions, створюється продакшн-контейнер Docker з Nginx, порівнюються платформи хмарного хостингу та підбиваються підсумки опанованої дорожньої карти сучасного React-інженера.

---

## 1. Анатомія виробничої збірки (Production Build)

Коли ви запускаєте команду `npm run build`, збирач Vite перемикається з режиму розробки (на базі esbuild) у режим промислової збірки на базі високопродуктивного пакувальника **Rollup**.

### Ключові етапи виробничої оптимізації

- мініфікація та обфускація (Minification) — видалення всіх коментарів, пробілів, переносів рядків та скорочення імен внутрішніх змінних до одного символу (`const userProfileData` -> `const a`);
- усунення мертвого коду (Tree Shaking) — статичний аналіз структури `import/export` стандарту ESM. Якщо бібліотека містить 100 утиліт, а ви імпортували лише одну (`import { capitalize } from 'lodash-es'`), решта 99 функцій будуть повністю викинуті з фінального бандлу;
- видалення налагоджувального коду — вирізання всіх перевірок типів PropTypes, внутрішніх валідацій React та консольних логів для режиму розробки;
- хешування файлів (Content Hashing) — додавання унікального хешу вмісту до назв згенерованих файлів (наприклад, `main.d4f8a1.js`). Це дозволяє налаштувати нескінченне кешування у браузері (`Cache-Control: max-age=31536000, immutable`), оскільки при зміні хоча б одного байта код отримає нову назву.

---

## 2. Динамічне розділення коду (Code Splitting) через `React.lazy`

За замовчуванням бандлер об'єднує весь вихідний код у єдиний гігантський JavaScript-файл. Якщо користувач заходить лише на головну сторінку, його браузер змушений завантажувати важкі скрипти кабінету адміністратора, графіків та аналітики, які йому взагалі можуть не знадобитися.

**Code Splitting (Розділення коду)** розбиває бандл на окремі чанки (Chunks), які завантажуються браузером асинхронно суто на вимогу (On-Demand).

### Патерн розділення на рівні маршрутів

Найбільш ефективною стратегією є завантаження окремих сторінок за допомогою комбінації `React.lazy()` та `<Suspense>`:

```tsx
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { PageLoader } from './components/PageLoader';

// Статичний імпорт потрібен лише для критично важливої першої сторінки
import { HomePage } from './pages/HomePage';

// Важкі другорядні сторінки завантажуються ледаче (динамічний чанк)
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader message="Завантаження розділу..." />}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

Тепер сторінка `AdminDashboard` (з її важкими бібліотеками таблиць та графіків) завантажиться лише тоді, коли користувач дійсно здійснить перехід за адресою `/admin`.

---

## 3. Аудит та візуалізація ваги бандлу через `rollup-plugin-visualizer`

Для ефективної оптимізації інженер повинен наочно бачити, які саме npm-пакети займають найбільше місця у фінальній збірці.

### Підключення плагіна візуалізації

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'stats.html', // Назва файлу звіту
      open: false,            // Автоматично відкривати у браузері
      gzipSize: true,        // Показувати розмір зі стисненням Gzip
      brotliSize: true,      // Показувати розмір зі стисненням Brotli
    }),
  ],
});
```

Після виконання `npm run build` у корені проєкту створюється інтерактивна діаграма `stats.html`. Вона дозволяє:
- миттєво знаходити випадково імпортовані "важкі" бібліотеки (наприклад, імпорт усієї `moment.js` замість `date-fns`);
- виявляти дублікати пакетів різних версій;
- контролювати розмір кожного згенерованого чанка.

---

## 4. Автоматизація конвеєра CI/CD у GitHub Actions

Ручний деплой із комп'ютера розробника несе ризик людського фактора: розробник може забути запустити тести, пропустити помилки типізації або випадково задеплоїти код із брудної локальної гілки.

**CI/CD (Continuous Integration / Continuous Delivery)** автоматизує перевірку коду в ізольованому хмарному середовищі при кожному `git push` або Pull Request.

### Повний конфігураційний файл робочого процесу GitHub Actions

Створіть файл `.github/workflows/ci-cd.yml`:

```yaml
name: Production CI/CD Pipeline

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]

jobs:
  quality-check:
    name: Lint, Typecheck and Test
    runs-on: ubuntu-latest

    steps:
      - name: Клонування репозиторію
        uses: actions/checkout@v4

      - name: Налаштування Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Встановлення залежностей
        run: npm ci

      - name: Статичний аналіз коду (ESLint)
        run: npm run lint

      - name: Перевірка типів TypeScript
        run: npx tsc --noEmit

      - name: Запуск автоматизованих тестів (Vitest)
        run: npm run test:run

      - name: Виробнича збірка проєкту
        run: npm run build

      - name: Збереження артефактів збірки
        uses: actions/upload-artifact@v4
        with:
          name: dist-bundle
          path: dist/
```

Якщо на будь-якому з етапів (лінтинг, типізація чи тести) виникає помилка, конвеєр миттєво зупиняється і блокує злиття коду (Branch Protection Rule).

---

## 5. Контейнеризація за допомогою Docker (Multi-stage build з Nginx)

Для розгортання SPA у корпоративних хмарних кластерах (Kubernetes, AWS ECS) найкращою практикою є створення легковагого Docker-контейнера.

### Патерн багатоетапної збірки (Multi-stage Build)

Неприпустимо тягнути в робочий Docker-образ повне середовище Node.js з папкою `node_modules` (це роздуває розмір образу до 1–2 Гб). Натомість використовується двоетапна збірка:
- Етап 1 (Builder): Node.js встановлює залежності та збирає проєкт у папку `dist`;
- Етап 2 (Production): статичні файли копіюються в ультралегкий веб-сервер Alpine Nginx (підсумковий розмір образу — менше ніж 25 Мб).

### Файл `Dockerfile`

```dockerfile
# Етап 1: Збірка проєкту
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Етап 2: Продакшн сервер Nginx
FROM nginx:alpine-slim
WORKDIR /usr/share/nginx/html

# Очищуємо дефолтні файли Nginx
RUN rm -rf ./*

# Копіюємо скомпільовану статику з першого етапу
COPY --from=builder /app/dist .

# Копіюємо конфігурацію для Single Page Application
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Конфігурація `nginx.conf` для підтримки клієнтського роутингу

Для того щоб при оновленні сторінки в SPA (наприклад, `/catalog/42`) веб-сервер не видавав помилку `404 Not Found`, Nginx має перенаправляти всі запити на `index.html`:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # Критично важливо для SPA: перенаправляти будь-який шлях на index.html
        try_files $uri $uri/ /index.html;
    }

    # Кешування статичних файлів з хешами
    location ~* \.(?:css|js|woff2?|svg|png|jpg|webp)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Заборона кешування для головного index.html
    location = /index.html {
        root /usr/share/nginx/html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## 6. Стратегії хмарного розгортання та підсумки курсу

### Порівняння платформ для сучасного React-деплою

- **Vercel** — ідеальна платформа для Next.js та Vite. Надає автоматичний деплой з GitHub за кілька секунд, попередній перегляд PR (Preview Deployments), глобальну CDN та вбудовану аналітику швидкодії;
- **Cloudflare Pages** — ультрашвидкий безкоштовний хостинг статичних сайтів з нульовою затримкою завдяки найбільшій глобальній Edge-мережі;
- **AWS S3 + CloudFront** — класичний Enterprise-підхід для високонавантажених SPA. Файли зберігаються у бакеті S3 і роздаються через глобальний CDN CloudFront із захистом WAF.

### Підсумковий огляд дорожньої карти курсу

За час вивчення дисципліни "Програмування веб-додатків (React.js)" ви опанували повний стек технологій сучасного Frontend/Fullstack інженера:

- Модуль 1 (Основи) — декларативна парадигма, vDOM, Vite, інженерна типізація TypeScript та сучасна стилізація з Tailwind/Headless UI;
- Модуль 2 (Архітектура та стан) — односпрямований потік даних, імутабельність, керування складними формами (React Hook Form, Zod), нативні Form Actions React 19;
- Модуль 3 (Просунуті хуки та продуктивність) — анатомія життєвого циклу `useEffect`, кастомні хуки, стейт-менеджмент Zustand, асинхронне кешування TanStack Query та клієнтська маршрутизація;
- Модуль 4 (Fullstack, якість та випуск) — автоматизоване тестування (Vitest, RTL, MSW, Playwright), революція Server Components у Next.js, веб-безпека та автоматизований випуск додатку через CI/CD та Docker.

Цей інженерний фундамент відповідає найвищим сучасним вимогам міжнародної IT-індустрії до Middle React Developer.

---

## Висновки

- оптимізація виробничого бандлу - Rollup утилізує Tree Shaking та Content Hashing для максимального скорочення розміру коду та агресивного кешування;
- маршрутне розділення через `React.lazy` - динамічне завантаження сторінок на вимогу мінімізує початковий час завантаження головного екрана (FCP);
- контроль ваги за допомогою візуалізаторів - регулярний аудит через `stats.html` усуває випадкове роздування бандлу сторонніми бібліотеками;
- неперервна інтеграція (CI/CD) - конвеєр GitHub Actions гарантує автоматичну перевірку якості коду (лінтинг, типи, тести) перед кожним релізом;
- двоетапна контейнеризація - використання Docker Multi-stage build з Nginx створює крихітний образ (<25 Мб) із правильною підтримкою маршрутизації через `try_files`;
- цілісність інженерної моделі - успішний веб-додаток поєднує бездоганну типізацію, надійні тести, високі оцінки швидкодії та повну автоматизацію доставки.

---

## Рекомендована література та джерела

- офіційне керівництво Vite щодо налаштування збірки для продакшну - https://vite.dev/guide/build.html;
- документація розділення коду (Code Splitting) у React - https://react.dev/reference/react/lazy;
- документація плагіна аналізу розміру `rollup-plugin-visualizer` - https://github.com/btd/rollup-plugin-visualizer;
- офіційне керівництво з налаштування робочих процесів GitHub Actions - https://docs.github.com/en/actions;
- посібник з розгортання Single Page Application на Nginx - https://docs.nginx.com/nginx/admin-guide/web-server/web-server/;
- офіційна документація платформи Vercel для Vite - https://vercel.com/docs/frameworks/vite.

---

## Запитання для самоперевірки

- у чому полягає відмінність роботи збирача Vite у режимі розробки (`npm run dev`) та режимі виробничої збірки (`npm run build`);
- як працює механізм Tree Shaking і яка умова модульної системи (ESM vs CommonJS) є обов'язковою для його коректного функціонування;
- чому комбінація `React.lazy` та `<Suspense>` покращує показники початкового завантаження додатку;
- яку інформацію надає згенерований звіт `stats.html` після аудиту бандлу;
- які обов'язкові етапи верифікації коду має включати базовий конвеєр CI/CD у GitHub Actions;
- чому в контейнері Docker для роздачі SPA використовується двоетапна збірка (Multi-stage build);
- навіщо у конфігурації веб-сервера Nginx для SPA додатків потрібна директива `try_files $uri $uri/ /index.html`.
