# Практична робота №8 (2 години)

**Тема**: Абстракція бізнес-логіки.
Створення кастомних хуків для повторного використання логіки (наприклад, хук для визначення розміру вікна або стану онлайн/офлайн).

**Мета**: Зрозуміти різницю між візуальним компонентом (UI Component) та відокремленою бізнес-логікою; навчитися ідентифікувати дубльований код у компонентах та виносити його у власні (Custom) хуки згідно з конвенцією найменування (`useSomething`); реалізувати підписки на глобальні події браузера (`window.addEventListener`) з коректною очисткою пам'яті через `useEffect`.

**Необхідні інструменти**: Браузер, редактор VS Code, Node.js, локально запущений проєкт єдиного репозиторію.

## План заняття

1. Аналіз проблеми дублювання життєвого циклу (Lifecycle) у різних компонентах.
2. Створення кастомного хука `useWindowSize` для визначення розмірів екрану.
3. Створення кастомного хука `useOnlineStatus` для моніторингу підключення до мережі.
4. Інтеграція створених хуків у наявні компоненти додатку (Dashboard або NewsFeed).
5. Використання даних з хуків для забезпечення адаптивності або умовного рендерингу.

## Хід виконання роботи

### 1. Створення хука `useWindowSize`

Уявіть, що у вашому додатку як Стрічка новин (Лабораторна 6), так і Панель керування (Практична 5) повинні знати поточну ширину екрану користувача, щоб змінити свій макет з Grid на Column при ширині менше 768px.Замість того, щоб копіювати `useEffect` з `window.addEventListener('resize')` у кожен з цих компонентів, ми винесемо цю логіку в хук.

Створіть файл `src/hooks/useWindowSize.js` (або `.ts`):

```javascript
import { useState, useEffect } from "react";

const useWindowSize = () => {
  // Локальний стан нашого хука
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Функція-обробник події
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Підписуємося на подію зміни розміру вікна
    window.addEventListener("resize", handleResize);

    // ОЧИЩЕННЯ (Cleanup) - критично важливо для уникнення Memory Leaks
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []); // Пустий масив: ефект спрацьовує 1 раз при монтуванні

  // Хук "висилає" назовні свій стан
  return windowSize;
};

export default useWindowSize;
```

### 2. Використання `useWindowSize` у компоненті

Тепер відкрийте вашу `NewsFeed.jsx` або `Dashboard.jsx`. Використаємо новий хук майже так само, як ми використовуємо вбудований `useState`.

```jsx
// src/pages/NewsFeed.jsx (Фрагмент коду)
import React from "react";
import useWindowSize from "../hooks/useWindowSize";

const NewsFeed = () => {
  // Викликаємо наш кастомний хук. Він поверне об'єкт із width та height
  const { width } = useWindowSize();

  // Визначаємо, чи екран мобільний
  const isMobile = width < 768;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Стрічка Новин</h2>

      {/* Умовний рендеринг: показуємо банер тільки на мобільних пристроях */}
      {isMobile && (
        <div
          style={{
            background: "#ffe4e1",
            padding: "10px",
            marginBottom: "15px",
          }}
        >
          📱 Ви переглядаєте мобільну версію
        </div>
      )}

      {/* Адаптивна сітка CSS (inline для прикладу) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {/* ...тут рендер карток постів... */}
      </div>
    </div>
  );
};
```

Спробуйте змінити розмір вікна браузера і переконайтесь, що компонент миттєво реагує на це.

### 3. Створення хука `useOnlineStatus`

Оскільки наш додаток (`NewsFeed`) завантажує дані з Інтернету (JSONPlaceholder), було б чудово показувати користувачу банер "Немає підключення до Інтернету", якщо він раптово зайшов у метро чи тунель і мережа зникла.

Створіть файл `src/hooks/useOnlineStatus.js`:

```javascript
import { useState, useEffect } from "react";

const useOnlineStatus = () => {
  // navigator.onLine - базова властивість браузера (true/false)
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

export default useOnlineStatus;
```

### 4. Інтеграція статусу мережі у компонент

Відкрийте кореневий компонент вашого проєкту (наприклад `App.jsx` або Layout).

```jsx
// src/App.jsx (Фрагмент)
import useOnlineStatus from "./hooks/useOnlineStatus";
// інші імпорти...

function App() {
  const isOnline = useOnlineStatus();

  return (
    <>
      {/* Якщо користувач офлайн - виводимо червону смужку на весь екран зверху */}
      {!isOnline && (
        <div
          style={{
            background: "red",
            color: "white",
            textAlign: "center",
            padding: "10px",
            position: "sticky",
            top: 0,
            zIndex: 9999,
          }}
        >
          ⚠️ Відсутнє підключення до Інтернету. Деякі функції можуть бути
          недоступні.
        </div>
      )}

      {/* Основні Routes вашого додатку */}
      <main>{/* ... */}</main>
    </>
  );
}
```

Щоб протестувати це:

1. Відкрийте браузер і натисніть F12 (DevTools).
2. Перейдіть на вкладку **Network** (Мережа).
3. Знайдіть випадаючий список "No throttling" (або значок Wi-Fi) і переключіть його на режим **"Offline"**.
4. Ви миттєво побачите створений червоний банер.

## Завдання для самостійного виконання

1. В єдиному репозиторії розробіть ще один власний кастомний хук. Наприклад `useThemeContext` (якщо використовували Context для теми), або популярний хук `useLocalStorage`.
2. Встановіть вимогу для `useLocalStorage`: він має приймати `key` (рядок) та `initialValue` (початкове значення). Він повинен повертати масив `[value, setValue]`, за аналогією з вбудованим `useState`.
3. Всередині `useLocalStorage` використайте магію `useEffect` для того, щоб кожного разу, коли змінюється `value`, хук автоматично зберігав це нове значення в браузерний `localStorage` (за допомогою `JSON.stringify`).
4. Інтегруйте ваш новий `useLocalStorage` замість звичайного `useState` у вашому додатку для якогось поля (наприклад, для збереження теми день/ніч, або для імені користувача у простій формі), щоб після `F5` сторінка "пам'ятала" вибір користувача.

## Контрольні запитання

1. Яке єдине та головне синтаксичне правило накладає React на функції, які розробник хоче ідентифікувати як "Кастомний хук" (Custom Hook), і чому порушення цього правила викликає помилку лінтера (ESLint)?
2. Чи ділять між собою спільний (однаковий) стан `windowSize` (пам'ять) два різні компоненти, якщо вони обидва викликали всередині себе `useWindowSize()`? (Поясніть, хук це інстанс чи виклик функції).
3. При створенні `useOnlineStatus`, чому ми використовували саме масив залежностей `[]` для `useEffect`? Що сталося б, якби ми взагалі не передали другий аргумент в `useEffect`?
4. В чому полягає критична небезпека відсутності функції очищення (у команді `return () => window.removeEventListener(...)`) всередині хука `windowSize`, якщо компонент-споживач (наприклад, сторінка налаштувань) постійно монтується і розмонтовується під час навігації користувача?
5. Порівняйте між собою HOC (Higher-Order Component) та Custom Hooks. Яку спільну архітектурну проблему вони вирішують і чому індустрія відмовилася від масового застосування HOC на користь кастомних хуків?
