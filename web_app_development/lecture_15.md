# Лекція 15 (2 години). Автоматизоване тестування: Vitest, React Testing Library та Mock Service Worker

## План лекції

- 1. Піраміда тестування сучасного фронтенду: модульні (Unit), інтеграційні (Integration) та наскрізні (E2E) тести;
- 2. Тест-раннер Vitest: нативна інтеграція з Vite, підтримка ESM/TypeScript та переваги над Jest;
- 3. Філософія React Testing Library (RTL): тестування поведінки користувача замість деталей реалізації;
- 4. Ізольоване модульне тестування кастомних хуків за допомогою утиліти `renderHook` та функції `act()`;
- 5. Мережевий мокінг на рівні Service Worker: перехоплення HTTP-запитів через Mock Service Worker (MSW v2);
- 6. Стратегії наскрізного тестування (End-to-End): огляд роботи фреймворку Playwright у реальних браузерах.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **E2E** (End-to-End) — наскрізне тестування поведінки інтерфейсу;
- **RTL** (React Testing Library) — бібліотека тестування React-компонентів;
- **MSW** (Mock Service Worker) — бібліотека емуляції мережевих відповідей;
- **CI** (Continuous Integration) — конвеєр безперервної інтеграції коду.

## Вступ

Створення надійного комерційного веб-додатку неможливе без автоматизованого тестування. Ручна перевірка десятків форм, кнопок та сценаріїв користувача перед кожним релізом вимагає величезних витрат часу і не захищає від випадкових регресій — коли виправлення однієї помилки непомітно ламає сусідній функціонал.

Проте застарілі підходи до тестування React (зокрема популярний у минулому фреймворк Enzyme) фокусувалися на інспекції внутрішнього стану компонентів (`wrapper.state()`) та виклику приватних методів класу. При найменшому рефакторингу коду такі тести масово падали, навіть якщо візуально та функціонально додаток продовжував працювати ідеально.

Сучасна екосистема тестування базується на принципово іншій філософії: **тестувати застосунок так, як ним користується реальна людина**.

У цій лекції розглядається структура піраміди тестування фронтенду, досліджуються можливості швидкого тест-раннера Vitest, демонструється написання поведінкових тестів компонентів через React Testing Library, розбирається юніт-тестування кастомних хуків, а також наводиться архітектура мережевого мокінгу через Mock Service Worker (MSW v2) та наскрізного тестування з Playwright.

---

## 1. Піраміда тестування сучасного фронтенду

Класична інженерна піраміда тестування розподіляє тести за трьома рівнями залежно від швидкості виконання, вартості підтримки та рівня ізоляції:

- модульні тести (Unit Tests) — перевіряють окремі ізольовані функції, утиліти або кастомні хуки без рендерингу складного DOM. Виконуються за мілісекунди, дешеві в написанні, але не гарантують, що компоненти правильно співпрацюватимуть між собою;
- інтеграційні тести (Integration Tests) — тестують взаємодію групи компонентів разом із хуками, стейт-менеджерами та мережевими шарами (наприклад, заповнення форми, клік по кнопці та відображення отриманого результату). Становлять ядро сучасного тестування фронтенду (базовий інструмент — React Testing Library);
- наскрізні тести (End-to-End / E2E) — запускають реальний браузер (Chromium, Firefox, WebKit) і симулюють повний шлях користувача від авторизації до оплати замовлення на живому або тестовому стенді. Найбільш надійні, проте повільні та вимогливі до ресурсів інфраструктури (інструменти — Playwright, Cypress).

---

## 2. Тест-раннер Vitest та його переваги над Jest

Протягом багатьох років стандартом індустрії був тест-раннер Jest. Проте в сучасних проєктах на базі Vite використання Jest створює суттєві труднощі: Jest вимагає окремої конфігурації Babel/ts-jest, не розуміє нативні ESM-модулі без складних налаштувань і виконує повільну перетранспіляцію.

**Vitest** — це сучасний, надшвидкий тест-раннер нового покоління, створений безпосередньо командою Vite:

- спільний конфігураційний пайплайн — Vitest використовує ті самі плагіни, правила резолву модулів та аліаси шляхів (`@/*`), що й конфігурація `vite.config.ts`;
- миттєвий запуск (Hot Module Replacement у тестах) — завдяки esbuild тести на TypeScript запускаються практично без затримки;
- повна сумісність з API Jest — підтримує звичні функції `describe`, `it`, `test`, `expect`, `vi.fn()` (заміна `jest.fn()`).

### Налаштування середовища Vitest для React

```typescript
// vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Емуляція DOM браузера за допомогою JSDOM
    setupFiles: './src/setupTests.ts',
  },
});
```

У файлі `src/setupTests.ts` підключаються розширені матчери для перевірки DOM-елементів:

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';
```

---

## 3. Філософія React Testing Library (RTL)

Головний маніфест React Testing Library, сформульований Кентом Сі Доддсом:

> *"Чим більше ваші тести нагадують те, як використовується ваше програмне забезпечення, тим більше впевненості вони вам дають."*

### Чому не варто тестувати внутрішній стан?

Користувачеві байдуже, чи називається ваша внутрішня змінна стану `isOpen`, чи це булеве значення `true`, чи ви використали `useState`, чи `useReducer`. Користувача цікавить одне: якщо він натиснув на кнопку з написом "Увійти", чи з'явилося на екрані вітальне повідомлення з його ім'ям.

RTL свідомо **не надає доступу** до внутрішніх змінних стану та vDOM-структури компонента. Всі операції здійснюються виключно через пошук елементів у згенерованому DOM так, як їх шукає людина або скрінрідер (Accessible Roles, підписи лейблів, текстовий вміст).

### Пріоритет запитів (Query Priority)

RTL пропонує чітку ієрархію методів пошуку елементів:

- 1. Доступні для всіх (Найвищий пріоритет) — `getByRole` (наприклад, `{ role: 'button', name: /зберегти/i }`), `getByLabelText` (пошук інпута за підписом лейбла), `getByPlaceholderText`, `getByText`;
- 2. Семантичні запити — `getByAltText` (для зображень), `getByTitle`;
- 3. Аварійний вихід (Найнижчий пріоритет) — `getByTestId` (`data-testid="submit-btn"`). Використовується лише тоді, коли елемент неможливо знайти за стандартними атрибутами доступності.

### Приклад тестування компонента форми

```tsx
// src/components/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('Компонент LoginForm', () => {
  it('має успішно відправляти форму при валідному введенні', async () => {
    const handleLogin = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleLogin} />);

    // Знаходимо елементи так, як це робить користувач
    const emailInput = screen.getByLabelText(/електронна пошта/i);
    const passwordInput = screen.getByLabelText(/пароль/i);
    const submitButton = screen.getByRole('button', { name: /увійти/i });

    // Симулюємо реальні дії користувача (натискання клавіш, фокус)
    await user.type(emailInput, 'student@devflow.ua');
    await user.type(passwordInput, 'Secret123!');
    await user.click(submitButton);

    // Перевіряємо викликаний результат
    expect(handleLogin).toHaveBeenCalledTimes(1);
    expect(handleLogin).toHaveBeenCalledWith({
      email: 'student@devflow.ua',
      password: 'Secret123!',
    });
  });
});
```

---

## 4. Ізольоване модульне тестування кастомних хуків з `renderHook`

Хуки React не можуть бути викликані поза контекстом виконання функціонального компонента. Для їх ізольованого тестування пакет `@testing-library/react` надає функцію `renderHook`.

### Використання функції `act()`

Будь-які дії всередині тестів, які призводять до оновлення стану React (виклики функцій хука, таймери), повинні огортатися у функцію `act()`. Це гарантує, що React завершить фази Render та Commit перед тим, як тест виконає перевірку `expect`:

```typescript
// src/hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('Хук useCounter', () => {
  it('має ініціалізуватися з початковим значенням', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('має коректно інкрементувати лічильник', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

---

## 5. Мережевий мокінг на рівні Service Worker: Mock Service Worker (MSW v2)

Традиційний мокінг через перехоплення функції `fetch` (`global.fetch = vi.fn()`) є крихким і спотворює поведінку середовища.

**Mock Service Worker (MSW)** перехоплює HTTP-запити на рівні мережевого стеку браузера або Node.js, залишаючи реальний код запиту (`fetch`, `axios`) абсолютно незмінним.

### Оголошення обробників відповідей (Handlers)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: 'usr_1',
      name: 'Олена Коваль',
      email: 'olena@devflow.ua',
    });
  }),

  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as { email: string };
    if (body.email === 'error@test.com') {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ token: 'mocked-jwt-token-xyz' });
  }),
];
```

### Налаштування сервера для Vitest

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

У `setupTests.ts` сервер запускається перед початком тестів та очищується після кожного з них:

```typescript
// src/setupTests.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Завдяки цьому компоненти, що використовують TanStack Query або звичайний `fetch`, тестуються у максимально наближених до реальності умовах без підключення до реального бекенду.

---

## 6. Стратегії наскрізного тестування (E2E) з Playwright

Навіть якщо модульні та інтеграційні тести проходять успішно, завжди залишається ризик збою на рівні інтеграції з реальними браузерами, конфігурацією веб-сервера або взаємодією сторонніх скриптів.

**Playwright** від компанії Microsoft є сучасним стандартом E2E-тестування:

- кросбраузерна підтримка — запускає тести в реальних рушіях Chromium, Firefox та WebKit;
- автоматичне очікування (Auto-Waiting) — чекає, поки елемент з'явиться, стане видимим і клікабельним перед виконанням дії, що усуває проблему флакуючих (нестабільних) тестів;
- інструменти трасування (Trace Viewer) — записує повне відео виконання тесту, стан DOM та мережеві логи для легкого налагодження помилок.

### Приклад E2E-тесту оформлення замовлення

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('Повний сценарій додавання товару в кошик та оформлення', async ({ page }) => {
  // 1. Відкриваємо головну сторінку
  await page.goto('http://localhost:5173/');

  // 2. Клікаємо на каталог
  await page.getByRole('link', { name: 'Каталог товарів' }).click();

  // 3. Додаємо перший товар
  await page.getByRole('button', { name: 'В кошик' }).first().click();

  // 4. Перевіряємо оновлення бейджа в хедері
  const badge = page.locator('.cart-badge');
  await expect(badge).toHaveText('1');

  // 5. Переходимо до чекауту
  await page.getByRole('link', { name: 'Кошик' }).click();
  await expect(page).toHaveURL(/.*checkout/);
  await expect(page.getByText('Сума до сплати')).toBeVisible();
});
```

---

## Висновки

- піраміда тестування - збалансоване поєднання Unit, Integration та E2E тестів забезпечує максимальну стабільність кодової бази при контрольованих витратах часу;
- продуктивність Vitest - швидкий тест-раннер із нативною підтримкою TypeScript та єдиною конфігурацією з Vite повністю замінює громіздкий Jest;
- філософія React Testing Library - орієнтація на поведінку людини через доступні ролі (`getByRole`) та ігнорування внутрішніх деталей реалізації компонентів;
- модульне тестування хуків - утиліта `renderHook` створює тимчасовий синтетичний компонент, а обгортка `act()` синхронізує оновлення стану;
- мережевий мокінг нового покоління - бібліотека MSW v2 перехоплює запити на рівні мережевого рівня без втручання у виклики `fetch` клієнтського коду;
- наскрізна верифікація з Playwright - завершальний рівень контролю якості, що перевіряє готову систему в реальних браузерах з автоматичним очікуванням подій.

---

## Рекомендована література та джерела

- офіційна документація тест-раннера Vitest - https://vitest.dev/;
- філософія та посібник з React Testing Library - https://testing-library.com/docs/react-testing-library/intro;
- керівництво щодо вибору запитів у RTL - https://testing-library.com/docs/queries/about#priority;
- документація мережевого мокінгу Mock Service Worker v2 - https://mswjs.io/docs/;
- офіційна документація фреймворку Playwright - https://playwright.dev/docs/intro;
- книга Кента Сі Доддса "Testing JavaScript Applications" - https://testingjavascript.com/.

---

## Запитання для самоперевірки

- яка відмінність у цілях та вартості підтримки між модульними (Unit) та наскрізними (E2E) тестами;
- чому тест-раннер Vitest значно швидший за класичний Jest у проєктах на базі Vite;
- чому в React Testing Library заборонено тестувати внутрішній стан компонента `useState`;
- за яким принципом в RTL будується ієрархія методів пошуку елементів (Query Priority);
- навіщо будь-які зміни стану хуків всередині тестів огортаються у виклик функції `act()`;
- як бібліотека Mock Service Worker (MSW) перехоплює запити без підміни глобальної функції `fetch`;
- у чому полягає перевага автоматичного очікування (Auto-Waiting) у фреймворку Playwright перед фіксованими паузами `sleep`.
