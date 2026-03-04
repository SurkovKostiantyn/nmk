# Лабораторна робота №7 (2 години)

**Тема:** Впровадження TypeScript.
Повний рефакторинг коду лабораторних робіт з додаванням типізації для підвищення надійності системи.

**Мета:** Набути практичного досвіду міграції існуючого JavaScript (React) додатка на TypeScript; навчитися створювати та застосовувати Інтерфейси (Interfaces) для типізації `Props` компонентів, відповідей від REST API та локального стану (`useState`); інтегрувати TypeScript у конвеєр збірки Vite та виправити всі помилки компіляції для досягнення суворої типізації (Strict Mode).

**Технологічний стек:** React, Vite, TypeScript, TSX (`.tsx`), Interfaces / Types.

## Завдання

1. Ініціалізувати підтримку TypeScript у єдиному репозиторії попередніх лабораторних робіт (додавання `tsconfig.json` та зміна розширень файлів з `.js/.jsx` на `.ts/.tsx`).
2. Типізувати глобальні сутності системи: створити інтерфейси для `User` (з Лаб №5) та `Post` (з Лаб №6).
3. Провести рефакторинг базових UI-компонентів, строго типізувавши їхні Пропси (Props).
4. Типізувати кастомний хук `useFetch`, використовуючи концепцію Дженериків (Generics).
5. Виправити всі помилки типізації (червоні підкреслення в IDE), щоб команда `tsc --noEmit` завершувалася успішно.

## Хід виконання роботи

### Крок 1. Конфігурація TypeScript у Vite-проєкті

Якщо ви створювали проєкт за допомогою `npm create vite@latest` з шаблоном `react`, вам необхідно додати TypeScript. (Якщо ви від початку генерували `react-ts`, можете пропустити команди встановлення).

1. Встановіть необхідні залежності:

```bash
npm install -D typescript @types/react @types/react-dom
```

2. Створіть файл конфігурації `tsconfig.json` у корені проєкту:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Strict Type-Checking Options */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

3. Перейменуйте всі файли компонентів з `.jsx` на `.tsx`, а допоміжні функції (`useFetch.js`) — на `.ts`. Ваша IDE (напр., VS Code) миттєво почне підсвічувати місця, де не вистачає типів.

### Крок 2. Типізація глобальних моделей даних

Створіть папку `src/types` та додайте файл `index.ts`. Тут ми опишемо "контракти" даних, які ми очікуємо від бекенду (JSONPlaceholder) та Авторизації.

```typescript
// src/types/index.ts

export interface User {
  id: number;
  name: string;
  email: string;
  // Поля, які ми можемо отримати з API JSONPlaceholder
  username?: string;
  phone?: string;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}
```

### Крок 3. Рефакторинг базових UI-компонентів (типізація Props)

Відкрийте ваші компоненти (наприклад, `PostCard.tsx` з Лаб №2 / Лаб №6) і використайте створені типи.

```tsx
// src/components/PostCard/PostCard.tsx
import React from "react";
// Або використовуйте імпорт інтерфейсу, або оголосіть Props прямо тут
interface PostCardProps {
  title: string;
  body: string;
  // Наприклад, опціональний параметр для виділення карточки
  isHighlighted?: boolean;
  onReadMore?: (id: number) => void;
}

// React.FC (Function Component) - опціональний, але зручний паттерн
const PostCard: React.FC<PostCardProps> = ({ title, body, isHighlighted }) => {
  return (
    <div className={`card ${isHighlighted ? "highlight" : ""}`}>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
};

export default PostCard;
```

Ви також маєте типізувати базові атоми (ваші `Input.tsx` та `Button.tsx` з Лаб №1), прокинувши туди стандартні HTML-атрибути:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}
```

### Крок 4. Типізація Стейту та Контексту Авторизації

Відкрийте `AuthContext.tsx` (з Лаб №5). Тепер потрібно вказати TypeScript-у, що саме лежить у `useState`, використовуючи Generics `<T>`.

```tsx
// src/context/AuthContext.tsx
import { createContext, useState, ReactNode } from "react";
import { User } from "../types"; // Наш інтерфейс

// Типізуємо сам об'єкт Контексту
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null; // Стейт може бути null, якщо юзер не залогінений
  login: (email: string) => Promise<void>;
  logout: () => void;
}

// Передаємо null! як дефолтне значення (затичка для TypeScript)
export const AuthContext = createContext<AuthContextType>(null!);

// Типізуємо children
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // ВАЖЛИВО: Явно вказуємо, що тут User АБО null
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string) => {
    // ... ваша логіка запиту з Лаб 6 ...
    setUser({ id: 1, name: "Іван", email });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Крок 5. Використання Generics у кастомному хуку `useFetch`

Ваш `useFetch.js` повертав дані типу `any`. Тепер ми маємо навчити його повертати той тип, який ми попросимо.

```typescript
// src/hooks/useFetch.ts
import { useState, useEffect } from "react";

// <T> означає, що хук приймає якийсь тип T (наприклад, Post[]) під час виклику
export const useFetch = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) throw new Error(`Помилка: ${response.status}`);

        // Вказуємо TS, що JSON відповідає типу T
        const result = (await response.json()) as T;
        setData(result);
        setError(null);
      } catch (err: unknown) {
        // Object is of type 'unknown' у TS
        if (err instanceof Error) {
          if (err.name !== "AbortError") setError(err.message);
        } else {
          setError("Невідома помилка");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => abortController.abort();
  }, [url]);

  return { data, isLoading, error };
};
```

Тепер у Стрічці Новин (`NewsFeed.tsx`) ми викликаємо хук і жорстко типізуємо відповідь:

```tsx
import { Post } from "../../types";

// TS чітко знатиме, що data - це масив постів (Post[]), і не дозволить
// звернутися до data[0].price, бо в інтерфейсі Post немає price!
const {
  data: posts,
  isLoading,
  error,
} = useFetch<Post[]>("https://jsonplaceholder.typicode.com/posts");
```

## Контрольні запитання

1. Яку категорію помилок дозволяє виявити TypeScript на етапі компіляції (`Build Time`), які звичайний JavaScript міг би виявити лише під час виконання (`Runtime`)?
2. Що таке `Generics` в TypeScript? Яку проблему архітектури вони вирішують на прикладі нашого кастомного хука `useFetch<T>`?
3. Поясніть різницю між типом `any` та типом `unknown` в контексті обробки помилок у блоці `catch (error)`. Чому використання `any` вважається порушенням парадигми суворої типізації?
4. Навіщо при декларації інтерфейсу для форми (або компонента) використовують успадкування (наприклад, `interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>`)? Які переваги це дає при розробці дизайн-системи?
5. Чому початковий стан хука `useState` вимагає Union типізації (наприклад, `useState<User | null>(null)`), якщо дані завантажуються асинхронно через мережу? Від чого це нас страхує при рендерингу JSX?

## Вимоги до звіту

1. Актуальне посилання на GitHub-репозиторій. Робота вважається зданою, якщо команда `npx tsc --noEmit` не виводить жодної помилки (всі файли строго типізовані, немає використання "заглушок" `any`).
2. Посилання на розгорнуту (Deployment) версію додатку.
3. У файл `lab_07.md` винести фрагменти коду:
   - Файл з інтерфейсами (`src/types/index.ts`).
   - Типізований кастомний хук `useFetch`.
   - Приклад типізації Props будь-якого компонента вашого вибору.
4. У файлі `lab_07.md` дати відповіді на 5 контрольних запитань.
