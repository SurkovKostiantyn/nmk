# Лекція 10 (2 години). Кастомні хуки (Custom Hooks): абстракція бізнес-логіки та Headless-патерни

## План лекції

- 1. Фундаментальні правила хуків (Rules of Hooks) та механіка роботи зв'язного списку Fiber;
- 2. Анатомія кастомного хука: композиція стандартних примітивів та контракти типізації TypeScript;
- 3. Практична реалізація системних хуків для роботи з Web API (`useLocalStorage`, `useWindowSize`, `useMediaQuery`, `useDebounce`, `useOnClickOutside`);
- 4. Концепція Headless UI хуків: відокремлення логіки та стану від візуального представлення та патерн Prop Getters;
- 5. Екосистема готових рішень (`usehooks-ts`) та архітектурні критерії винесення бізнес-логіки;
- 6. Стратегії ізольованого модульного тестування кастомних хуків за допомогою утиліти `renderHook`.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **SSR** (Server-Side Rendering) — серверний рендеринг веб-сторінок;
- **RTL** (React Testing Library) — бібліотека для тестування компонентів та хуків React;
- **ARIA** (Accessible Rich Internet Applications) — набір специфікацій цифрової доступності інтерфейсів.

## Вступ

З моменту впровадження React Hooks у версії 16.8 функціональні компоненти отримали можливість зберігати локальний стан та керувати побічними ефектами. Проте справжня революція полягає не лише у заміні класових компонентів, а в появі принципово нового механізму повторного використання коду — **кастомних хуків (Custom Hooks)**.

У класичному компонентно-орієнтованому підході повторне використання логіки вимагало складних структурних шаблонів: компонентів вищого порядку (Higher-Order Components, HOC) або рендер-пропсів (Render Props), що призводило до "пекла обгорток" (Wrapper Hell) та надмірного ускладнення дерева віртуального DOM. Кастомні хуки дозволили інкапсулювати стан та пов'язані з ним алгоритми у звичайні функції, відокремивши бізнес-логіку від візуальної розмітки.

У цій лекції детально розглядаються низькорівневі правила роботи хуків, розбирається анатомія створення власних хуків на базі TypeScript, наводяться готові до виробничого використання реалізації взаємодії з браузерними Web API, досліджується сучасна парадигма Headless UI та демонструються підходи до ізольованого автоматизованого тестування.

---

## 1. Фундаментальні правила хуків (Rules of Hooks) та механіка роботи зв'язного списку Fiber

React накладає на використання хуків два жорстких правила, недотримання яких призводить до фатальних помилок синхронізації внутрішнього стану програми:

- виклик хуків виключно на верхньому рівні (Top-Level) — заборонено викликати хуки всередині циклів (`for`, `while`), умовних операторів (`if`, `switch`) або вкладених функцій;
- виклик хуків виключно з функцій React — хуки дозволено викликати лише всередині тіла функціональних компонентів або всередині інших кастомних хуків.

### Чому порядок викликів має критичне значення?

Для розуміння причин виникнення цих обмежень необхідно поглянути на внутрішню структуру вузла Fiber у ядрі React. React не прив'язує стан хука до його текстового імені або унікального ідентифікатора. Замість цього всі хуки одного компонента зберігаються у вигляді **односпрямованого зв'язаного списку (Singly Linked List)** об'єктів у полі `memoizedState` відповідного Fiber-вузла:

```
FiberNode (компонент)
  └── memoizedState ──> [ Hook 1 (useState) ]
                               │ next
                               ▼
                        [ Hook 2 (useEffect) ]
                               │ next
                               ▼
                        [ Hook 3 (useState) ]
                               │ next
                               ▼
                              null
```

Кожен виклик хука під час рендерингу переміщує внутрішній вказівник на наступний елемент цього зв'язаного списку. Якщо при першому рендерингу компонент викликав три хуки, а при наступному рендерингу один з них опинився під хибною умовою `if` і не виконався:

- вказівник зв'язаного списку зміщується — третій хук отримає збережені дані другого хука;
- порушується цілісність типів та значень — стан лічильника буде прочитано як стан модального вікна;
- виникає непередбачувана поведінка застосунку або аварійне падіння інтерфейсу.

### Автоматичний аудит правил через ESLint

Для запобігання випадковому порушенню правил команда розробників React створила офіційний плагін `eslint-plugin-react-hooks`. До його складу входять два ключових правила:

- `react-hooks/rules-of-hooks` — синтаксично перевіряє, що будь-які функції з префіксом `use` викликаються суто на верхньому рівні функцій React;
- `react-hooks/exhaustive-deps` — аналізує масиви залежностей хуків життєвого циклу (`useEffect`, `useCallback`, `useMemo`) та гарантує включення всіх реактивних змінних.

---

## 2. Анатомія кастомного хука та контракти типізації TypeScript

Кастомний хук — це звичайна функція JavaScript/TypeScript, назва якої обов'язково починається з префіксу `use`, і всередині якої викликаються інші стандартні чи кастомні хуки React.

Префікс `use` є обов'язковою конвенцією не лише для людини, а й для статичних аналізаторів коду (ESLint) та оптимізатора React Compiler, які орієнтуються на нього для перевірки дотримання правил хуків.

### Фундаментальний принцип: ізоляція екземплярів стану

Поширена помилка розробників-початківців полягає в припущенні, що кастомний хук ділиться спільним станом між різними компонентами. Це хибне уявлення:

- кастомні хуки діляться виключно логікою поведінки (алгоритмом), а не самими даними стану;
- кожен виклик кастомного хука в окремому компоненті створює повністю незалежний набір вузлів у зв'язаному списку Fiber цього конкретного компонента;
- зміна стану всередині хука в компоненті `A` ніяк не впливає на стан того самого хука в компоненті `B`.

### Контракти повернення значень: кортеж чи об'єкт

При проєктуванні інтерфейсу кастомного хука постає питання формату вихідних даних:

- повернення кортежу (Array/Tuple) — дозволяє споживачу довільно іменувати змінні при деструктуризації без колізій (аналогічно до стандартного `useState`), проте вимагає суворого дотримання порядку аргументів та використання TypeScript-модифікатора `as const`:

```typescript
export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  // Без `as const` TypeScript виведе тип (boolean | (() => void))[]
  return [value, toggle] as const;
}
```

- повернення конфігураційного об'єкта (Object) — рекомендований підхід для хуків, що повертають більше двох сутностей. Забезпечує самодокументованість коду, порядок властивостей не має значення, а розширення новими полями в майбутньому не порушує зворотної сумісності клієнтського коду:

```typescript
export interface ToggleReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useDisclosure(initialState: boolean = false): ToggleReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
```

---

## 3. Практична реалізація системних хуків для роботи з Web API

Браузерні середовища надають потужні імперативні інтерфейси (Web APIs): сховища даних, медіа-запити, геометричні розміри вікна та події введення. Інкапсуляція цих API у декларативні хуки робить роботу з ними передбачуваною та безпечною.

### 3.1. Універсальний хук `useLocalStorage`

Збереження даних у сховищі `localStorage` вимагає серіалізації в JSON, обробки помилок переповнення квоти або відключених cookies, підтримки відкладеної ініціалізації та синхронізації між кількома відкритими вкладками браузера:

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  // Безпечне отримання початкового значення
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
      return initialValue instanceof Function ? initialValue() : initialValue;
    } catch (error) {
      console.warn(`Помилка читання localStorage за ключем "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Оновлення значення та синхронізація з localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn('Неможливо оновити localStorage у середовищі сервера');
        return;
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);

        // Сповіщення інших компонентів у межах поточного вікна
        window.dispatchEvent(new Event('local-storage-update'));
      } catch (error) {
        console.warn(`Помилка запису в localStorage за ключем "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Синхронізація між різними вкладками браузера за подією 'storage'
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | Event) => {
      if ((event as StorageEvent)?.key && (event as StorageEvent).key !== key) {
        return;
      }
      setStoredValue(readValue());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [key, readValue]);

  return [storedValue, setValue];
}
```

### 3.2. Хук відстеження розмірів екрана `useWindowSize`

Для адаптивної логіки інтерфейсу на рівні JavaScript (наприклад, віртуалізація списків або відмальовка графіків) необхідні поточні габарити вікна:

```typescript
import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}
```

### 3.3. Хук медіа-запитів `useMediaQuery`

Нативний інтерфейс `window.matchMedia` дозволяє слухати зміни системних налаштувань користувача (наприклад, стан темної теми `@media (prefers-color-scheme: dark)` або точки зламу адаптивності):

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', listener);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}
```

### 3.4. Оптимізація введення за допомогою `useDebounce`

Запобігає надмірному навантаженню сервера та перевантаженню рендерингу під час швидкого введення тексту користувачем у пошукових рядках чи фільтрах:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
```

### 3.5. Хук відстеження кліку за межами елемента `useOnClickOutside`

Критично важливий для реалізації модальних вікон, контекстних меню, селектів та випадаючих списків:

```typescript
import { useEffect, RefObject } from 'react';

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !ref.current || ref.current.contains(target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
```

---

## 4. Концепція Headless UI хуків: повна ізоляція логіки від представлення

Традиційні компонентні бібліотеки минулого (наприклад, ранні версії Bootstrap або Material UI) жорстко зв'язували логіку компонента з його HTML-розміткою та CSS-стилями. Це створювало проблеми при необхідності кастомізації дизайну під специфічний фірмовий стиль.

Сучасна архітектура фронтенду перейшла до концепції **Headless UI** (інтерфейси без візуальної оболонки). Headless-компонент чи хук бере на себе:

- управління станом (відкрито/закрито, вибраний елемент, активний індекс);
- управління подіями клавіатури (навігація стрілками, закриття клавішею `Escape`, вибір клавішею `Enter`);
- забезпечення цифрової доступності згідно зі стандартами WAI-ARIA (`aria-expanded`, `aria-haspopup`, `role="dialog"` тощо);
- повну передачу візуальної розмітки та стилів на розсуд розробника кінцевого компонента.

### Патерн Prop Getters проти повернення сирих значень

При створенні Headless-хуків існує два підходи до передачі поведінки DOM-елементам:

- повернення сирих властивостей — хук повертає прапорці та обробники (`onClick`, `aria-expanded`). Споживач повинен вручну розкидати їх по DOM-елементах. Недолік: високий ризик випадкового перекриття обробників споживача (`onClick={(e) => { myHandler(e); hookHandler(e); }}`);
- патерн Prop Getters — хук надає спеціальні допоміжні функції генерації пропсів (наприклад, `getTriggerProps()`, `getContentProps()`), які автоматично поєднують власні обробники хука з користувацькими функціями через ланцюговий виклик.

### Реалізація Headless-хука випадаючого списку (Dropdown) з ARIA

Розглянемо практичну реалізацію Headless-хука для навігаційного меню або випадаючого списку:

```typescript
import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { useOnClickOutside } from './useOnClickOutside';

interface UseDropdownOptions {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useDropdown({ defaultOpen = false, onOpenChange }: UseDropdownOptions = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useOnClickOutside(containerRef, close);

  // Prop Getter для кнопки-тригера
  const getTriggerProps = useCallback(
    (userProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {}) => ({
      ...userProps,
      'aria-haspopup': true as const,
      'aria-expanded': isOpen,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        userProps.onClick?.(event);
        if (!event.defaultPrevented) {
          toggle();
        }
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        userProps.onKeyDown?.(event);
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          close();
        }
      },
    }),
    [isOpen, toggle, close]
  );

  // Prop Getter для контейнера випадаючого списку
  const getMenuProps = useCallback(
    (userProps: React.HTMLAttributes<HTMLDivElement> = {}) => ({
      ...userProps,
      role: 'menu',
      hidden: !isOpen,
    }),
    [isOpen]
  );

  return {
    isOpen,
    toggle,
    close,
    containerRef,
    getTriggerProps,
    getMenuProps,
  };
}
```

Використання хука у візуальному компоненті:

```tsx
export function ProfileDropdown() {
  const { containerRef, getTriggerProps, getMenuProps, isOpen } = useDropdown();

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        {...getTriggerProps({
          className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg',
          onClick: () => console.log('Клік користувача зафіксовано'),
        })}
      >
        Мій профіль
      </button>

      {isOpen && (
        <div
          {...getMenuProps({
            className: 'absolute right-0 mt-2 w-48 bg-white border shadow-lg rounded-md p-2',
          })}
        >
          <a href="/settings" className="block p-2 hover:bg-slate-100">Налаштування</a>
          <a href="/logout" className="block p-2 hover:bg-slate-100 text-rose-600">Вихід</a>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Екосистема готових рішень та архітектурні критерії винесення бізнес-логіки

Замість написання кожної системної операції з нуля сучасний розробник спирається на надійні відкриті бібліотеки кастомних хуків, лідером серед яких для екосистеми TypeScript є **`usehooks-ts`**.

### Бібліотека `usehooks-ts`

Бібліотека надає понад 50 типізованих, оптимізованих для SSR хуків без сторонніх транзитивних залежностей:

- хуки для сенсорів та пристроїв — `useIntersectionObserver`, `useHover`, `useEventListener`;
- хуки для управління станом та часом — `useInterval`, `useTimeout`, `useCounter`, `useStep`;
- хуки для інтеграції з пам'яттю — `useSessionStorage`, `useDocumentTitle`, `useCopyToClipboard`.

### Архітектурні критерії: коли варто створювати кастомний хук?

Не кожен блок повторюваного коду потребує перетворення на хук. Використовуйте наступні критерії для прийняття рішення:

- повторюваність у різних модулях ("Правило трьох") — якщо подібна логіка управління станом з'являється у трьох або більше компонентах, її обов'язково слід винести у спільний хук;
- інкапсуляція складної взаємодії з Web API або сторонніми SDK — робота з WebSocket, Geolocation чи Web Audio значно чистіша, коли захована за декларативним інтерфейсом;
- декомпозиція занадто великого компонента — якщо компонент містить більше ніж 5–7 викликів `useState`/`useEffect`, візуальна частина JSX втрачає читабельність. Винесення пов'язаної бізнес-логіки у предметний хук (наприклад, `useCheckoutForm`) розділяє відповідальності;
- передчасна оптимізація та антипатерн "хук заради одного рядка" — якщо функція не використовує всередині жодного іншого хука React, вона є звичайною утилітарною функцією (pure utility function) і не повинна називатися хуком.

---

## 6. Стратегії ізольованого модульного тестування кастомних хуків за допомогою `renderHook`

Оскільки хуки React не можуть бути викликані поза середовищем виконання функціонального компонента, звичайний виклик функції `useMyHook()` у тестовому середовищі призведе до викидання помилки `Invalid hook call`.

Для вирішення цієї проблеми бібліотека `@testing-library/react` надає спеціалізовану утиліту `renderHook`, яка автоматично генерує тимчасовий синтетичний компонент-обгортку для тестування.

### Архітектура утиліти `renderHook`

Утиліта повертає об'єкт результату з наступними ключовими сутностями:

- `result.current` — поточне значення, яке повертає досліджуваний хук під час останнього завершеного рендерингу;
- `rerender(newProps)` — форсований повторний рендеринг тестового компонента з можливістю передачі оновлених параметрів;
- `unmount()` — імітація розмонтування компонента для перевірки виконання функцій очищення (Cleanup).

### Приклад юніт-тесту для хука `useToggle` (Vitest + RTL)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

describe('useToggle Custom Hook', () => {
  it('має ініціалізуватися зі значенням за замовчуванням (false)', () => {
    const { result } = renderHook(() => useToggle());
    const [value] = result.current;

    expect(value).toBe(false);
  });

  it('має приймати кастомне початкове значення', () => {
    const { result } = renderHook(() => useToggle(true));
    const [value] = result.current;

    expect(value).toBe(true);
  });

  it('має інвертувати значення при виклику функції toggle', () => {
    const { result } = renderHook(() => useToggle(false));

    // Будь-які оновлення стану всередині тестів мають огортатися в act()
    act(() => {
      const [, toggle] = result.current;
      toggle();
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      const [, toggle] = result.current;
      toggle();
    });

    expect(result.current[0]).toBe(false);
  });
});
```

---

## Висновки

- кастомний хук як механізм абстракції - це звичайна функція з префіксом `use`, яка поєднує стандартні примітиви React для створення багаторазової логіки поведінки;
- ізоляція пам'яті та стану - кожен виклик кастомного хука створює повністю незалежний набір вузлів у зв'язаному списку Fiber конкретного компонента;
- неухильне дотримання правил хуків - виклики дозволені лише на верхньому рівні функцій React для збереження фіксованого порядку адрес у зв'язаному списку;
- декларативне приховування Web API - складні браузерні інтерфейси надійно ізолюються від візуальних компонентів через готові хуки з підтримкою безпечного очищення пам'яті;
- концепція Headless UI - сучасний підхід відокремлює логіку, доступність WAI-ARIA та керування клавіатурою від HTML-розмітки та стилів;
- автономне тестування через `renderHook` - спеціалізовані утиліти бібліотеки тестування створюють синтетичний компонент для швидкої перевірки хуків у Vitest.

---

## Рекомендована література та джерела

- офіційна документація React щодо створення власних хуків - https://react.dev/learn/reusing-logic-with-custom-hooks;
- правила використання хуків у React - https://react.dev/reference/rules/rules-of-hooks;
- каталог типізованих кастомних хуків `usehooks-ts` - https://usehooks-ts.com/;
- керівництво з тестування хуків за допомогою React Testing Library - https://testing-library.com/docs/react-testing-library/api/#renderhook;
- специфікація шаблонів цифрової доступності W3C WAI-ARIA - https://www.w3.org/WAI/ARIA/apg/patterns/.

---

## Запитання для самоперевірки

- чому хуки React суворо заборонено викликати всередині умовних блоків `if` та циклів `for`;
- яким чином структура зв'язаного списку Fiber відстежує черговість виклику хуків між повторними рендерингами;
- чи ділять різні функціональні компоненти спільний стан, якщо вони викликають один і той самий кастомний хук;
- у яких випадках доцільно повертати з хука масив (кортеж `as const`), а коли об'єкт властивостей;
- як організувати безпечну синхронізацію стану `useLocalStorage` між різними вкладками одного браузера;
- у чому полягає перевага патерну Prop Getters перед простим поверненням набору властивостей та обробників подій;
- як працює утиліта `renderHook` з бібліотеки `@testing-library/react` під час ізольованого модульного тестування.
