# Лекція №11 (2 години). Глобальне керування станом: Context API та архітектурні альтернативи

## План лекції

1. Деградація односпрямованого потоку: проблема Prop Drilling.
2. Патерн "Глобальний стан": коли локального `useState` стає недостатньо.
3. Механіка Context API: `createContext`, `Provider` та хук `useContext`.
4. Вплив Context на продуктивність: проблема зайвих рендерів (Re-renders) споживачів.
5. Архітектурні межі Context API: чому Контекст НЕ є повноцінною заміною Redux/Zustand.
6. Патерн розподілених контекстів (Split Contexts) для оптимізації рендерингу.
7. Огляд екосистеми State Management: Redux Toolkit, Zustand, Jotai та MobX.

## Перелік умовних скорочень

- **API** (Application Programming Interface) – інтерфейс програмування додатків.
- **IoC** (Inversion of Control) – інверсія управління.
- **AST** (Abstract Syntax Tree) – абстрактне синтаксичне дерево.
- **SSR** (Server-Side Rendering) – серверний рендеринг.
- **Flux** – архітектурний патерн управління станом, запропонований Facebook.

## Вступ

Вирішення проблеми "prop drilling" (прокидання пропсів через багато рівнів). Створення контексту, використання Provider та хука useContext. Обговорюються обмеження контексту в контексті частого оновлення даних та сценарії, коли варто використовувати зовнішні бібліотеки керування станом, такі як Redux або Zustand.

У попередніх лекціях ми встановили, що стан компонента — це локальна пам'ять, а пропси (Props) забезпечують односпрямований потік даних вниз по дереву. Для простих додатків цієї архітектури достатньо. Однак, на масштабах ентерпрайз-додатків інженери стикаються з необхідністю доступу до одних і тих самих даних (наприклад, інформації про авторизованого користувача, теми оформлення, кошика товарів) з десятків різних компонентів, що знаходяться на різних гілках дерева і рознесені на багато рівнів вкладеності. Ця лекція детально аналізує вбудований у React механізм `Context API` для обходу дерева компонентів та розглядає межу, після якої необхідні зовнішні State Management бібліотеки.

---

## 1. Деградація односпрямованого потоку: Prop Drilling

В архітектурі React зміна стану батька передається дітям через пропси. Якщо компонент А має стан, який потрібен компоненту D (який вкладений так: A -> B -> C -> D), нам доведеться передати цей стейт як пропс через компоненти B і C.

```tsx
const Root = () => {
  const [theme, setTheme] = useState("dark");
  // Компонент Layout нічого не знає про theme, але мусить його прийняти і передати далі
  return <Layout theme={theme} />;
};
const Layout = ({ theme }) => <Header theme={theme} />;
const Header = ({ theme }) => <ProfileButton theme={theme} />;
const ProfileButton = ({ theme }) => <button className={theme}>Профіль</button>;
```

Це явище називається **Prop Drilling (Прокидання/Буріння пропсів)**.

- Різко збільшується зв'язність (Tight Coupling) компонентів.
- Компоненти-посередники (B, C) отримують пропси, які їм методологічно не належать (забруднення інтерфейсу компонента).
- Рефакторинг стає надзвичайно складним і повільним.

---

## 2. Механіка Context API

Для вирішення проблеми Prop Drilling, починаючи з React 16.3, був стабілізований **Context API**. Це класичний патерн "Видавець-Підписник" (Publisher-Subscriber / Dependency Injection), вбудований у дерево React.

Механізм складається з 3 етапів:

**1. Створення "труби" (Контексту):**

```tsx
import { createContext } from "react";

// 'light' - резервне значення, якщо компонент викличе useContext без Провайдера вище
export const ThemeContext = createContext("light");
```

**2. Надання даних (Provider):**
Провайдер — це компонент, який "наповнює трубу" актуальними даними.

```tsx
const App = () => {
  const [theme, setTheme] = useState("dark");

  return (
    // Всі дочірні компоненти, на будь-якій глибині, отримають доступ до value
    <ThemeContext.Provider value={theme}>
      <Layout />
    </ThemeContext.Provider>
  );
};
```

**3. Споживання даних (Хук `useContext`):**

```tsx
import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

const ProfileButton = () => {
  // Мигдаємо посередників: прямий доступ до значення з найближчого Провайдера вгорі!
  const theme = useContext(ThemeContext);
  return <button className={theme}>Профіль</button>;
};
```

---

## 3. Вплив Context на продуктивність та Re-renders

Контекст виглядає як "срібна куля", але має дуже високу архітектурну ціну.
Головне правило Context API: **Кожного разу, коли властивість `value` у Provider змінюється (за посиланням або за значенням), React ПРИМУСОВО рендерить УСІХ споживачів (useContext) цього контексту.**

Цей процес ігнорує будь-які оптимізації `React.memo`.

```tsx
// Глобальний надмірний контекст (Антипатерн)
const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState({ name: "Alex" });

  // Коли ми робимо setTheme('light'), створюється новий об'єкт value (Referential Equality = false!).
  return (
    <AppContext.Provider value={{ theme, user, setTheme, setUser }}>
      {children}
    </AppContext.Provider>
  );
};
```

У цьому прикладі, якщо зміниться ТІЛЬКИ `theme`, компонент `ProfileAvatar`, який підписаний на `AppContext` лише заради `user`, **буде перерендерений**, оскільки об'єкт `value` змінив своє посилання. Це призводить до катастрофічних втрат FPS на великих сторінках.

---

## 4. Патерн розподілених контекстів (Split Contexts)

Щоб вирішити проблему зайвих рендерів, системні інженери застосовують **Split Contexts**. Ми не створюємо один "божественний" (God Object) контекст для всього відразу. Ми розділяємо контексти за напрямками частоти оновлень або за сутностями.

Більше того, гарною практикою є розділення контексту **Даних** (що змінюються часто) та контексту **Дій/Методів** (які не змінюються ніколи).

```tsx
const ThemeStateContext = createContext("light");
const ThemeDispatchContext = createContext(() => {}); // Функції зміни

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");

  return (
    <ThemeStateContext.Provider value={theme}>
      {/* useCallback гарантує, що посилання на setTheme не змінюється */}
      <ThemeDispatchContext.Provider value={setTheme}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeStateContext.Provider>
  );
};
```

Тепер компонент `ThemeToggleButton`, який потребує ТІЛЬКИ функції зміни (Dispatch), підписується на `ThemeDispatchContext`. При зміні теми, цей компонент **не буде перерендерений**, оскільки значення `ThemeDispatchContext` не змінилося!

---

## 5. Архітектурні межі: Чому Контекст не замінює Redux

Серед розробників побутує оманлива думка, що хуки (`useContext` + `useReducer`) "вбили" Redux. Це фундаментально некоректно.

**Context API — це НЕ інструмент управління станом (State Management).**
Контекст — це інструмент **Dependency Injection** (Доставки даних). Сам по собі Контекст нічого не зберігає (зберігає `useState` всередині Провайдера).

**Обмеження Context API:**

1.  **Не підходить для даних, що часто оновлюються.** (Якщо ви зберігаєте в Контексті координати миші X та Y, що змінюються 60 разів на секунду, додаток "заморозиться" через масовий ререндеринг всіх підписників).
2.  **Немає можливості часткової підписки (Selectors).** Ви не можете сказати Context: "Перерендери мене ТІЛЬКИ якщо зміниться `user.firstName`, але проігноруй зміну `user.lastName`".
3.  **Немає єдиного глобального сховища (Store) поза React-деревом.** Дані живуть в компонентах.
4.  **Важке налагодження.** Відсутній Time-travel debugging, як у Redux DevTools.

Context ідеальний для: Тема (Dark/Light), Активний користувач (Auth Session), Мова інтерфейсу (i18n), Налаштування конфігурації (Config). Тобто для даних, що змінюються вкрай рідко.

---

## 6. Огляд екосистеми State Management (Redux, Zustand)

Коли додаток стабільно зростає, розробники впроваджують інструменти Глобального Управління Станом (Global State Management). Ці інструменти зберігають дані **поза** деревом React і мають власні алгоритми підписки (Pub/Sub), що дозволяють оновлювати компоненти точково.

### Redux (та Redux Toolkit / RTK)

Світовий стандарт (Enterprise). Реалізує патерн Flux (Диспетчер -> Екшен -> Редюсер -> Стор).

- _Плюси:_ Незламна передбачуваність, строгий односпрямований потік (Actions), феноменальні інструменти розробника (Redux DevTools), стандартизована архітектура у великих командах.
- _Мінуси:_ Високий поріг входу (Boilerplate-код), хоча сучасний Redux Toolkit значно це спростив.

### Zustand

Модерн-стандарт. Мінімалістична бібліотека від творців Jotai та React Spring.

- _Плюси:_ Ніяких Провайдерів у дереві. Стан живе глобально в "хуку". Підтримує селектори з коробки (перерендер тільки при зміні конкретного поля об'єкта). Майже нульовий Boilerplate-код коду.
- _Приклад Zustand:_

```tsx
import create from "zustand";

const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}));

// У компоненті ми підписуємось ТІЛЬКИ на поле bears. Зміна інших полів цей компонент не зачепить!
const bears = useBearStore((state) => state.bears);
```

### MobX

Представник парадигми Observer/Observable (ближче до ООП). Використовує мутабельний підхід (всупереч філософії React), але завдяки Proxy-об'єктам під капотом працює блискавично швидко і магічним чином оновлює тільки те, що потрібно. Поступово втрачає популярність на користь Zustand/RTK через специфічність.

---

## Висновки

1. **Prop Drilling** порушує інкапсуляцію компонентів-посередників, змушуючи їх працювати інструментом транспортування бізнес-даних між далекими предками та нащадками.
2. **Context API** є нативним Dependency Injection рішенням. Воно позбавляє необхідності прокидувати пропси, дозволяючи компонентам напряму імпортувати значення через `useContext`.
3. Головним архітектурним недоліком Context API є примусовий рендеринг УСІХ підписників під час зміни поля `value`. Це робить Контекст непридатним для даних, що змінюються з високою частотою.
4. Патерн **Split Contexts** (розділення стану та методів його оновлення) є обов'язковим для оптимізації Context API у великих системах, щоб уникнути порушень Referential Equality на боці Провайдера.
5. Библіотеки управління станом (Redux, Zustand) концептуально відрізняються від Контексту. Вони переносять стан за межі дерева (Store) та реалізують точкову підписку через селектори, що забезпечує Enterprise-продуктивність і надійність складних взаємодій.

---

## Джерела

1. Офіційна документація React. "Passing Data Deeply with Context". URL: https://react.dev/learn/passing-data-deeply-with-context
2. React Docs. "Scaling Up with Reducer and Context". URL: https://react.dev/learn/scaling-up-with-reducer-and-context
3. Mark Erikson (Redux Maintainer). "Why React Context is Not a 'State Management' Tool". URL: https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
4. Redux Toolkit Documentation. URL: https://redux-toolkit.js.org/
5. Zustand Documentation (Pmndrs). URL: https://zustand-demo.pmnd.rs/
6. "How to use React Context effectively". Kent C. Dodds. URL: https://kentcdodds.com/blog/how-to-use-react-context-effectively
7. "React Hooks: Context and Performance". Sophie Alpert.
8. "Flux Architecture Summary". Facebook/Meta Engineering Blog.

---

## Запитання для самоперевірки

1. З точки зору інженерної зв'язності коду (Coupling), у чому полягає шкода патерну Prop Drilling при вкладеності понад 5 рівнів?
2. Поясніть на рівні алгоритму рендерингу (Re-rendering), чому передача інлайн-об'єкта `<Context.Provider value={{ data, setData }}>` є критичним антипатерном при масштабному застосуванні?
3. Яку саме проблему оптимізації вирішує архітектурний підхід Split Contexts (створення окремих `StateContext` та `DispatchContext`)?
4. Чому некоректно порівнювати React Context API та Redux як конкуруючі бібліотеки "State Management"?
5. Назвіть 3 реальні сценарії даних (use-cases) веб-додатку, для яких ідеально підходить Context API, і 2 сценарії (таблиці, ігри), де застосування Контексту призведе до катастрофічного падіння FPS.
