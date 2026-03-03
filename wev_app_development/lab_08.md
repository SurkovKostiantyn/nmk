# Лабораторна робота №8 (2 години)

**Тема:** Написання тестів.
Покриття основних функцій додатку (наприклад, додавання коментаря або зміна профілю) юніт-тестами.

**Мета:** Опанувати основи автоматизованого тестування React-додатків; налаштувати тестове середовище за допомогою Vitest та React Testing Library; навчитися писати модульні (Unit) тести для ізольованих UI-компонентів, стимулювати дії користувача (кліки, введення тексту) та ізолювати мережеві запити за допомогою техніки мокінгу (Mocking).

**Технологічний стек:** React, Vite, TypeScript, Vitest, React Testing Library (RTL), `@testing-library/user-event`, jsdom.

## Завдання

1. Встановити та налаштувати фреймворк тестування Vitest (оскільки ми використовуємо збирач Vite) та JSDOM для імітації браузерного середовища в Node.js.
2. Написати базовий Snapshot або Unit-тест для ізольованого UI-компонента (наприклад, `Button` або `PostCard`).
3. Написати інтеграційний тест для компонента форми (наприклад, форми логіну з Лаб №5), імітуючи введення тексту та натискання кнопки за допомогою `user-event`.
4. Написати тест для компонента, який робить мережевий запит (наприклад, `NewsFeed` з Лаб №6), замокавши (Mock) кастомний хук `useFetch` або бібліотеку `axios`.

## Хід виконання роботи

### Крок 1. Налаштування тестового середовища (Vitest + RTL)

Оскільки наш проєкт побудовано на Vite, використання Jest буде вимагати складного налаштування трансформацій. Офіційна рекомендація екосистеми Vite — це **Vitest**, який має абсолютно ідентичний до Jest синтаксис (API), але працює "з коробки".

1. Встановіть необхідні залежності:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

2. Оновіть файл `vite.config.ts`, щоб додати конфігурацію тестування:

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Використовувати describe, it, expect глобально
    environment: "jsdom", // Імітація DOM дерева
    setupFiles: "./setupTests.ts", // Файл для ініціалізації jest-dom
  },
});
```

3. Створіть файл `setupTests.ts` у корені проєкту:

```typescript
// Імпорт додаткових матчерів (наприклад, toBeInTheDocument)
import "@testing-library/jest-dom";
```

4. Додайте скрипт у `package.json`:

```json
"scripts": {
  // ... інші скрипти
  "test": "vitest run"
}
```

### Крок 2. Тестування ізольованого UI компонента

Створіть файл поряд з вашим компонентом, наприклад `src/components/Button/Button.test.tsx`.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "./Button"; // Ваш компонент з Лаб №1

describe("Компонент Button", () => {
  it("повинен відмалюватися з правильним текстом", () => {
    // 1. Рендеримо компонент
    render(<Button>Натисни мене</Button>);

    // 2. Шукаємо елемент за його роллю на екрані
    const buttonElement = screen.getByRole("button", { name: /натисни мене/i });

    // 3. Здійснюємо перевірку (Assertion)
    expect(buttonElement).toBeInTheDocument();
  });

  it("повинен бути вимкненим (disabled), якщо передано відповідний проп", () => {
    render(<Button disabled>Зберегти</Button>);
    const buttonElement = screen.getByRole("button");
    expect(buttonElement).toBeDisabled();
  });
});
```

Запустіть `npm run test`, щоб переконатися, що тести успішно пройдено.

### Крок 3. Тестування взаємодії користувача (Форма логіну)

Додамо тест для компонента `Login` (з Лаб №5), який перевіряє поведінку форми та імітує клавіатурний ввід.

Створіть `src/pages/Login/Login.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom"; // Щоб не падав useNavigate
import Login from "./Login";
// Мок для AuthContext
import { AuthContext } from "../../context/AuthContext";

describe("Сторінка Login", () => {
  it("дозволяє користувачу ввести email та відправити форму", async () => {
    // Створюємо "фейкову" функцію login для перехоплення виклику
    const mockLogin = vi.fn();

    // Ініціалізуємо імітатор дій користувача
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            isAuthenticated: false,
            user: null,
            login: mockLogin,
            logout: vi.fn(),
          }}
        >
          <Login />
        </AuthContext.Provider>
      </BrowserRouter>,
    );

    // Шукаємо інпут (бажано за label через getByLabelText, або за Placeholder)
    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole("button", { name: /увійти/i });

    // Симулюємо ввід (друкування на клавіатурі)
    await user.type(emailInput, "test@kpi.ua");

    // Перевіряємо чи оновилось значення в полі
    expect(emailInput).toHaveValue("test@kpi.ua");

    // Симулюємо клік
    await user.click(submitButton);

    // Перевіряємо, чи наша "фейкова" функція була викликана з правильним параметром!
    expect(mockLogin).toHaveBeenCalledWith("test@kpi.ua");
  });
});
```

### Крок 4. Ізоляція мережевих запитів (Mocking хуків)

Щоб протестувати `NewsFeed.tsx` (з Лаб №6), нам потрібно заборонити компоненту робити реальний запит на JSONPlaceholder. Ми "підмінимо" (замокаємо) сам хук `useFetch`.

Створіть `src/components/NewsFeed/NewsFeed.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NewsFeed from "./NewsFeed";
import * as useFetchModule from "../../hooks/useFetch"; // Імпорт всього модуля

// Кажемо Vitest перехопити цей модуль
vi.mock("../../hooks/useFetch");

describe("Стрічка Новин", () => {
  it("показує індикатор завантаження під час отримання даних", () => {
    // Налаштовуємо мок: що саме поверне хук ПРИ ЦЬОМУ запуску
    // @ts-ignore (ігноруємо типізацію замоканих функцій для простоти)
    useFetchModule.useFetch.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<NewsFeed />);

    expect(screen.getByText(/завантаження/i)).toBeInTheDocument();
  });

  it("успішно рендерить список статей", () => {
    const mockPosts = [
      { id: 1, title: "Перша стаття", body: "Текст 1" },
      { id: 2, title: "Друга стаття", body: "Текст 2" },
    ];

    // Змінюємо поведінку моку для ЦЬОГО конкретного тесту
    // @ts-ignore
    useFetchModule.useFetch.mockReturnValue({
      data: mockPosts,
      isLoading: false,
      error: null,
    });

    render(<NewsFeed />);

    // Перевіряємо чи відрендерилась кількість статей
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent("Перша стаття");
  });
});
```

## Контрольні запитання

1. Згідно з філософією React Testing Library, чому варто уникати тестування "імплементації" (наприклад, перевірки того, чи викликалась конкретна setState функція) і фокусуватися на атрибутах доступності (DOM вузлах, текстах, ролях)?
2. У чому архітектурна різниця між глобальним середовищем виконання (наприклад `jsdom`) та реальним браузером? Чого не вистачає у `jsdom` (наприклад, щодо стилізації або ширини вікна)?
3. Чому при симуляції взаємодії користувача з полем вводу краще використовувати бібліотеку `@testing-library/user-event` (метод `.type()`), ніж базовий `fireEvent.change()`?
4. Як ви розумієте термін "Mocking" (створення заглушок)? Ч Tại Unit або Інтеграційних тестів суворо забороняється робити реальні відправлення HTTP-запитів до зовнішніх API?
5. Для чого у тесті компонента `Login` ми змушені були "огорнути" його у фіктивні компоненти `<BrowserRouter>` та `<AuthContext.Provider>`? Що сталося б без цих обгорток?

## Вимоги до звіту

1. Актуальне посилання на GitHub-репозиторій. Робота вважається успішною, якщо команда `npm run test` (Vitest) успішно проходить ("green tests") і покриває як мінімум один UI-компонент, одну форму та один запит.
2. Скріншот терміналу з пройденими тестами додати в репозиторій.
3. У файл `lab_08.md` винести фрагменти коду:
   - Інтеграційний тест вашої форми (Крок 3).
   - Тест компонента із замоканим АРІ або хуком (Крок 4).
4. У файлі `lab_08.md` дати вичерпні відповіді на 5 контрольних запитань.
