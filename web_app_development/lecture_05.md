# Лекція 5 (2 години). Потік даних: Props, Children, типізація та патерни композиції компонентів

## План лекції

- 1. Односпрямований потік даних (One-Way Data Flow): топологія дерева та сувора незмінність пропсів (Read-Only);
- 2. Деструктуризація, значення за замовчуванням та rest-пропси: чистий синтаксис передачі параметрів;
- 3. Спеціальний проп `children`: інверсія контролю та розробка компонентів-обгорток;
- 4. Патерни компонентної композиції: Slot-патерн та підхід Render Props;
- 5. Патерн Compound Components (компоненти-складки): створення гнучких інтерфейсів на прикладі табів та акордеонів;
- 6. Подолання проблеми прокидання пропсів (Prop Drilling): архітектурна композиція проти передчасного глобального стану.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **props** (properties) — вхідні властивості та параметри компонента;
- **vDOM** (Virtual Document Object Model) — віртуальна об'єктна модель документа;
- **FSD** (Feature-Sliced Design) — архітектурна методологія організації коду;
- **HTML** (HyperText Markup Language) — мова розмітки гіпертексту.

## Вступ

Компонентна архітектура React будується навколо взаємодії та обміну даними між окремими будівельними блоками інтерфейсу. Головним інструментом цієї взаємодії є механізм **Props (властивостей)**. На відміну від класичних об'єктно-орієнтованих систем із розгалуженим двостороннім зв'язуванням, React пропонує жорстку та передбачувану модель: дані рухаються виключно в одному напрямку.

У цій лекції розглядається математична модель потоку даних у дереві компонентів, пояснюється концепція інверсії контролю через проп `children`, демонструються класичні та сучасні патерни композиції (Slot-патерн, Compound Components) та наводяться практичні прийоми запобігання надмірному прокиданню пропсів (Prop Drilling) без використання важких стейт-менеджерів.

---

## 1. Односпрямований потік даних: топологія дерева та незмінність пропсів

Однією з головних причин високої надійності коду в React є концепція **One-Way Data Flow (односпрямованого потоку даних)**.

### Топологія дерева та рух даних

У React компоненти утворюють строгу ієрархію дерева (Component Tree):
- дані завжди рухаються виключно **згори донизу** (від батьківського компонента до дочірніх) за допомогою передачі властивостей (`props`);
- дочірній компонент ніколи не може передати дані безпосередньо своєму сусіду (sibling-компоненту) або батьківському компоненту без прямої згоди останнього;
- якщо дочірньому компоненту необхідно сповістити батька про подію (наприклад, клік на кнопку чи введення тексту), батьківський компонент передає вниз **функцію зворотного виклику (Callback Function)**;
- дочірній компонент викликає цей колбек, а батьківський компонент приймає рішення про зміну власного стану.

```
       [ Батьківський компонент (State) ]
                 |               ^
     Props (дані)|               | Callbacks (події)
                 v               |
       [ Дочірній компонент A ]  [ Дочірній компонент B ]
```

Переваги односпрямованого потоку даних:
- передбачуваність та ізоляція помилок - якщо дані в інтерфейсі відображаються некоректно, розробнику достатньо рухатися вгору по дереву, щоб знайти джерело проблеми;
- відсутність прихованих побічних ефектів - жоден компонент не може несподівано змінити внутрішні змінні іншого компонента.

### Принцип чистоти: пропси є Read-Only

У React діє фундаментальне правило: **компоненти повинні поводитися як чисті функції щодо своїх пропсів**.

Це означає, що пропси є незмінними (**Immutable / Read-Only**). Спроба змінити проп всередині компонента є грубою помилкою:

```tsx
// ГРУБА ПОМИЛКА (МУТАЦІЯ ПРОПСІВ):
interface UserCardProps {
  user: { name: string; age: number };
}

export function UserCard({ user }: UserCardProps) {
  // КАТЕГОРИЧНО ЗАБОРОНЕНО:
  user.age = user.age + 1; // Мутація вихідного об'єкта зламає стан батька

  return <div>{user.name}: {user.age}</div>;
}
```

Чому мутація пропсів ламає додаток?
У JavaScript об'єкти та масиви передаються за посиланням. Якщо дочірній компонент мутує властивість переданого об'єкта, він непомітно змінює стан у батьківському компоненті в обхід механізмів React. React не дізнається про факт зміни, Virtual DOM не запустить повторний рендеринг, і система опиниться у стані розсинхронізації.

---

## 2. Деструктуризація, значення за замовчуванням та Rest-пропси

Сучасний синтаксис JavaScript/TypeScript дозволяє зробити опис пропсів лаконічним і самодокументованим.

### Патерн деструктуризації у параметрах функції

Замість постійного звернення до об'єкта `props.title`, `props.variant`, використовується деструктуризація безпосередньо у списку аргументів:

```tsx
interface AlertProps {
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'error'; // Опціональний проп
  onClose?: () => void;
}

export function Alert({
  title,
  message,
  variant = 'info', // Значення за замовчуванням
  onClose,
}: AlertProps) {
  return (
    <div className={`alert alert-${variant}`}>
      <h4>{title}</h4>
      <p>{message}</p>
      {onClose && <button onClick={onClose}>×</button>}
    </div>
  );
}
```

### Використання оператора Rest (`...restProps`)

При створенні універсальних UI-компонентів часто виникає потреба прокинути нативні атрибути HTML (наприклад, `id`, `disabled`, `aria-*`, `data-*`) на внутрішній тег без ручного перерахування кожного атрибута:

```tsx
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function CustomInput({ label, error, className, ...restProps }: CustomInputProps) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input
        className={`input-field ${error ? 'input-error' : ''} ${className ?? ''}`}
        {...restProps} // Прокидає type, placeholder, value, onChange, disabled тощо
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
```

---

## 3. Спеціальний проп `children`: інверсія контролю

Спеціальний проп `children` — це основа побудови гнучких та повторно використовуваних інтерфейсів у React.

### Що таке `props.children`?

Коли ви передаєте вміст між відкриваючим та закриваючим тегами компонента, React автоматично збирає цей вміст і передає його всередину компонента під зарезервованим ім'ям `children`:

```tsx
<Modal title="Підтвердження">
  <p>Ви впевнені, що бажаєте видалити цей файл?</p>
  <button>Підтвердити</button>
</Modal>
```

Всередині компонента `Modal` дочірні елементи доступні як `props.children`:

```tsx
interface ModalProps {
  title: string;
  children: React.ReactNode;
}

export function Modal({ title, children }: ModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <header className="modal-header">
          <h3>{title}</h3>
        </header>
        <div className="modal-body">
          {children} {/* Контент підставляється сюди */}
        </div>
      </div>
    </div>
  );
}
```

### Архітектурний принцип інверсії контролю (Inversion of Control)

Використання `children` реалізує фундаментальний принцип інженерії програмного забезпечення — **Inversion of Control (IoC)**:
- компонент `Modal` більше не повинен знати, що саме знаходиться всередині нього — простий текст, складна форма реєстрації чи відеопрогравач;
- відповідальність за внутрішній контент делегується компоненту вищого рівня;
- компонент `Modal` фокусується виключно на своїй зоні відповідальності: затемненні екрана, центруванні вікна та кнопці закриття.

---

## 4. Патерни компонентної композиції: Slot-патерн та Render Props

Іноді одного пропу `children` недостатньо: коли компонент має складну структуру (наприклад, шапку сторінки, лівий сайдбар, футер), контент потрібно вставляти у кілька різних місць.

### Slot-патерн (Іменовані слоти)

У React немає спеціального тегу `<slot>`, як у Vue чи Web Components. Замість цього використовуються звичайні типізовані пропси, значенням яких є JSX-елементи або `React.ReactNode`:

```tsx
interface AppLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode; // Основний робочий контент
  footer?: React.ReactNode;
}

export function AppLayout({ header, sidebar, children, footer }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <header className="layout-header">{header}</header>
      <div className="layout-body">
        {sidebar && <aside className="layout-sidebar">{sidebar}</aside>}
        <main className="layout-content">{children}</main>
      </div>
      {footer && <footer className="layout-footer">{footer}</footer>}
    </div>
  );
}
```

Використання слотів у клієнтському коді:

```tsx
<AppLayout
  header={<NavigationMenu user={currentUser} />}
  sidebar={<FilterSidebar categories={allCategories} />}
  footer={<Copyright year={2026} />}
>
  <ProductGrid items={products} />
</AppLayout>
```

### Патерн Render Props

**Render Props** — це техніка передачі функції через пропси, яка дозволяє компоненту динамічно передавати свій внутрішній стан дочірньому рендереру:

```tsx
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode;
}

export function MouseTracker({ render }: MouseTrackerProps) {
  const [pos, setPos] = React.useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      {render(pos)}
    </div>
  );
}

// Використання:
<MouseTracker
  render={({ x, y }) => (
    <p>Координати курсора: X: {x}, Y: {y}</p>
  )}
/>
```

Хоча з появою кастомних хуків потреба у Render Props для шарингу поведінки зменшилася, цей патерн залишається незамінним для віртуалізованих списків (TanStack Virtual) та складних компонентів форм.

---

## 5. Патерн Compound Components (компоненти-складки)

**Compound Components** — це патерн проєктування інтерфейсів, у якому група пов'язаних компонентів працює як єдине ціле, неявно розділяючи стан між собою (за аналогією до нативних тегів HTML `<select>` та `<option>`).

### Чому мега-пропси (Prop-Pocalypse) є антипатерном?

Якщо намагатися створити компонент вкладки (Tabs) за допомогою одного монолітного компонента, він перетворюється на хаос із пропсів:

```tsx
// АНТИПАТЕРН: МОНОЛІТНИЙ КОМПОНЕНТ ІЗ ДЕСЯТКАМИ ПРОПСІВ
<Tabs
  tabsData={items}
  activeTab={1}
  renderHeaderItem={(tab) => ...}
  tabHeaderClassName="..."
  onTabChange={() => ...}
  disabledTabIds={[2, 3]}
/>
```

### Реалізація Compound Components через React Context

Патерн компонентів-складок дозволяє отримати чистий декларативний синтаксис:

```tsx
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Акаунт</TabsTrigger>
    <TabsTrigger value="password">Пароль</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Налаштування профілю...</TabsContent>
  <TabsContent value="password">Зміна пароля...</TabsContent>
</Tabs>
```

Реалізація архітектури:

```tsx
import React, { createContext, useContext, useState } from 'react';

// 1. Створення ізольованого контексту
interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

// 2. Батьківський контейнер Tabs
export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={ { activeTab, setActiveTab } }>
      <div className="tabs-root">{children}</div>
    </TabsContext.Provider>
  );
}

// 3. Дочірній компонент TabsList
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="tabs-list">{children}</div>;
}

// 4. Дочірній компонент TabsTrigger
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;
  return (
    <button
      className={`tab-trigger ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// 5. Дочірній компонент TabsContent
export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div className="tab-content">{children}</div>;
}
```

Переваги Compound Components:
- гнучкість верстки - споживач компонента може міняти порядок вкладок, додавати між ними власні іконки, текст чи розділювачі;
- чистота API - кожен дочірній компонент має лише власні релевантні пропси.

---

## 6. Подолання проблеми прокидання пропсів (Prop Drilling)

**Prop Drilling (прокидання пропсів)** — це ситуація, коли дані передаються через кілька проміжних компонентів виключно для того, щоб дістатися до глибоко вкладеного нащадка, хоча проміжні компоненти цими даними взагалі не користуються.

```
App (має user)
  └── Page (user не потрібен, але прокидає далі)
        └── Main (user не потрібен, але прокидає далі)
              └── Header (user не потрібен, але прокидає далі)
                    └── UserAvatar (використовує user.avatarUrl)
```

### Чому не варто одразу впроваджувати глобальний стейт (Redux / Zustand)?

Коли розробники стикаються з Prop Drilling на 2–3 рівні, вони часто передчасно підключають важкі глобальні сховища.
Це призводить до проблем:
- розмивання локальності стану - дані, які потрібні лише одній сторінці, стають глобальними;
- погіршення читабельності - складно відстежити, хто і коли змінює стан.

### Рішення через композицію компонентів (Lifting Component / Slot Pattern)

У більшості випадків проблему Prop Drilling можна вирішити звичайною декомпозицією та використанням пропу `children`:

```tsx
// ДО РЕФАКТОРИНГУ (ПРОКИДАННЯ ПРОПСІВ):
function Page({ user }) {
  return <PageLayout user={user} />;
}
function PageLayout({ user }) {
  return <Header user={user} />;
}
function Header({ user }) {
  return <UserAvatar user={user} />;
}

// ПІСЛЯ РЕФАКТОРИНГУ ЧЕРЕЗ КОМПОЗИЦІЮ (ЧИСТИЙ КОД):
function Page({ user }) {
  // Створюємо аватар безпосередньо у Page і передаємо готовий елемент у слот!
  return (
    <PageLayout
      header={
        <Header>
          <UserAvatar user={user} />
        </Header>
      }
    />
  );
}
```

Тепер компоненти `PageLayout` та `Header` взагалі не знають про існування об'єкта `user`. Вони просто рендерять слоти. Проблема Prop Drilling усунена повністю без жодного рядка сторонніх стейт-менеджерів.

---

## Висновки

- односпрямований потік даних - сувора топологія зверху-вниз гарантує передбачуваність та виключає хаотичні циклічні залежності в системі;
- незмінність пропсів - пропси є Read-Only; мутація переданих об'єктів або масивів руйнує узгодженість стану та заборонена в React;
- гнучкість через `children` - спеціальний проп `children` реалізує принцип інверсії контролю (IoC), перетворюючи жорсткі компоненти на універсальні контейнери;
- патерни декомпозиції - Slot-патерн дозволяє організувати кілька іменованих точок вставки у складних лейаутах;
- архітектура Compound Components - поєднання контексту та дочірніх компонентів надає декларативний, гнучкий та інтуїтивний інтерфейс для складних UI-систем (Tabs, Accordion, Select);
- усунення Prop Drilling через композицію - перш ніж впроваджувати глобальні менеджери стану, слід перевірити можливість вирішення проблеми за допомогою композиції компонентів та пропу `children`.

---

## Рекомендована література та джерела

- офіційна документація React: передача пропсів компонентам - https://react.dev/learn/passing-props-to-a-component;
- посібник React: композиція проти наслідування - https://legacy.reactjs.org/docs/composition-vs-inheritance.html;
- стаття Kent C. Dodds "Compound Components with React Hooks" - https://kentcdodds.com/blog/compound-components-with-react-hooks;
- стаття Robin Wieruch "React Component Composition" - https://www.robinwieruch.de/react-component-composition/;
- дослідження Martin Fowler "Inversion of Control Containers and the Dependency Injection pattern" - https://martinfowler.com/articles/injection.html.

---

## Запитання для самоперевірки

- чому потік даних у React називається односпрямованим і як дочірній компонент сповіщає батьківський про подію;
- чому в React суворо заборонено прямо мутувати об'єкти, отримані через `props`;
- у чому полягає архітектурна суть принципу інверсії контролю (Inversion of Control) при використанні пропу `children`;
- як за допомогою звичайних пропсів реалізувати Slot-патерн для багатосекційного макета (Header, Sidebar, Footer);
- яку проблему розв'язує патерн Compound Components і як компоненти-складки обмінюються даними між собою;
- як техніка компонентної композиції дозволяє вирішити проблему Prop Drilling без використання Context API або сторонніх стейт-менеджерів?
