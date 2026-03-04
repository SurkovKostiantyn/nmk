# Лекція №13 (2 години). Взаємодія з API та асинхронність: Інтеграція клієнта з серверною архітектурою

## План лекції

1. Асинхронність у JavaScript: Огляд Event Loop, Мікротасок (Microtasks) та промісів (Promises) в контексті React.
2. Нативне Web API `fetch`: Робота зі стримами (Streams) та обробка HTTP статусів.
3. Бібліотека `axios` як галузевий стандарт: Інтерсептори (Interceptors) та автоматична серіалізація.
4. Архітектура життєвого циклу запиту: Менеджмент тріади станів (Loading, Error, Data).
5. Проблема "Стану гонитви" (Race Conditions) у React: Скасування запитів через `AbortController`.
6. Інкапсуляція мережевої інфраструктури: Створення кастомного хука `useFetch`.
7. Майбутнє фетчингу (Огляд): Бібліотеки серверного стану (`React Query`, `SWR`) замість `useEffect`.

## Перелік умовних скорочень

- **API** (Application Programming Interface) – програмний інтерфейс додатку.
- **HTTP** (HyperText Transfer Protocol) – протокол передачі гіпертексту.
- **REST** (Representational State Transfer) – архітектурний стиль взаємодії компонентів веб-додатку.
- **JSON** (JavaScript Object Notation) – текстовий формат обміну даними.
- **CORS** (Cross-Origin Resource Sharing) – механізм спільного використання ресурсів між різними доменами.
- **SWR** (Stale-While-Revalidate) – стратегія кешування "застаріле під час перевірки".

## Вступ

Методи отримання даних з сервера за допомогою fetch та axios. Обробка станів завантаження (loading) та помилок (error). Патерни інтеграції API запитів у хук useEffect та створення кастомних хуків для фетчингу даних.

Сучасні SPA-додатки є лише "обгорткою" (Клієнтом) для відображення даних. Всі реальні бізнес-операції (оплата, збереження інформації, розрахунки) виконуються на зовнішніх серверах (Бекенді). Взаємодія між клієнтом і сервером у браузері завжди відбувається **асинхронно**, оскільки передача даних по мережі може тривати від мілісекунд до десятків секунд. Щоб не блокувати єдиний потік виконання JavaScript (Main Thread) і дозволяти користувачам продовжувати взаємодію з інтерфейсом (скролити, натискати кнопки) під час очікування відповіді, інженери застосовують потужні асинхронні патерни. У цій лекції ми розберемо інтеграцію сторонніх API у життєвий цикл React-компонентів, розглядаючи всі підводні камені, від витоків пам'яті до "гонитви запитів".

---

## 1. Асинхронність у JavaScript: Відповідь на питання "Чому?"

Оскільки веб-браузери виділяють лише один головний потік (Thread) для малювання UI та виконання JavaScript, будь-яка мережева дія (яка займає час) заблокувала б програму.
Тому `fetch` працює на базі **Promise (Промісів)** — об'єктів, які представляють результат успішної або невдалої асинхронної операції в _майбутньому_.

У світі React ми зобов'язані запам'ятати архітектурне правило: **Рендер-функція компонента завжди МАЄ БУТИ СИНХРОННОЮ.**
Ми не можемо змусити React "чекати" на завершення запиту під час повернення JSX.

```tsx
// ❌ АРХІТЕКТУРНА КАТАСТРОФА (Компонент не може бути async)
const UserProfile = async () => {
  const data = await fetch("/api/user"); // Це зламає всю гілку Virtual DOM
  return <div>{data.name}</div>;
};
```

Мережеві запити завжди делегуються на хук **`useEffect`**, який виконається асинхронно, ВЖЕ ПІСЛЯ того як компонент вперше відмалюється (з порожніми або "Loading" даними).

---

## 2. Нативне Web API `fetch`: Анатомія та проблеми

`fetch` — це стандарт (вбудований у `window`), який обіцяє базовий функціонал, але покладає всю подальшу роботу з обробки на розробника.

### Подвійне розгортання Promise

`fetch` не чекає на завантаження всього тіла відповіді. Перший Promise резолвиться, як тільки браузер отримує заголовки (Headers) сервера. Тіло є об'єктом **ReadableStream**. Щоб отримати JSON, ми повинні прочитати цей стрім (через метод `.json()`), який повертає _ще один_ Promise.

```javascript
fetch("https://api.example.com/data")
  // 1-й крок: розшифровка заголовків
  .then((response) => {
    // УВАГА: fetch не вважає статуси 404 або 500 "помилкою" (catch).
    // Для fetch помилкою є лише відсутність інтернету!
    if (!response.ok) throw new Error("HTTP Status Error");
    return response.json();
  })
  // 2-й крок: парсинг тіла JSON
  .then((data) => console.log(data));
```

---

## 3. Бібліотека `axios` як галузевий стандарт

Для усунення незручностей нативного `fetch` (ручна обробка 400-х статусів, обов'язкове дописування `headers: {'Content-Type': 'application/json'}` та подвійний парсинг `response.json()`), Enterprise-системи масово використовують бібліотеку `axios`.

### Переваги Axios:

1. Автоматична трансформація у JSON.
2. Автоматична генерація винятків (Exceptions) для не-2xx статусів серверу (одразу потрапляємо в блок `catch`).
3. **Інтерсептори (Interceptors):** Глобальний механізм перехоплення (Middleware). Дозволяє, наприклад, "на льоту" прикріпляти JWT Токен Авторизації до КОЖНОГО запиту без дублювання коду, або автоматично логувати помилки.

```javascript
// Налаштування Інтерсептора (один раз в корені додатку)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// У компоненті все виглядає надзвичайно чисто:
const fetchData = async () => {
  try {
    const { data } = await axios.get("/api/users");
    setUsers(data);
  } catch (error) {
    console.error("Server error", error.message);
  }
};
```

---

## 4. Архітектура життєвого циклу запиту (Тріада Станів)

Будь-яка повноцінна взаємодія з мережею в React потребує 3-х незалежних змінних стану (States) для покриття всіх сценаріїв взаємодії користувача з UI.

```tsx
const UserList = () => {
  const [data, setData] = useState(null); // Стан №1: Самі Дані
  const [isLoading, setIsLoading] = useState(true); // Стан №2: Індикатор завантаження
  const [error, setError] = useState(null); // Стан №3: Текст помилки

  useEffect(() => {
    // Асинхронна функція всередині useEffect
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get("/api/users");
        setData(response.data);
      } catch (err) {
        setError(err.message || "Сталася помилка");
      } finally {
        // Finally виконається завжди: як при успіху, так і при помилці
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Рендеринг (Зверніть увагу на Early Returns!)
  if (isLoading) return <Spinner />;
  if (error) return <AlertBox message={error} />;
  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

Цей патерн є еталоном (Best Practice). Ми явно повідомляємо користувачу (через UI), що зараз відбувається "спілкування" з сервером.

---

## 5. Проблема "Стану гонитви" (Race Conditions) та `AbortController`

Найпоширеніший (і найстрашніший) баг з асинхронністю виникає при частих кліках або використанні рядка пошуку (Search Input).

**Сценарій катастрофи:**

1. Користувач вводить "А" в пошук. Йде запит №1. Сервер "думає" 3 секунди.
2. Користувач вводить "Б" в пошук (Пошук: "АБ"). Йде запит №2. Сервер відповідає на запит №2 (за 0.5с). На екран виводиться список людей на "АБ".
3. Раптом, через 2 секунди, сервер "народжує" відповідь на повільний Запит №1 ("А").
4. Спрацьовує `setData()` від Запиту №1.
5. **РЕЗУЛЬТАТ:** У рядку пошуку написано "АБ", а списку результатів — результати від "А". Асинхронні потоки обігнали один одного (Race Condition).

**Вирішення через Cleanup + AbortController API:**
Ми повинні "вбивати" (скасовувати) старі HTTP-запити, коли ефект спрацьовує наново.

```tsx
useEffect(() => {
  // 1. Створюємо нативний контролер
  const controller = new AbortController();

  const searchProduct = async () => {
    try {
      // 2. Прив'язуємо "сигнал знищення" до запиту
      const response = await fetch(`/api/search?q=${query}`, {
        signal: controller.signal,
      });
      // ...
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Запит успішно скасовано. Це не баг.");
      }
    }
  };

  searchProduct();

  // 3. Cleanup функція
  return () => {
    // Коли useEffect викликається знову (при введенні "Б"),
    // React виконує ТУТ controller.abort(), що перериває запит на "А" в польоті!
    controller.abort();
  };
}, [query]);
```

---

## 6. Інкапсуляція мережевої інфраструктури: Кастомний хук `useFetch`

Описувати Тріаду станів (loading/error/data) і `AbortController` в кожному компоненті — це болісне дублювання коду (порушення принципу DRY).
Професійні інженери абстрагують цю логіку в свій власний (Custom) Хук.

```tsx
// useFetch.js
import { useState, useEffect } from "react";

export const useFetch = (url) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Network Error");
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, isLoading, error }; // Повертаємо тріаду
};
```

Застосування в компоненті зводиться до одного лаконічного рядка:

```tsx
const { data: users, isLoading, error } = useFetch("/api/users");
```

---

## 7. Майбутнє фетчингу: Бібліотеки серверного стану

Як ми бачимо, використання `useEffect` для стягування даних вимагає чимало інженерних зусиль (обробка Race Conditions, менеджмент loading).
Крім того, кожне використання хука робить новий запит (дані НЕ кешуються між переходами по сторінках).

У сучасному Enterprise React для цього використовують так звані **State Management бібліотеки серверного стану**, найвідомішими серед яких є **React Query (TanStack Query)** та **SWR** (від компанії Vercel).

Їхня філософія:

1. Вони мають вбудований розумний кеш (Cache Layers).
2. Жодних `useEffect`. Вони надають готові хуки, що автоматично повертають стани.
3. Вони самі займаються дедуплікацією запитів (якщо 3 компоненти за секунду попросять `/api/user`, React Query зробить фізичний запит на сервер ТІЛЬКИ 1 РАЗ і роздасть відповідь усім трьом).

_Код за допомогою React Query (Ознайомче):_

```tsx
import { useQuery } from "@tanstack/react-query";

const fetchUserList = () => axios.get("/api/users").then((res) => res.data);

const Component = () => {
  // "users" - це унікальний ключ кешування
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUserList,
  });
  // ...
};
```

---

## Висновки

1. Взаємодія з мережею у світі браузерів завжди є асинхронною (Non-blocking I/O). Заборона використання асинхронних функцій під час створення дерева JSX компенсується перенесенням запитів у "тіньове" виконання всередині `useEffect`.
2. Нативний REST-клієнт `fetch` є легкою абстракцією над XMLHttpRequest, який вимагає ручного парсингу Stream-відповідей (`.json()`) та ручної перевірки статусів `res.ok`. Галузевий стандарт `axios` цілком ховає під капот ці проблеми та пропонує інтерсептори (middlewares).
3. Повноцінний UI-компонент, що живиться мережею, завжди формується навколо патерну тріади станів (Data, Loading, Error), щоб надати користувачеві чіткий зворотній зв'язок (візуально) щодо статусу очікування.
4. Технічний баг "Race Condition" у веб-додатках лікується виключно механізмом переривання (Cleanup Effect) за допомогою об'єкта `AbortController`, який "вбиває" повільні застарілі запити, що розсинхронізовуються з поточним стейтом.
5. Для уникнення високорівневого когнітивного навантаження під час управління ефектами доцільно інкапсулювати інфраструктуру мережі у створення абстракцій (кастомних хуків типу `useFetch`), а в просунутих продакшн-середовищах — перевести цей процес на спеціалізовані клієнтські кешуючі системи, такі як TanStack React Query.

---

## Джерела

1. MDN Web Docs. "Using Fetch API". URL: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
2. Axios Documentation. URL: https://axios-http.com/docs/intro
3. React Docs. "Fetching data with Effects". URL: https://react.dev/learn/synchronizing-with-effects#fetching-data
4. "Fixing Race Conditions in React with useEffect". Max Rozen Blog. URL: https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect
5. "Why You Should Stop Using useEffect for data fetching". TkDodo's (React Query Maintainer) Blog. URL: https://tkdodo.eu/blog/why-you-want-react-query
6. SWR (Stale-While-Revalidate) React Hooks library docs. URL: https://swr.vercel.app/
7. Kyle Simpson. "You Don't Know JS: Promise Patterns" (Стосовно загального розуміння Microtasks queue).

---

## Запитання для самоперевірки

1. З точки зору виконання програми в браузері (Render Thread vs Network Thread), що сталося б, якби React-компоненти дозволяли інженерам використовувати звичайний синхронний функціонал для очікування відповіді від бази даних (без промісів і `useEffect`)?
2. Проаналізуйте різницю у реакції нативного `fetch` та бібліотеки `axios` у ситуації, коли бекенд-сервер повертає HTTP статус помилки `404 Not Found`. Як саме спрацює блок `try/catch` у обох випадках?
3. В чому полягає критична користь від патерну "Три стани" (Тріади) у процесах обміну даними (`data`, `isLoading`, `error`) для якісного користувацького досвіду (UX Design)?
4. Детально опишіть механізм появи багу "Race Condition" при реалізації "живого пошуку" (Search Autocomplete) без застосування API скасування запитів.
5. Чому виникла необхідність в абстрактних інструментах управління "Серверним станом" на кшталт TanStack Query, якщо нативна зв'язка `useEffect` + `useState` виконує отримання даних абсолютно коректно?
