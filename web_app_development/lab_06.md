# Лабораторна робота №6 (2 години)

**Тема:** Підключення до зовнішнього API.
Використання JSONPlaceholder або власного бекенду для синхронізації даних додатку.

**Мета:** Опанувати роботу з мережевими запитами в екосистемі React; навчитися обробляти життєвий цикл асинхронних операцій (завантаження, успіх, помилка); використати хук `useEffect` для ініціалізації отримання даних від зовнішнього REST API (на прикладі JSONPlaceholder) та інтегрувати ці дані в існуючу архітектуру додатку (стрічку новин), створену в попередніх роботах.

**Технологічний стек:** React, Vite, Axios / Fetch API, Hooks (`useEffect`, `useState`).

## Завдання

1. Замінити захардкоджений масив новин/товарів (з Лабораторної роботи №2) на реальні дані, які надходять з REST API.
2. Реалізувати тріаду станів компонента (`Loading`, `Error`, `Data`) для покращення користувацького досвіду (UX).
3. Симулювати процес автентифікації (з Лабораторної роботи №5), відправляючи POST-запит (або фіктивний запит) для перевірки даних користувача.
4. Написати кастомний хук `useFetch` для інкапсуляції логіки отримання даних.

## Хід виконання роботи

### Крок 1. Вибір та налаштування клієнта для API

Для здійснення HTTP-запитів ми використовуватимемо бібліотеку `axios` (або вбудований `fetch`). Axios є галузевим стандартом, оскільки автоматично парсить JSON та краще обробляє помилки статусів.

Або встановіть `axios` у проекті:

```bash
npm install axios
```

Або продовжуйте використовувати нативний `fetch`. У цьому прикладі буде показано комбінований підхід (базовий `fetch` в кастомному хуку для універсальності).

### Крок 2. Створення кастомного хука useFetch

Для уникнення дублювання логіки `loading` та `error` у кожному компоненті, створіть директорію `src/hooks/` та файл `useFetch.js` (або `.jsx`).

```javascript
import { useState, useEffect } from "react";

export const useFetch = (url) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // AbortController для скасування запиту,
    // якщо компонент розмонтовується (захист від витоку пам'яті)
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Помилка HTTP: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Запит скасовано");
        } else {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Функція очищення (cleanup)
    return () => {
      abortController.abort();
    };
  }, [url]);

  return { data, isLoading, error };
};
```

### Крок 3. Інтеграція API у Стрічку новин (News Feed)

У Лабораторній роботі №2 ви створили компонент, який рендерить список. Тепер замінимо статичні дані на використання нашого хука. У цьому прикладі ми використовуємо публічне API `JSONPlaceholder` (повертає 100 публікацій).

`NewsFeed.jsx`:

```jsx
import React from "react";
import { useFetch } from "../../hooks/useFetch";
// Імпортуйте ваш компонент картки з попередніх робіт
import PostCard from "../PostCard/PostCard";

const NewsFeed = () => {
  // Викликаємо наш кастомний хук
  const {
    data: posts,
    isLoading,
    error,
  } = useFetch("https://jsonplaceholder.typicode.com/posts");

  // 1. Стан завантаження
  if (isLoading) {
    return <div className="spinner">Завантаження новин...</div>;
  }

  // 2. Стан помилки
  if (error) {
    return <div className="error-message">Сталася помилка: {error}</div>;
  }

  // 3. Стан успішного завантаження
  return (
    <div className="news-feed">
      <h2>Останні публікації</h2>
      <div className="posts-grid">
        {posts &&
          posts
            .slice(0, 10)
            .map((post) => (
              <PostCard key={post.id} title={post.title} body={post.body} />
            ))}
      </div>
    </div>
  );
};

export default NewsFeed;
```

### Крок 4. Оновлення логіки Авторизації (з Лаб №5)

Замініть синхронну імітацію входу у вашому `AuthContext.jsx` (або `Login.jsx`) на асинхронний запит. Оскільки JSONPlaceholder не має реальної системи авторизації, ми будемо імітувати запит з фіктивною затримкою, або звернемось до `/users/1` для отримання профілю користувача.

Приклад асинхронного `login` у `AuthContext.jsx`:

```jsx
const login = async (email) => {
  try {
    // Симуляція мережевої затримки для показу лоадера на кнопці
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // "Стягуємо" дані фіктивного користувача
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/users/1",
    );
    const userData = await response.json();

    setIsAuthenticated(true);
    // Зберігаємо справжні дані з АРІ у нашому стейті
    setUser({ ...userData, email });
  } catch (error) {
    console.error("Помилка авторизації:", error);
  }
};
```

Додайте локальний стейт `isLoading` у ваш компонент `Login.jsx`, щоб вимикати кнопку (робити `disabled`) під час відправки запиту на сервер.

## Контрольні запитання

1. Поясніть призначення об'єкта `AbortController` у нашому хуку `useFetch`. Яку загрозу для React-додатку він усуває?
2. Що таке патерн "Тріада станів" (`loading`, `error`, `data`) при роботі з мережею і чому він є обов'язковим для якісного UX?
3. Чому функція виконання мережевого запиту (`fetch` або `axios.get`) розміщується всередині хука `useEffect`, а не прямо в тілі функціонального компонента?
4. У чому полягають головні переваги використання бібліотеки `axios` у порівнянні з нативним `fetch` (якщо студенти використовували її під час самостійної розробки)?
5. Опишіть потенційні ризики багу "Стан гонитви" (Race Condition), якщо користувач буде дуже швидко перемикати сторінки з різними URL-параметрами, за якими робляться запити.

## Вимоги до звіту

1. Актуальне посилання на GitHub-репозиторій надіслати в Classroom. Репозиторій повинен містити кумулятивний прогрес усіх попередніх лабораторних робіт.
2. Посилання на оновлений розгорнутий тестовий стенд (Vercel або GitHub Pages).
3. У файл `lab_06.md` винести фрагменти коду:
   - Власноруч написаний кастомний хук `useFetch.jsx`.
   - Компонент, що реалізує життєвий цикл запиту списку (Стрічка новин з відображенням `isLoading` та списку елементів).
4. У файлі `lab_06.md` дати вичерпні й аргументовані відповіді на 5 контрольних запитань.
