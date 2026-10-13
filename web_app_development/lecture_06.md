# Лекція 6 (2 години). Локальний стан: хуки useState та useReducer, пакетне оновлення та іммутабельність

## План лекції

- 1. Природа стану (State) у React: чому локальні змінні не тригерять рендеринг та концепція "знімка" (Snapshot);
- 2. Хук `useState`: синтаксис кортежу, функціональне оновлення (`setCount(prev => prev + 1)`) та відкладена ініціалізація (Lazy State);
- 3. Автоматичне пакетне оновлення (Automatic Batching) у сучасних версіях React: механізм мінімізації ререндерів;
- 4. Робота зі складними станами (вкладені об'єкти та масиви): абсолютний принцип незмінності (Immutability);
- 5. Хук `useReducer`: архітектурний патерн Reducer (State, Action, Dispatch) та концепція скінченних автоматів (FSM);
- 6. Порівняльний інженерний аналіз: коли залишатися на `useState`, а коли переходити на `useReducer`.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **FSM** (Finite State Machine) — скінченний автомат станів;
- **vDOM** (Virtual Document Object Model) — віртуальна об'єктна модель документа;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **TS** (TypeScript) — типізована мова програмування.

## Вступ

Якщо пропси (Props) є параметрами, які компонент отримує ззовні, то **Стан (State)** — це внутрішня пам'ять компонента, яка дозволяє йому "пам'ятати" дані між викликами та динамічно змінюватися у відповідь на дії користувача. Стан є рушієм інтерактивності будь-якого веб-додатку.

У цій лекції розкривається внутрішня природа реактивного стану в React, пояснюється, чому стан поводиться як незмінний "знімок" у часі (Snapshot), аналізується механізм автоматичного пакетного оновлення (Automatic Batching), формулюються суворі правила іммутабельної трансформації складних структур даних та розглядається патерн `useReducer` для керування складною бізнес-логікою.

---

## 1. Природа стану у React: концепція знімка (State as a Snapshot)

Чому ми не можемо просто оголосити звичайну змінну всередині функціонального компонента та змінювати її при кліку?

```tsx
// КОД, ЯКИЙ НЕ ПРАЦЮЄ:
export function BrokenCounter() {
  let count = 0; // Звичайна локальна змінна

  const handleClick = () => {
    count = count + 1; // Змінна змінюється, але екран залишається старим!
    console.log(count);
  };

  return <button onClick={handleClick}>Кліків: {count}</button>;
}
```

Чому цей код не оновлює екран:
- локальні змінні не зберігаються між рендерами - під час кожного виклику функції `BrokenCounter()` змінна `count` створюється наново та ініціалізується нулем;
- зміна локальної змінної не запускає рендеринг - React не має механізму відстеження (Proxy або сетерів) для довільних локальних змінних, тому Virtual DOM не знає про факт зміни.

### Стан як "знімок" у часі (Snapshot)

Коли компонент рендериться, React викликає функцію і створює **знімок (Snapshot)** інтерфейсу для конкретного моменту часу.
Пропси, змінні та обробники подій усередині цього рендеру зафіксовані зі значеннями, які стан мав **на момент початку рендерингу**:

```tsx
export function SnapshotDemo() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  };

  return <button onClick={handleClick}>Значення: {count}</button>;
}
```

Якщо початкове значення `count === 0`, яке значення буде на екрані після одного кліку?
Відповідь: **1, а не 3!**
Чому:
- під час виконання функції `handleClick` значення `count` у поточному знімку зафіксоване і дорівнює `0`;
- код читається як: `setCount(0 + 1)`, `setCount(0 + 1)`, `setCount(0 + 1)`;
- функція `setCount` не змінює змінну `count` негайно на місці, вона лише надсилає React запит: *"заплануй наступний рендер, у якому count дорівнюватиме 1"*.

---

## 2. Хук `useState`: кортеж, функціональне оновлення та відкладена ініціалізація

Хук `useState` є базовим інструментом збереження локального стану в функціональних компонентах.

### Синтаксис кортежу (Tuple Destructuring)

`useState` повертає масив із двох елементів:
- поточне значення стану;
- функція-диспетчер для оновлення стану.

```tsx
const [state, setState] = useState(initialValue);
```

### Функціональне оновлення (Updater Function)

Якщо нове значення стану залежить від **попереднього значення**, категорично рекомендується передавати у функцію оновлення колбек:

```tsx
// ПРАВИЛЬНИЙ ІНЖЕНЕРНИЙ ПІДХІД:
const handleClick = () => {
  setCount((prevCount) => prevCount + 1);
  setCount((prevCount) => prevCount + 1);
  setCount((prevCount) => prevCount + 1);
};
```

Тепер після одного кліку значення стане **3**:
- React вибудовує чергу функцій оновлення (Update Queue);
- кожна наступна функція бере актуальний результат попередньої: $0 \to 1 \to 2 \to 3$.

### Відкладена ініціалізація стану (Lazy Initial State)

Якщо початкове значення стану вимагає важких обчислень (читання великого JSON із `localStorage`, складний математичний розрахунок):

```tsx
// НЕОПТИМАЛЬНИЙ КОД:
// Читання localStorage виконуватиметься ПРИ КОЖНОМУ повторному рендері!
const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

// ОПТИМАЛЬНИЙ КОД (ВІДКЛАДЕНА ІНІЦІАЛІЗАЦІЯ):
// Функція виконається рівно ОДИН РАЗ при першому монтуванні компонента!
const [user, setUser] = useState(() => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : {};
});
```

---

## 3. Автоматичне пакетне оновлення (Automatic Batching)

**Batching (пакетне оновлення)** — це оптимізація React, за якої кілька послідовних викликів функцій оновлення стану об'єднуються в один спільний рендеринг замість запуску кількох окремих.

### Як працює Automatic Batching у React 18/19

До React 18 пакетне оновлення працювало лише всередині нативних обробників подій React (наприклад, `onClick`). Якщо виклики відбувалися всередині асинхронного коду (`fetch`, `setTimeout`), кожен виклик `setState` викликав окремий повний рендеринг:

```tsx
// У React 17 викликало ДВА окремих рендери (миготіння інтерфейсу):
setTimeout(() => {
  setIsLoading(false); // Рендер 1
  setData(result);     // Рендер 2
}, 1000);
```

У сучасних версіях React діє **Automatic Batching**:
- React автоматично пакує всі зміни стану, незалежно від того, де вони відбуваються: у таймаутах, мережевих промісах чи асинхронних функціях;
- приклад вище викликає **рівно один підсумковий рендеринг**, підвищуючи продуктивність додатку.

---

## 4. Робота зі складними станами: золоті правила незмінності (Immutability)

Якщо стан є об'єктом або масивом, діє залізне правило: **ніколи не мутуйте стан безпосередньо**.

### Чому React не реагує на пряму мутацію об'єкта?

React використовує алгоритм поверхневого порівняння посилань (**Shallow Reference Equality — `Object.is`**):
- якщо ви викликаєте `setItems(items)`, React порівнює посилання: `oldItems === newItems`;
- якщо ви змінили масив методом `items.push('нова задача')`, посилання на об'єкт масиву в пам'яті залишилося тим самим;
- React вважає, що нічого не змінилося, і **скасовує рендеринг**!

### Таблиця патернів іммутабельності

| Операція над даними | Мутуючий метод (ЗАБОРОНЕНО) | Іммутабельний метод (ЕТАЛОН REACT) |
| :--- | :--- | :--- |
| **Додавання в масив** | `arr.push(x)`, `arr.unshift(x)` | `[...arr, x]`, `[x, ...arr]` |
| **Видалення з масиву**| `arr.splice(index, 1)` | `arr.filter(item => item.id !== id)` |
| **Оновлення елемента** | `arr[index].status = 'done'` | `arr.map(item => item.id === id ? { ...item, status: 'done' } : item)` |
| **Оновлення поля об'єкта**| `obj.name = 'Нове ім'я'` | `{ ...obj, name: 'Нове ім\'я' }` |
| **Оновлення вкладеного поля**| `obj.address.city = 'Київ'` | `{ ...obj, address: { ...obj.address, city: 'Київ' } }` |

Приклад безпечного оновлення вкладеного стану:

```tsx
interface ProfileState {
  username: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileState>({
    username: 'alex',
    preferences: { theme: 'light', notifications: true },
  });

  const toggleTheme = () => {
    setProfile((prev) => ({
      ...prev, // Копіюємо поверхневі поля
      preferences: {
        ...prev.preferences, // Копіюємо вкладений об'єкт
        theme: prev.preferences.theme === 'light' ? 'dark' : 'light',
      },
    }));
  };

  return <button onClick={toggleTheme}>Тема: {profile.preferences.theme}</button>;
}
```

---

## 5. Хук `useReducer`: архітектурний патерн Reducer та скінченні автомати (FSM)

Коли стан стає складним, містить взаємопов'язані поля, або наступний стан залежить від складних бізнес-правил, хук `useState` перетворюється на спагеті-код із десятків розрізнених функцій оновлення.

Рішення — хук **`useReducer`**.

### Анатомія патерну Reducer

Патерн базується на ідеї чистих функцій із трьох елементів:
- **State (Стан)** — єдиний типізований об'єкт стану системи;
- **Action (Дія)** — об'єкт, який описує подію, що відбулася (`type: string` та опціональне корисне навантаження `payload`);
- **Reducer (Редюсер)** — чиста функція, яка приймає поточний стан та дію, і повертає абсолютно новий стан: `(state, action) => newState`;
- **Dispatch (Диспетчер)** — функція відправки дії в редюсер.

### Реалізація кошика замовлень за допомогою `useReducer`

```tsx
import React, { useReducer } from 'react';

// 1. Моделі даних
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
}

// 2. Типізація дій (Discriminated Union Actions)
type CartAction =
  | { type: 'ADD_ITEM'; payload: { id: string; name: string; price: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'CLEAR_CART' };

// 3. Чиста функція редюсера
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.id === action.payload.id);
      let updatedItems: CartItem[];

      if (existing) {
        updatedItems = state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedItems = [...state.items, { ...action.payload, quantity: 1 }];
      }

      const total = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      return { items: updatedItems, totalAmount: total };
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter((item) => item.id !== action.payload.id);
      const total = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      return { items: updatedItems, totalAmount: total };
    }

    case 'CLEAR_CART':
      return { items: [], totalAmount: 0 };

    default:
      return state;
  }
}

// 4. Компонент
export function ShoppingCart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [], totalAmount: 0 });

  return (
    <div>
      <h3>Кошик: {state.totalAmount} грн</h3>
      <button
        onClick={() =>
          dispatch({
            type: 'ADD_ITEM',
            payload: { id: 'p1', name: 'Клавіатура', price: 1500 },
          })
        }
      >
        Додати товар
      </button>
      <button onClick={() => dispatch({ type: 'CLEAR_CART' })}>Очистити</button>
    </div>
  );
}
```

### Концепція скінченних автоматів (Finite State Machine — FSM)

`useReducer` ідеально підходить для моделювання інтерфейсів, які не можуть перебувати у суперечливих станах.
Класичний антипатерн на базі `useState`:

```tsx
// АНТИПАТЕРН: МОЖЛИВИЙ СУПЕРЕЧЛИВИЙ СТАН (isLoading === true ТА isError === true одночасно!)
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState(null);
```

За допомогою `useReducer` стан моделюється як дискретні взаємовиключні фази:
`type FetchState = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: Item[] } | { status: 'error'; error: string }`.
Неможливо випадково опинитися у стані завантаження та помилки одночасно.

---

## 6. Порівняльний інженерний аналіз: `useState` проти `useReducer`

| Критерій порівняння | `useState` | `useReducer` |
| :--- | :--- | :--- |
| **Складність коду** | Простий синтаксис, мінімальний бойлерплейт | Потребує оголошення типів екшенів та функції редюсера |
| **Тип даних** | Прості типи: числа, рядки, булеві прапорці | Складні структури даних, вкладені об'єкти та масиви |
| **Залежність полів** | Поля змінюються незалежно одне від одного | Зміна одного поля вимагає автоматичного перерахунку інших |
| **Тестування бізнес-логіки**| Логіка вшита всередину компонента | Редюсер є чистою функцією, яку можна протестувати юніт-тестами поза React |
| **Оптимізація колбеків** | Функція `setState` змінюється рідко, але залежить від замикань | Функція `dispatch` має **гарантовано стабільне посилання** на весь життєвий цикл |

---

## Висновки

- стан як знімок - значення стану всередині одного рендерингу є незмінними; оновлення стану планує новий рендеринг у майбутньому;
- функціональний сетер - якщо нове значення розраховується на базі попереднього, обов'язково використовується форма `setState(prev => prev + 1)`;
- автоматичний Batching - сучасний React об'єднує множинні оновлення стану в один рендеринг навіть в асинхронних операціях;
- непорушність іммутабельності - пряма мутація об'єктів або масивів блокує перевірку `Object.is` і призводить до ігнорування оновлень інтерфейсу;
- архітектурна сила `useReducer` - винесення бізнес-логіки у чисту функцію редюсера гарантує передбачуваність переходів стану та захищає від суперечливих станів за принципом скінченного автомата.

---

## Рекомендована література та джерела

- офіційна документація React: стан як знімок - https://react.dev/learn/state-as-a-snapshot;
- посібник React: оновлення об'єктів та масивів у стані - https://react.dev/learn/updating-objects-in-state;
- документація хука useReducer - https://react.dev/reference/react/useReducer;
- стаття Dan Abramov "A Complete Guide to useEffect" (розділ про природу стану) - https://overreacted.io/a-complete-guide-to-useeffect/;
- архітектура Redux: принципи чистих редюсерів - https://redux.js.org/understanding/thinking-in-redux/three-principles.

---

## Запитання для самоперевірки

- чому зміна звичайної локальної змінної всередині функції-компонента не спричиняє оновлення інтерфейсу в браузері;
- поясніть поняття "State as a Snapshot" та передбачте результат триразового виклику `setCount(count + 1)`;
- у чому полягає перевага відкладеної ініціалізації стану (`useState(() => getInitialData())`) над прямою передачею виклику функції;
- як працює механізм Automatic Batching у React 19 та яку практичну проблему він вирішує;
- чому використання мутуючих методів масиву (`.push()`, `.splice()`) є антипатерном у React;
- у яких практичних сценаріях інженер повинен надати перевагу хуку `useReducer` перед хуком `useState`?
