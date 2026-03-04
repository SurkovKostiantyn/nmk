# Лекція №14 (2 години). TypeScript у React: Типізація компонентів для інженерної надійності

## План лекції

1. Статична типізація проти Динамічної: Чому JS-розробники масово переходять на TypeScript.
2. Інтеграція TypeScript у React: Компіляція, Інтерфейси (Interfaces) та Типи (Types).
3. Сувора типізація Пропсів (Props): Відмова від `PropTypes` на користь TS.
4. Типізація локального стану (`useState` та `useReducer`): Дженерики (Generics) під капотом.
5. Обробка подій (Event Handling): Типи подій для форм, інпутів та кліків (`React.MouseEvent`, `React.ChangeEvent`).
6. Типізація посилань (`useRef`): Різниця між MutableRefObject та RefObject.
7. Розширені патерни: Успадкування пропсів стандартних HTML-елементів (`ComponentProps`).

## Перелік умовних скорочень

- **TS** (TypeScript) – надмножина мови JavaScript із суворою статичною типізацією.
- **JS** (JavaScript) – мова програмування з динамічною типізацією.
- **DOM** (Document Object Model) – об'єктна модель документа.
- **IDE** (Integrated Development Environment) – інтегроване середовище розробки (напр., VS Code).
- **JSX/TSX** – розширення синтаксису JavaScript/TypeScript для опису інтерфейсів.
- **HOC** (Higher-Order Component) – компонент вищого порядку.

## Вступ

Впровадження TypeScript у розробку React-додатків. Типізація пропсів, станів, подій та рефів. Переваги статичної типізації для великих команд та проєктів, що корелює з вимогами до якості ПЗ у комп’ютерних науках.

Сьогодні розробка Enterprise (корпоративних) веб-додатків мовою чистого, нетипізованого JavaScript вважається ознакою низької інженерної культури (Legacy-підхід). Динамічна типізація JS, яка історично дозволяла "швидко прототипувати", на масштабах команди з 5+ осіб перетворюється на неконтрольоване джерело багів (найвідоміший з яких: `Uncaught TypeError: Cannot read properties of undefined`).
**TypeScript** став галузевим стандартом, вирішуючи цю проблему на етапі написання коду. Підтримка TypeScript у React є еталонною. Ця лекція присвячена правилам типізації React-компонентів, хуків та подій браузера, що дозволяє створювати надійні (Bulletproof) інтерфейси та зводити до мінімуму Runtime-помилки (помилки під час виконання).

---

## 1. Статична типізація: Чому TypeScript переміг

JavaScript є мовою з динамічною слабкою типізацією. Тип змінної визначається не під час написання коду, а під час її обчислення рушієм браузера (V8/SpiderMonkey) у Runtime. Трансформація типів відбувається "на льоту" (наприклад, `"5" + 2` стає рядок `"52"`).

**Проблема JS у React:**
Якщо компонент очікує об'єкт `user` із полем `firstName`, а ми випадково передамо йому `firstName` з помилкою в назві ключа (`first_name`) чи взагалі `null`, браузер "впаде" з "Білим Екраном Смерті" (White Screen of Death) прямо на комп'ютері клієнта.

**Рішення TypeScript:**
TS додає етап **Компіляції (Transpilation)**. Він перевіряє всі типи у вашому коді в редакторі (IDE) до того, як код взагалі потрапить у браузер. Якщо типи не збігаються, програма просто не скомпілюється (Build Failed).
_Підсумок:_ TS переносить 80% багів з екрану клієнта безпосередньо в редактор розробника під час набору тексту.

---

## 2. Типізація Пропсів (Props): Interface vs Type

До ери TypeScript у світі React домінувала бібліотека `PropTypes`, яка перевіряла типи в Runtime (що марнотратно впливало на продуктивність). З TS `PropTypes` стали застарілими.

Для опису очікуваних параметрів компонента (Props) ми використовуємо `interface` або `type`. З архітектурної точки зору в React вони майже ідентичні, але створення `interface` є кращою практикою для об'єктів.

```tsx
// 1. Описуємо контракт (форму) пропсів
// Символ "?" означає, що поле опціональне (необов'язкове)
interface UserCardProps {
  id: number;
  name: string;
  isAdmin?: boolean;
  status: "online" | "offline" | "away"; // Union type (допустимі лише ці 3 значення)
}

// 2. Типізуємо параметри функції
const UserCard = ({ id, name, isAdmin = false, status }: UserCardProps) => {
  return (
    <div className={`card ${status}`}>
      <h2>
        {name} #{id}
      </h2>
      {isAdmin && <span className="badge">Admin</span>}
    </div>
  );
};
```

Якщо ви в іншій частині програми спробуєте використати `<UserCard name="Alex" />`, IDE підкреслить код червоним і відмовиться компілювати: `Помилка: відсутній обов'язковий пропс 'id' та 'status'`.

---

## 3. Типізація локального стану (`useState`)

Функція `useState` є так званою "Узагальненою функцією" (Type Generic) — вона приймає тип у кутових дужках `<T>`.

**Патерн 1: Автоматичне виведення (Type Inference)**
Якщо початкове значення примітивне (число, рядок, `true/false`), TypeScript володіє достатнім інтелектом, щоб вивести тип самостійно.

```tsx
const [count, setCount] = useState(0);
// TS знає, що count - це number.
// Якщо ми напишемо setCount('hello'), TS видасть помилку.
```

**Патерн 2: Явна типізація (Explicit Typing)**
Необхідна, коли початкове значення є `null`, пустим масивом `[]` або складним об'єктом, тип якого TS не може "вгадати" з порожнечі.

```tsx
interface User {
  id: string;
  email: string;
}

// Ми вказуємо, що стейт може бути АБО об'єктом User АБО null (Union Type)
const [currentUser, setCurrentUser] = useState<User | null>(null);

const handleLogin = (userData: User) => {
  setCurrentUser(userData); // Працює
  setCurrentUser({ id: "1" }); // Помилка: відсутнє поле email
};
```

Аналогічно типізується і `useReducer`, де ми строго описуємо структуру об'єкта `State` і лістинг всіх можливих варіантів дій (Action Discriminated Unions).

---

## 4. Обробка подій: `React.MouseEvent` та `React.ChangeEvent`

Типізація колбеків (функцій зворотного виклику) для обробки подій DOM — найскладніша тема для початківців у TS.
Події в React не є рідними подіями браузера (Native Events). React огортає їх у власну кросбраузерну абстракцію — **SyntheticEvent**. Тому тип події потрібно брати з об'єкта `React`.

### 1. Подія натискання (Mouse Events)

```tsx
// Обов'язково вказуємо <HTMLButtonElement>, щоб TS знав, по чому клікнули
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  console.log(event.currentTarget.name);
};

return (
  <button onClick={handleClick} name="submitBtn">
    Натисни
  </button>
);
```

### 2. Подія вводу з клавіатури (Form Events)

Найважливіший кейс — контрольовані інпути. Отримуючи значення `event.target.value`, TypeScript повинен бути впевнений, що це значення витягується саме з тегу `<input>` (оскільки `<div>` не має атрибута `value`).

```tsx
const [text, setText] = useState("");

// ChangeEvent типізується HTMLInputElement (або HTMLTextAreaElement для <textarea>)
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setText(event.target.value);
};

return <input type="text" value={text} onChange={handleChange} />;
```

_Лайфхак IDE:_ Якщо ви сумніваєтеся, який тип вказати, напишіть інлайн-функцію `onChange={(e) => ...}` прямо в JSX. Наведіть курсор миші на змінну `e`, і редактор VS Code (завдяки вбудованому серверу TypeScript) сам підкаже вам правильний тип.

---

## 5. Типізація `useRef`: Два обличчя Посилань

Хук `useRef` у React використовується для двох абсолютно різних задач, і TypeScript суворо вимагає правильної типізації для кожної з них (завдяки системі перевантаження функцій).

**Сценарій А: Зберігання мутабельного значення (Мутабельний Ref)**
Використовується як еквівалент змінних екземпляра класу. Ми зберігаємо там таймери або будь-які змінні, які не повинні викликати рендер при їх зміні.
_Правило типізації:_ Передаємо початкове значення, і воно визначає тип.

```tsx
// TS виведе MutableRefObject<number>. Властивість .current можна змінювати.
const timerId = useRef<number>(0);

useEffect(() => {
  timerId.current = window.setInterval(() => console.log("Tick"), 1000);
  return () => clearInterval(timerId.current);
}, []);
```

**Сценарій Б: Прямий доступ до DOM-елемента (Read-only Ref)**
До цього ми зверталися лише по закінченні монтування компонента.
_Правило типізації:_ Тип дженерика МАЄ бути відповідним HTML-елементом, а **початкове значення ОБОВ'ЯЗКОВО `null`**.

```tsx
// TS виведе RefObject<HTMLInputElement>. Додавання null забороняє мутації .current об'єкта
const inputRef = useRef<HTMLInputElement>(null);

const focusInput = () => {
  // Ми ставимо ?. (Optional Chaining), бо під час першого рендеру .current ще дорівнює null
  inputRef.current?.focus();
};

return <input ref={inputRef} />;
```

---

## 6. Успадкування пропсів (ComponentProps)

Часто виникає ситуація, коли ми створюємо власний компонент, наприклад, кастомну кнопку `<SubmitButton>`, яка повинна приймати всі ті самі параметри, що й звичайний тег `<button>` в HTML (`disabled`, `type`, `onClick`, `onBlur`), плюс кілька наших власних.
Писати цей інтерфейс вручну недоцільно. Ми використовуємо вбудовану утиліту TS — **`React.ComponentProps`** (або успадкування інтерфейсу).

```tsx
// Розширюємо (extends) інтерфейс нашого компонента всіма властивостями звичайної кнопки
interface CustomButtonProps extends React.ComponentProps<"button"> {
  isLoading?: boolean; // Додаємо наше власне кастомне поле
}

// За допомогою Rest-оператора (...restProps) збираємо всі параметри крім isLoading
const CustomButton = ({
  isLoading,
  children,
  ...restProps
}: CustomButtonProps) => {
  return (
    // Прокидаємо системні пропси на реальний DOM-вузол
    <button
      {...restProps}
      className="btn-primary"
      disabled={isLoading || restProps.disabled}
    >
      {isLoading ? "Завантаження..." : children}
    </button>
  );
};

// Використання (TS тепер дозволяє передати type і onMouseEnter):
<CustomButton type="submit" isLoading={true} onMouseEnter={() => alert(1)}>
  Зберегти
</CustomButton>;
```

Це патерн інкапсуляції, який створює враження, що розробник працює з нативними компонентами браузера (безперешкодний DX - Developer Experience).

---

## Висновки

1. Інтеграція TypeScript переводить розробку React-додатків з площини "сподівань" у площину "гарантій". Перевірка типів у Compile Time замінює собою необхідність писати масу юніт-тестів на перевірку існування властивостей об'єктів.
2. Інтерфейси (`interface`) діють як строгий контракт (Contract-driven Development). Якщо дочірній компонент вимагає `id` як число, TS не дозволить батьку передати його у вигляді рядка (`"1"`).
3. При типізації подій (`React.MouseEvent`, `React.ChangeEvent`) та посилань на DOM-вузли (`useRef<HTMLDivElement>`) ми делегуємо компілятору розуміння екосистеми браузера (DOM API), що робить процес ін'єкцій безпечним і забезпечує 100% автодоповнення (IntelliSense) коду.
4. Додаткове розуміння дженериків (Generics) у хуках `useState<T>` необхідне для коректної обробки відкладеного або асинхронного завантаження стейту (переходи зі стану `null` у стан повністю заповненого Об'єкта).
5. Використання архітектури спадкування пропсів (`ComponentProps`) є базовим патерном при створенні надійних "Дизайн-систем" рівня UI-бібліотек, коли кастомний компонент безшовно інтегрує свої вимоги з нативними вимогами HTML-стандартів.

---

## Джерела

1. Офіційний довідник "Типізація React". URL: https://react.dev/learn/typescript
2. TypeScript Handbook. "Everyday Types". URL: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
3. "React TypeScript Cheatsheet". Колекція найкращих практик (Community Driven). URL: https://react-typescript-cheatsheet.netlify.app/
4. "How to type React Hooks". Web Bos Blog.
5. "Understanding React.FC and why you shouldn't use it" (Глибокий архітектурний розбір відмови від React.FC). URL: https://kentcdodds.com/blog/how-to-write-a-react-component-in-typescript
6. MDN Web Docs. "TypeScript Documentation" (Розділи про Generics та Interfaces).
7. "TypeScript for React Developers". Frontend Masters Course Platform.

---

## Запитання для самоперевірки

1. Чому парадигма перевірки типів у Runtime (наприклад, через бібліотеку `PropTypes` або ручні перевірки `typeof x === 'string'` всередині рендеру) програє концепції Compile-time перевірки (через TypeScript) при розгортанні великих Production-додатків?
2. Опишіть правила типізації хука `useState` у ситуаціях, коли початкове значення є порожнім об'єктом, і коли воно є скалярним(примітивним) значенням `0`. В якому з випадків TypeScript потребує явного вказування типу `<T>` і чому?
3. В екосистемі обробки подій React існує тип `React.ChangeEvent<HTMLInputElement>`. Поясніть з інженерної точки зору, чому розробники React не дозволяють просто написати рідний тип браузера `Event`, і що означає префікс `Synthetic` в об'єкті події.
4. В чому полягає фундаментальна різниця типізації між зберіганням setInterval Id і зберіганням прямого доступу до HTML вузла інпута в хуку `useRef`? (Підказка: роль початкового значення `null`).
5. Уявіть, що ви розробляєте власну бібліотеку UI-компонентів. Навіщо вам використовувати тип `React.ComponentProps<'input'>` під час створення кастомного текстового поля `<AppInput/>`, в яке обгорнутий нативний HTML-тег? Яку архітектурну проблему вирішує цей патерн?
