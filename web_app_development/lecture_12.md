# Лекція 12 (2 години). Глобальне керування клієнтським станом: Context API проти Zustand

## План лекції

- 1. Архітектура розподіленого стану додатку: локальний стан, підйом стану (Lifting State Up) та глобальний стан;
- 2. Анатомія та межі можливостей React Context API: проблема неконтрольованих надлишкових ререндерів споживачів;
- 3. Еволюція клієнтського стейт-менеджменту: причини відмови індустрії від важкого Redux на користь легковагих рішень;
- 4. Архітектура Zustand: створення типізованого сховища (Store), атомарні дії (Actions) та іммутабельність;
- 5. Оптимізація продуктивності через селектори стану (State Selectors) та хук порівняння `useShallow`;
- 6. Проміжні обробники (Middleware) у Zustand: збереження даних у LocalStorage через `persist` та інтеграція з DevTools.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **SPA** (Single Page Application) — односторінковий веб-додаток;
- **JSON** (JavaScript Object Notation) — текстовий формат обміну даними;
- **CRUD** (Create, Read, Update, Delete) — базові операції над даними сховища.

## Вступ

У міру масштабування фронтенд-застосунку ізольованого стану окремих компонентів (`useState`) стає недостатньо. Інтерфейсні елементи на протилежних гілках дерева компонентів починають потребувати спільних даних: аватар користувача в шапці сайту, лічильник товарів у плаваючому віджеті кошика, налаштування поточної мови інтерфейсу та системні спливаючі сповіщення (Toasts).

Передача таких даних через пропси на 5–10 рівнів вглиб (антипатерн Prop Drilling) перетворює підтримку коду на кошмар. Традиційним рішенням у минулому був вбудований інструмент React Context API або монументальна бібліотека Redux. Проте сучасна індустрія веб-розробки здійснила фундаментальний перехід до легковагих, високопродуктивних стейт-менеджерів на базі зовнішніх підписок, беззаперечним лідером серед яких став **Zustand**.

У цій лекції детально аналізується природа розподіленого стану, розбираються внутрішні обмеження Context API, які роблять його непридатним для частих оновлень, та демонструється проєктування глобального сховища на базі Zustand із використанням TypeScript, оптимізацією селекторів та синхронізацією з браузерним сховищем LocalStorage.

---

## 1. Архітектура розподіленого стану додатку

Перед вибором бібліотеки глобального стану інженер повинен класифікувати дані за трьома категоріями:

- локальний стан (Local State) — дані, що потрібні суто одному компоненту або його прямим нащадкам (наприклад, відкритий/закритий стан випадаючого списку, введення тексту в інпуті). Керується через `useState` або `useReducer`;
- стан підгрупи (Lifting State Up) — дані, які спільно використовують два сусідніх компоненти. Піднімаються до їхнього найближчого спільного предка;
- глобальний клієнтський стан (Global Client State) — загальносистемні дані, доступні з будь-якої точки застосунку (профіль автентифікованого користувача, глобальна тема оформлення, список товарів у кошику, активні модальні діалоги).

Головна мета глобального стейт-менеджера — надати доступ до читання та модифікації цих даних будь-якому компоненту без проміжного забруднення дерева пропсами.

---

## 2. Анатомія та межі можливостей React Context API

React Context API було створено для передачі низькочастотних конфігураційних даних (локалізація, активна колірна тема, системні налаштування аудіо).

### Архітектура Context API

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={ { theme, toggleTheme } }>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

### Фундаментальна проблема надлишкових ререндерів

Найбільше обмеження Context API полягає в алгоритмі сповіщення споживачів:

- коли значення `value` у `Context.Provider` змінюється (навіть одне окреме поле складного об'єкта), **абсолютно кожен компонент**, який викликає `useContext(MyContext)`, гарантовано виконує повторний рендеринг;
- оптимізація через `React.memo` всередині дерева **не захищає** компонент, якщо він безпосередньо підписаний на контекст;
- у Context API відсутній вбудований механізм вибіркових підписок (Fine-Grained Selectors).

### Приклад проблеми: кошик інтернет-магазину

Уявімо контекст кошика, де зберігаються масив товарів `items` та системний лічильник `count`:

```tsx
interface CartState {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItem) => void;
}
```

Якщо компонент `CartBadge` у хедері використовує суто `itemCount`, а компонент `CartPage` відображає детальний масив `items`:
- додавання нового коментаря до товару чи зміна кількості оновлює об'єкт `value`;
- `CartBadge` змушений рендеритися повторно, навіть якщо саме поле `itemCount` не змінилося;
- у застосунках із сотнями компонентів це спричиняє масові "шторми рендерингу" та відчутні затримки інтерфейсу.

---

## 3. Еволюція клієнтського стейт-менеджменту: від Redux до Zustand

В історії React розробка глобального стану пройшла кілька етапів:

- епоха Redux (2015–2020) — жорсткий функціональний патерн на основі чистих редьюсерів, екшенів (Actions) та диспетчера (Dispatch). Вимагав величезної кількості шаблонного коду (Boilerplate): опису констант типів, action-креаторів, редьюсерів та складної інтеграції через `connect` або `useSelector`;
- епоха Redux Toolkit (RTK) — спростила конфігурацію, але зберегла високий поріг входження та концептуальне перевантаження для більшості стандартних додатків;
- епоха легковагого стейт-менеджменту (Zustand, Jotai) — бібліотека Zustand, створена спільнотою Poimandres, звела роботу зі станом до лаконічного, прямолінійного хукового API без провайдерів та надлишкових абстракцій.

### Чому індустрія обирає Zustand?

- крихітний розмір бандлу — менше ніж 1.2 Кб у стисненому вигляді проти ~10–15 Кб у Redux-стеку;
- відсутність Provider Hell — Zustand-стор живе поза деревом React і не вимагає обгортання кореневого компонента в десятки провайдерів;
- простота ментальної моделі — дії (Actions) оголошуються безпосередньо всередині стору поруч зі станом;
- точкові селектори — компонент підписується лише на конкретні атомарні поля і рендериться суто при їхній зміні;
- використання поза React — стан можна легко читати та змінювати навіть у звичайних утилітарних функціях без хуків (`useStore.getState()`, `useStore.setState()`).

---

## 4. Архітектура Zustand: створення типізованого сховища

Zustand базується на патерні Observer (підписка/сповіщення). Сховище створюється за допомогою функції `create`, яка приймає функцію-ініціалізатор з аргументами `set` та `get`.

### Створення типізованого стору автентифікації та профілю

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Дії (Actions)
  setUser: (user: User) => void;
  logout: () => void;
  updateEmail: (newEmail: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: () => set({ user: null, isAuthenticated: false }),

  updateEmail: (newEmail) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // Автоматичне поверхневе злиття (Shallow Merge)
    set({
      user: {
        ...currentUser,
        email: newEmail,
      },
    });
  },
}));
```

### Особливості поведінки методу `set`

На відміну від `useState` у React, функція `set` у Zustand за замовчуванням виконує **поверхневе злиття (Shallow Merge)** об'єктів. Це означає, що при оновленні поля `user` інші властивості стору (`isLoading`, `isAuthenticated`) автоматично зберігаються без необхідності ручного копіювання через `...state`.

---

## 5. Оптимізація продуктивності через селектори стану

Найбільша сила Zustand — це гранулярна реактивність завдяки механізму селекторів.

### Правило атомарних селекторів

Коли компонент використовує стор, він ніколи не повинен діставати весь об'єкт цілком, якщо йому потрібна лише одна властивість:

```tsx
// ❌ АНТИПАТЕРН: компонент буде рендеритися при БУДЬ-ЯКІЙ зміні всередині стору
export function HeaderAvatar() {
  const store = useAuthStore();
  return <span>{store.user?.name}</span>;
}

// ✅ ПРАВИЛЬНИЙ ПІДХІД: підписка суто на одне значення
export function HeaderAvatar() {
  const userName = useAuthStore((state) => state.user?.name);
  return <span>{userName}</span>;
}
```

У другому випадку компонент `HeaderAvatar` виконає повторний рендеринг **виключно** тоді, коли значення `state.user?.name` реально зміниться.

### Проблема повернення нових об'єктів та хук `useShallow`

Якщо селектор повертає новий об'єкт або масив кількох полів, JavaScript щоразу створює новий екземпляр за посиланням, що викликає зайвий ререндер.

Для розв'язання цієї проблеми Zustand надає допоміжний хук `useShallow`:

```tsx
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/useAuthStore';

export function UserStatusBadge() {
  // Без useShallow новий об'єкт { role, isAuthenticated } щоразу ламав би рівність за посиланням
  const { role, isAuthenticated } = useAuthStore(
    useShallow((state) => ({
      role: state.user?.role,
      isAuthenticated: state.isAuthenticated,
    }))
  );

  if (!isAuthenticated) return <span>Гість</span>;
  return <span className={`badge-${role}`}>{role}</span>;
}
```

Функція `useShallow` порівнює кожне поле об'єкта окремо і блокує рендеринг, якщо самі значення всередині об'єкта не змінилися.

---

## 6. Проміжні обробники (Middleware) у Zustand

Zustand підтримує потужну модульну систему middleware для розширення функціональності сховища.

### Персистентність у LocalStorage через `persist`

Middleware `persist` автоматично зберігає стан сховища у браузерному сховищі (`localStorage` або `sessionStorage`) та синхронізує його при повторному відкритті сторінки:

```typescript
// src/store/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        const existing = items.find((i) => i.id === product.id);

        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      clearCart: () => set({ items: [] }),

      totalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'ecommerce-cart-storage', // Ключ у LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Опціонально: зберігати лише обрані поля
      partialize: (state) => ({ items: state.items }),
    }
  )
);
```

### Інтеграція з інструментами розробника Redux DevTools

За допомогою middleware `devtools` будь-який стор Zustand підключається до популярного розширення браузера Redux DevTools:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }, false, 'theme/setTheme'),
    }),
    { name: 'AppStore' }
  )
);
```

Розробник отримує зручний інтерфейс для інспекції стану, перегляду часової шкали дій (Time Travel Debugging) та скидання стану.

---

## Висновки

- межі можливостей Context API - відсутність атомарних селекторів спричиняє повторний рендеринг усіх компонентів-споживачів при зміні будь-якого поля контексту;
- легковажність та простота Zustand - компактний розмір (1.2 Кб), відсутність потреби огортати дерево додатку в провайдери та лаконічний хуковий синтаксис;
- атомарні селектори як ключ до швидкодії - підписка компонента суто на потрібні поля гарантує мінімальну кількість оновлень у дереві vDOM;
- стабілізація складових селекторів через `useShallow` - запобігає надлишковим ререндерам, коли функція-селектор повертає новий об'єкт або масив;
- розширення функціоналу за допомогою middleware - збереження стану в LocalStorage через `persist` та інспекція дій через `devtools` налаштовуються кількома рядками конфігурації.

---

## Рекомендована література та джерела

- офіційна документація бібліотеки Zustand - https://zustand.docs.pmnd.rs/;
- керівництво з використання селекторів та оптимізації в Zustand - https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow;
- порівняння React Context та рішень стейт-менеджменту - https://kentcdodds.com/blog/application-state-management-with-react;
- документація розширення Redux DevTools - https://github.com/reduxjs/redux-devtools;
- стаття щодо правильного вибору типу стану (Server State vs Client State) - https://tkdodo.eu/blog/practical-react-query.

---

## Запитання для самоперевірки

- чому Context API не рекомендується використовувати для управління високочастотним станом додатку (наприклад, кошиком або формами);
- чи захищає використання `React.memo` компонент від рендерингу, якщо він викликає хук `useContext`;
- у чому полягає відмінність роботи функції `set` у Zustand від функції `useState` в React щодо злиття полів об'єкта;
- чому селектор `useAuthStore((state) => ({ name: state.name }))` спричиняє повторний рендер компонента навіть без зміни імені;
- яку конкретну задачу вирішує утиліта `useShallow` з пакету `zustand/react/shallow`;
- як за допомогою middleware `persist` організувати фільтрацію полів (`partialize`), щоб зберігати в LocalStorage лише частину стану;
- як отримати поточне значення або змінити стан Zustand-стору поза React-компонентами (наприклад, в асинхронній утиліті).
