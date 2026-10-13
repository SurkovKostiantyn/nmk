# Лекція 13 (2 години). Управління серверним станом та кешування даних: TanStack Query (React Query)

## План лекції

- 1. Концептуальний поділ між Client State та Server State: асинхронність, віддалене володіння та застарівання даних;
- 2. Архітектура TanStack Query: стратегія Stale-While-Revalidate, `QueryClient` та `QueryClientProvider`;
- 3. Читання даних через хук `useQuery`: структура ключів запитів (Query Keys), конфігурація `staleTime` та `gcTime`;
- 4. Життєвий цикл запиту: стани завантаження (`isLoading` проти `isFetching`), обробка помилок та повторні спроби (Retry);
- 5. Мутація даних через хук `useMutation`: надсилання змін на сервер та декларативна інвалідація кешу (`invalidateQueries`);
- 6. Проєктування оптимістичного інтерфейсу (Optimistic UI): миттєвий відгук та автоматичний відкат (Rollback) при помилці мережі.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **HTTP** (HyperText Transfer Protocol) — мережевий протокол передачі гіпертексту;
- **REST** (Representational State Transfer) — архітектурний стиль взаємодії клієнт-сервер;
- **SWR** (Stale-While-Revalidate) — стратегія інвалідації та оновлення кешу даних;
- **CRUD** (Create, Read, Update, Delete) — базові операції над ресурсами;
- **UX** (User Experience) — користувацький досвід взаємодії з інтерфейсом.

## Вступ

Протягом багатьох років розробники намагалися зберігати абсолютно всі дані веб-додатку в єдиному глобальному сховищі (наприклад, у Redux або Context). Отримання даних із бекенду супроводжувалося ручним написанням масивного коду: викликом `useEffect`, створенням прапорців `isLoading`, `error`, `data`, збереженням результату у глобальний стор та складними спробами синхронізації.

Проте такий підхід ігнорував фундаментальну істину: дані, що приходять із сервера, принципово відрізняються від локального клієнтського стану. Вони не належать додатку повністю — це лише тимчасовий знімок (снапшот) віддаленої бази даних, який застаріває в момент отримання.

Поява бібліотеки **TanStack Query** (раніше відомої як React Query) докорінно змінила архітектуру сучасного фронтенду, запропонувавши спеціалізований асинхронний шар для роботи з серверним станом.

У цій лекції детально розглядається різниця між клієнтським і серверним станом, розбирається механізм кешування за стандартом Stale-While-Revalidate, пояснюється правильна побудова ключів запитів, демонструється виконання мутацій та реалізація оптимістичного оновлення інтерфейсу (Optimistic UI).

---

## 1. Концептуальний поділ між Client State та Server State

Успіх проєктування архітектури фронтенду залежить від чіткого розмежування двох типів стану:

### Клієнтський стан (Client State)

- синхронний за своєю природою — значення завжди доступні в пам'яті негайно;
- повністю контролюється клієнтом — ніхто ззовні не може змінити відкритий стан вашого модального вікна;
- ізольований у межах вкладки браузера — скидається при перезавантаженні сторінки або зберігається в `localStorage`;
- інструменти: `useState`, `useReducer`, `Zustand`.

### Серверний стан (Server State)

- асинхронний — вимагає часу для передачі мережевих пакетів через HTTP або WebSocket;
- належить віддаленій системі — інші користувачі або фонові задачі сервера можуть змінити дані в базі в будь-яку секунду;
- застаріває (Stale) — отримані клієнтом дані можуть стати неактуальними вже через мить після завершення запиту;
- вимагає специфічних механізмів: кешування, дедуплікації запитів, фонової ревалідації, обробки падінь зв'язку та повторних спроб;
- інструменти: **TanStack Query (React Query)**, SWR, RTK Query.

---

## 2. Архітектура TanStack Query та стратегія Stale-While-Revalidate

TanStack Query виступає інтелектуальним асинхронним кешем між вашим React-інтерфейсом та будь-яким джерелом даних (REST API, GraphQL, WebSockets).

### Стратегія Stale-While-Revalidate (SWR)

Головна філософія бібліотеки базується на алгоритмі RFC 5861:

- 1. Показ наявного кешу (Stale) — якщо дані вже запитувалися раніше, TanStack Query миттєво віддає їх із кешу в пам'яті без показу спинера завантаження;
- 2. Фонові перевірка та запит (Revalidate) — паралельно у фоновому режимі надсилається HTTP-запит до сервера для отримання свіжих даних;
- 3. Безшовне оновлення інтерфейсу — коли сервер повертає свіжі дані, кеш непомітно оновлюється, а React-компонент плавно відображає актуальний стан.

Такий підхід повністю усуває неприємне миготіння екрана та забезпечує максимальну швидкість взаємодії для користувача.

### Ініціалізація `QueryClient` у додатку

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // Дані вважаються свіжими протягом 2 хвилин
      gcTime: 1000 * 60 * 10,    // Зберігати неактивні дані в кеші 10 хвилин
      retry: 2,                 // Кількість автоматичних повторів при мережевому збої
      refetchOnWindowFocus: true, // Фонове оновлення при поверненні на вкладку
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## 3. Читання даних через хук `useQuery`

Хук `useQuery` — це базовий інструмент для декларування операцій читання даних.

### Структура хука `useQuery`

```tsx
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['resourceIdentifier', params],
  queryFn: fetchFunction,
  // Додаткові опції
});
```

### Важливість ключів запитів (Query Keys)

`queryKey` — це унікальний серіалізований масив, який ідентифікує конкретний запит у глобальному кеші.

Правила формування ключів:
- ієрархічна структура — починається із загальної назви сутності: `['todos']`, `['users']`, `['products']`;
- динамічні параметри — будь-яка реактивна змінна (ID, номер сторінки, фільтр, сортування), яка впливає на результат запиту, **обов'язково** додається в масив ключа:

```typescript
// Запит конкретного продукту за ID
queryKey: ['products', productId]

// Запит списку з пагінацією та пошуком
queryKey: ['products', { page: 2, search: 'laptop', sort: 'price_asc' }]
```

Коли будь-який параметр у `queryKey` змінюється, TanStack Query автоматично ініціює новий запит або миттєво підтягує відповідний кеш, якщо цей запит уже виконувався.

### Різниця між `staleTime` та `gcTime`

Два найважливіших параметри конфігурації кешу, які часто плутають:

- `staleTime` (Час свіжості) — тривалість (у мілісекундах), протягом якої дані вважаються актуальними. Доки `staleTime` не вичерпано, TanStack Query взагалі **не надсилає мережевих запитів** при монтуванні нових компонентів. За замовчуванням дорівнює `0`;
- `gcTime` (Garbage Collection Time) — тривалість зберігання даних у пам'яті після того, як останній компонент, що використовував цей запит, був розмонтований. Після завершення `gcTime` неактивні дані видаляються для запобігання витокам пам'яті. За замовчуванням дорівнює 5 хвилинам.

---

## 4. Життєвий цикл запиту: стани завантаження та помилок

TanStack Query надає багатий набір статусів, що дозволяє створювати надійні та інформативні інтерфейси.

### `isLoading` проти `isFetching`

- `isLoading` (Hard Loading) — вказує, що запит виконується вперше і в кеші ще **немає жодних даних**. Це ідеальний стан для показу скелетонів (Skeleton UI) або великого індикатора завантаження;
- `isFetching` (Background Refresh) — вказує, що мережевий запит активний прямо зараз (зокрема фонова ревалідація). При цьому `data` вже доступна і користувач бачить інтерфейс. Стан корисний для показу крихітного непомітного спінера у кутку екрана.

### Практична реалізація компонента каталогу

```tsx
import { useQuery } from '@tanstack/react-query';

interface Article {
  id: string;
  title: string;
  summary: string;
}

async function fetchArticles(category: string): Promise<Article[]> {
  const response = await fetch(`/api/articles?category=${encodeURIComponent(category)}`);
  if (!response.ok) {
    throw new Error(`Помилка завантаження: ${response.statusText}`);
  }
  return response.json();
}

export function ArticleList({ category }: { category: string }) {
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['articles', category],
    queryFn: () => fetchArticles(category),
    staleTime: 1000 * 60 * 5, // 5 хвилин
  });

  if (isLoading) {
    return <div className="skeleton-loader">Завантаження статей...</div>;
  }

  if (isError) {
    return (
      <div className="error-banner">
        <p>Не вдалося отримати статті: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h2>Категорія: {category}</h2>
        {isFetching && <span className="refresh-indicator">Синхронізація...</span>}
      </div>
      <ul>
        {data?.map((article) => (
          <li key={article.id}>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5. Мутація даних через хук `useMutation`

Хук `useMutation` використовується для будь-яких операцій зміни даних на сервері: надсилання POST, PUT, PATCH або DELETE запитів.

### Анатомія `useMutation` та інвалідація кешу

На відміну від `useQuery`, мутації ніколи не виконуються автоматично при завантаженні сторінки — вони викликаються імперативно у відповідь на дії користувача (клік, відправка форми).

Головний патерн після успішної мутації — **інвалідація кешу** за допомогою методу `queryClient.invalidateQueries()`. Цей метод позначає кешовані дані як застарілі та автоматично ініціює їхнє свіже перезавантаження.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, FormEvent } from 'react';

interface CreateTodoDTO {
  title: string;
}

async function createTodo(newTodo: CreateTodoDTO) {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTodo),
  });
  if (!res.ok) throw new Error('Не вдалося створити задачу');
  return res.json();
}

export function AddTodoForm() {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      // Інвалідуємо список задач, що змушує React Query автоматично перевантажити його
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setTitle('');
    },
    onError: (err) => {
      console.error('Помилка мутації:', err);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutate({ title });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Нова задача..."
        disabled={isPending}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Збереження...' : 'Додати задачу'}
      </button>
      {isError && <p className="error">Виникла помилка при збереженні</p>}
    </form>
  );
}
```

---

## 6. Проєктування оптимістичного інтерфейсу (Optimistic UI)

У додатках із повільним мобільним інтернетом очікування відповіді сервера (навіть 500 мс) під час кліку кнопки "лайк" або перемикання чекбокса створює враження повільного та неповороткого інтерфейсу.

**Optimistic UI (Оптимістичне оновлення)** — це техніка, за якої інтерфейс оновлюється миттєво, припускаючи, що сервер успішно підтвердить операцію. Якщо ж запит завершився аварією (помилка мережі чи відхилення 500), інтерфейс автоматично відкочується до попереднього дійсного стану.

### Реалізація оптимістичного перемикання задачі

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Серверна помилка');
      return res.json();
    },

    // 1. Виконується безпосередньо перед надсиланням мережевого запиту
    onMutate: async (updatedTodo) => {
      // Зупиняємо всі активні фонові запити за цим ключем, щоб вони не перезаписали оптимістичний стан
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Зберігаємо поточний стан кешу як знімок для можливого відкату
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Оптимістично оновлюємо кеш у пам'яті прямо зараз
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
        old.map((todo) =>
          todo.id === updatedTodo.id ? { ...todo, completed: updatedTodo.completed } : todo
        )
      );

      // Повертаємо контекст із попереднім станом
      return { previousTodos };
    },

    // 2. Викликається лише тоді, коли сервер повертає помилку
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        // Відкочуємо кеш до стану, який був до натискання
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    // 3. Викликається завжди після завершення (успіх або помилка) для остаточної синхронізації
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

Завдяки цьому користувач бачить зміну стану перемикача миттєво (за 0 мілісекунд), а додаток гарантовано залишається захищеним від розбіжностей із базою даних.

---

## Висновки

- концептуальний поділ стану - серверний стан принципово відрізняється від клієнтського своєю асинхронністю, застаріванням та спільним доступом;
- стратегія Stale-While-Revalidate - миттєвий показ кешованих даних у поєднанні з фоновою ревалідацією забезпечує неперевершений UX;
- гранулярність ключів Query Keys - будь-який динамічний параметр, що впливає на відповідь бекенду, повинен бути частиною серіалізованого масиву ключа;
- контроль свіжості через `staleTime` та `gcTime` - запобігає зайвим мережевим запитам і керує очищенням неактивної пам'яті;
- декларативна синхронізація мутацій - виклик `invalidateQueries` після завершення `useMutation` автоматично підтягує свіжі дані без необхідності ручної синхронізації;
- оптимістичний UI - миттєве відображення дій користувача з надійним механізмом відкату (Rollback) через знімок кешу `onMutate`.

---

## Рекомендована література та джерела

- офіційна документація TanStack Query v5 - https://tanstack.com/query/latest/docs/framework/react/overview;
- серія статей Домініка Дорфмайстера "Practical React Query" - https://tkdodo.eu/blog/practical-react-query;
- документація керування кешем та інвалідації - https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation;
- керівництво з оптимістичних оновлень (Optimistic Updates) - https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates;
- специфікація протоколу кешування RFC 5861 (Stale-While-Revalidate) - https://datatracker.ietf.org/doc/html/rfc5861.

---

## Запитання для самоперевірки

- чому збереження даних асинхронного REST API у глобальних клієнтських сховищах (Redux/Zustand) призводить до ускладнення коду;
- у чому полягає сутність стратегії кешування Stale-While-Revalidate (SWR);
- яка різниця між параметрами `staleTime` та `gcTime` у конфігурації TanStack Query;
- чому будь-які змінні фільтрації або пагінації обов'язково повинні бути включені до масиву `queryKey`;
- чим стан `isLoading` відрізняється від `isFetching` і в яких сценаріях інтерфейсу кожен із них використовується;
- як працює метод `queryClient.invalidateQueries()` після успішного виконання мутації;
- які три етапи життєвого циклу (`onMutate`, `onError`, `onSettled`) необхідні для реалізації надійного оптимістичного оновлення (Optimistic UI).
