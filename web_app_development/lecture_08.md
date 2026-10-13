# Лекція 8 (2 години). Події, обробка форм, Zod-валідація та React 19 Form Actions

## План лекції

- 1. Система синтетичних подій (SyntheticEvent): кросбраузерна обгортка, пул подій та делегування на корені дерева;
- 2. Керовані (Controlled) проти некерованих (Uncontrolled) компонентів: аналіз продуктивності та прямий доступ через `useRef`;
- 3. Архітектура обробки форм у великих застосунках: інтеграція некерованого підходу React Hook Form;
- 4. Декларативні схеми валідації за допомогою Zod: статичне виведення типів (`z.infer`), парсинг та метод `.refine()`;
- 5. Нова парадигма форм у React 19: стандартизація Form Actions, автоматичне скидання та обробка нативних форм;
- 6. Сучасні хуки React 19 для роботи з діями: `useActionState`, `useFormStatus` та оптимістичний UI з `useOptimistic`.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **vDOM** (Virtual Document Object Model) — віртуальна об'єктна модель документа;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **RSC** (React Server Components) — серверні компоненти React.

## Вступ

Форми є головним каналом взаємодії користувача з веб-додатком: від простих полів пошуку до багатоетапних майстрів реєстрації, фінансових транзакцій та редакторів контенту. Проте обробка користувацького вводу традиційно була однією з найскладніших зон у фронтенд-розробці через необхідність синхронізації DOM-стану інпутів, відстеження помилок валідації, індикації завантаження та боротьби з надлишковими ререндерами.

У цій лекції розглядається система синтетичних подій React, порівнюються керований та некерований підходи до побудови форм, демонструється декларативна валідація за допомогою бібліотек Zod та React Hook Form, а також детально аналізується революція стандарту React 19: Form Actions, хуки `useActionState`, `useFormStatus` та оптимістичні оновлення з `useOptimistic`.

---

## 1. Система синтетичних подій (SyntheticEvent)

У нативному браузерному JavaScript робота з подіями часто ускладнювалася розбіжностями між браузерами (наприклад, різні назви полів події клавіатури в старих версіях Safari та Chrome).

### Що таке SyntheticEvent?

Коли ви передаєте обробник події у React (наприклад, `onClick={(e) => handleClick(e)}`), параметр `e` є не нативним браузерним об'єктом `MouseEvent`, а екземпляром **SyntheticEvent**:
- кросбраузерна обгортка - React надає єдиний, стандартизований за специфікацією W3C інтерфейс події, що працює абсолютно ідентично в усіх браузерах та платформах;
- доступ до нативної події - якщо розробнику потрібен оригінальний об'єкт браузера, він доступний через властивість `e.nativeEvent`;
- методи керування потоком - методи `e.preventDefault()` (скасування стандартної поведінки браузера, наприклад, відправки форми) та `e.stopPropagation()` (зупинка спливання події) працюють у звичному режимі.

### Механізм глобального делегування подій (Event Delegation)

Якщо ви рендерите список із 10 000 кнопок і на кожну вішаєте `onClick`, чи додає React 10 000 окремих слухачів подій у браузер?
**Ні!**
Починаючи з версії React 17:
- React реєструє **один єдиний обробник кожного типу події** на кореневому DOM-вузлі застосунку (`document.getElementById('root')`);
- коли користувач клікає по конкретній кнопці, нативна подія браузера спливає (Bubbling) до кореня `#root`;
- React перехоплює цю подію, визначає за деревом Virtual DOM, через які компоненти вона пройшла, формує синтетичну подію `SyntheticEvent` та викликає відповідні функції-обробники;
- це забезпечує колосальну економію оперативної пам'яті та високу швидкість обробки динамічних списків.

---

## 2. Керовані (Controlled) проти некерованих (Uncontrolled) компонентів

В інженерії React існують дві фундаментальні парадигми роботи з елементами форм (`<input>`, `<select>`, `<textarea>`).

### Керовані компоненти (Controlled Components)

У керованому компоненті стан поля введення повністю підпорядкований стану React (`useState`):

```tsx
export function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

Як це працює:
- єдине джерело правди (Single Source of Truth) — значення інпуту завжди дорівнює змінній `value`;
- коли користувач натискає клавішу, спрацьовує `onChange`, викликається `setValue`, компонент рендериться наново, і в інпут записується новий символ.

Переваги: миттєвий доступ до значення при кожному натисканні клавіші, легкість реалізації масок вводу (наприклад, телефонного номера) та миттєвої валідації.
Недоліки: **ререндеринг компонента на кожен натиск клавіші**. Якщо форма містить 50 полів та важкі підкомпоненти, інтерфейс починає підгальмовувати.

### Некеровані компоненти (Uncontrolled Components) та хук `useRef`

У некерованому компоненті значення інпуту зберігається безпосередньо у внутрішньому DOM-вузлі браузера. React не зберігає це значення у своєму стані і не рендериться під час введення тексту.

Доступ до поточного значення здійснюється за допомогою хука **`useRef`**:

```tsx
import { useRef } from 'react';

export function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Читаємо значення з DOM лише в момент відправки:
    console.log('Введене значення:', inputRef.current?.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" ref={inputRef} defaultValue="Початкове значення" />
      <button type="submit">Відправити</button>
    </form>
  );
}
```

Переваги: нульові ререндери під час набору тексту, максимальна швидкість взаємодії (60 FPS навіть на дуже слабких смартфонах).

---

## 3. Архітектура обробки форм: бібліотека React Hook Form

Спроба писати складні форми з десятками полів на чистому `useState` перетворюється на громіздкий код: необхідно вручну створювати стан для значень, стан для помилок, стан для прапорця відвідування поля (`isTouched`) та функцію перевірки.

Індустріальним стандартом є бібліотека **React Hook Form (RHF)**:
- базується на **некерованих компонентах**: підключає інпути через рефи, не викликаючи ререндерів під час набору тексту;
- забезпечує мінімальний розмір коду та високу продуктивність;
- безшовно інтегрується з будь-якими схемами валідації через адаптери (`@hookform/resolvers`).

Встановлення бібліотеки:

```bash
npm install react-hook-form
```

Базовий приклад роботи з React Hook Form:

```tsx
import { useForm, SubmitHandler } from 'react-hook-form';

interface FormValues {
  email: string;
  age: number;
}

export function SimpleRHFForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log('Дані форми:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Email:</label>
        <input {...register('email', { required: "Email обов'язковий" })} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <button type="submit">Зберегти</button>
    </form>
  );
}
```

---

## 4. Декларативні схеми валідації за допомогою Zod

Ручна валідація через оператори `if (email.length < 5)` або розрізнені регулярні вирази є джерелом вразливостей та помилок узгодження типів.

Сучасний підхід інженерії полягає у використанні бібліотеки **Zod** (Schema Validation):
- схема описується один раз у декларативному стилі;
- з цієї схеми TypeScript автоматично виводить точні статичні типи через `z.infer<typeof schema>`;
- схема валідує дані на клієнті і може повторно використовуватися на бекенді (Node.js/Next.js).

Встановлення Zod та резолвера для React Hook Form:

```bash
npm install zod @hookform/resolvers
```

### Складання комплексної схеми валідації

```typescript
import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Ім'я користувача має містити щонайменше 3 символи")
      .max(20, "Ім'я не може перевищувати 20 символів"),
    email: z
      .string()
      .email('Введіть коректну адресу електронної пошти'),
    age: z
      .coerce.number() // Автоматичне приведення рядка з інпуту до числа
      .min(18, 'Вам має бути не менше 18 років'),
    password: z
      .string()
      .min(8, 'Пароль має містити щонайменше 8 символів')
      .regex(/[A-Z]/, 'Пароль повинен містити хоча б одну велику літеру')
      .regex(/[0-9]/, 'Пароль повинен містити хоча б одну цифру'),
    confirmPassword: z.string(),
  })
  // Кастомне правило для перевірки збігу паролів:
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Паролі не збігаються',
    path: ['confirmPassword'], // Прив'язка помилки до конкретного поля
  });

// Автоматичне виведення TypeScript типу з Zod-схеми:
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Інтеграція Zod у React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from './schemas';

export function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Гарантовано типізовані та провалідовані дані!
    await fetch('/api/register', { method: 'POST', body: JSON.stringify(data) });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} placeholder="Нікнейм" />
      {errors.username && <p>{errors.username.message}</p>}

      <input {...register('email')} type="email" placeholder="Email" />
      {errors.email && <p>{errors.email.message}</p>}

      <input {...register('password')} type="password" placeholder="Пароль" />
      {errors.password && <p>{errors.password.message}</p>}

      <input {...register('confirmPassword')} type="password" placeholder="Повторіть пароль" />
      {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Реєстрація...' : 'Зареєструватися'}
      </button>
    </form>
  );
}
```

---

## 5. Нова парадигма форм у React 19: Form Actions

У версії React 19 архітектура роботи з формами зазнала фундаментальної трансформації: React повернувся до витоків нативних веб-стандартів, інтегрувавши підтримку **Actions (Дій)** прямо в ядро бібліотеки.

### Що таке Form Action?

Раніше кожна форма починалася з обов'язкового boilerplate-коду:
`<form onSubmit={(e) => { e.preventDefault(); ... }}>`.

У React 19 нативний тег `<form>` отримує вбудовану підтримку пропу `action`, який може приймати асинхронну функцію:

```tsx
export function React19Form() {
  async function updateProfile(formData: FormData) {
    // React автоматично пакує всі поля форми в об'єкт FormData:
    const name = formData.get('userName');
    await fetch('/api/user', { method: 'POST', body: JSON.stringify({ name }) });
  }

  // Більше не потрібен onSubmit та e.preventDefault()!
  return (
    <form action={updateProfile}>
      <input type="text" name="userName" required />
      <button type="submit">Оновити</button>
    </form>
  );
}
```

Переваги Form Actions:
- автоматичне формування `FormData` з атрибутів `name` інпутів;
- автоматичне очищення форми після успішного виконання дії;
- безшовна сумісність із Server Actions у середовищі Next.js (виконання мутації без створення API-ендпоінтів).

---

## 6. Сучасні хуки React 19: `useActionState`, `useFormStatus` та `useOptimistic`

Для керування життєвим циклом дій React 19 представляє набір спеціалізованих хуків.

### Хук `useActionState`

Хук `useActionState` керує станом результату асинхронної дії (попередній стан, помилки, статус завантаження):

```tsx
import { useActionState } from 'react';

async function updateNameAction(previousState: { error: string | null }, formData: FormData) {
  const name = formData.get('name') as string;
  if (name.length < 3) {
    return { error: "Ім'я занадто коротке" };
  }
  await sendToServer(name);
  return { error: null };
}

export function NameEditor() {
  // state — результат виконання дії, formAction — обгортка для пропу action, isPending — прапорець виконання
  const [state, formAction, isPending] = useActionState(updateNameAction, { error: null });

  return (
    <form action={formAction}>
      <input name="name" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Збереження...' : 'Зберегти'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### Хук `useFormStatus`

Часто кнопку відправки форми виносять в окремий компонент (наприклад, `<SubmitButton />`), і передавати в неї стан `isPending` через пропси незручно.
Хук `useFormStatus` дозволяє будь-якому дочірньому компоненту всередині `<form>` дізнатися статус відправки батьківської форми:

```tsx
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  // Автоматично зчитує статус батьківської форми!
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Обробка запиту...' : 'Підтвердити'}
    </button>
  );
}
```

### Хук `useOptimistic` для миттєвого відгуку UI (Optimistic UI)

У класичних інтерфейсах користувач натискає "Поставити лайк" і чекає 500 мс, поки сервер поверне відповідь 200 OK.
Патерн **Optimistic UI** оновлює інтерфейс **негайно**, не чекаючи сервера. Якщо ж сервер повертає помилку, інтерфейс автоматично відкочується назад.

У React 19 це реалізується за допомогою хука `useOptimistic`:

```tsx
import { useOptimistic } from 'react';

export function LikeWidget({ likes, onLikeAction }: { likes: number; onLikeAction: () => Promise<void> }) {
  // optimisticLikes змінюється миттєво при виклику setOptimisticLikes
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    likes,
    (current, update: number) => current + update
  );

  async function handleLike() {
    setOptimisticLikes(1); // Інтерфейс оновлюється за 0 мс!
    await onLikeAction();  // Серверний запит іде у фоні
  }

  return (
    <form action={handleLike}>
      <button type="submit">❤️ {optimisticLikes}</button>
    </form>
  );
}
```

---

## Висновки

- синтетичні події - React стандартизує обробку подій за допомогою єдиної обгортки SyntheticEvent та глобального делегування на корені `#root`, що заощаджує ресурси пам'яті;
- вибір архітектури форми - керовані компоненти надають максимальний контроль, проте некерований підхід з `useRef` (і бібліотекою React Hook Form) забезпечує найвищу продуктивність без зайвих ререндерів;
- строгість схем Zod - використання декларативних схем валідації з автоматичним виведенням статичних типів гарантує відсутність невалідних даних у системі;
- нова парадигма React 19 - проп `action` на формах скасовує необхідність написання ручних обробників `e.preventDefault()`, переводячи роботу з даними на нативний стандарт `FormData`;
- набір хуків дій - зв'язка `useActionState`, `useFormStatus` та `useOptimistic` утворює повний сучасний інструментарій для створення швидких, доступних та відмовостійких інтерфейсів.

---

## Рекомендована література та джерела

- офіційна документація React: реагування на події - https://react.dev/learn/responding-to-events;
- посібник React 19: робота з діями у формах - https://react.dev/reference/react-dom/components/form;
- документація бібліотеки валідації Zod - https://zod.dev/;
- офіційна документація React Hook Form - https://react-hook-form.com/;
- опис хука useOptimistic у документації React 19 - https://react.dev/reference/react/useOptimistic.

---

## Запитання для самоперевірки

- що таке SyntheticEvent у React і чому пряме використання нативних обробників подій замінюється глобальним делегуванням на корені;
- у чому полягає фундаментальна різниця між керованими (Controlled) та некерованими (Uncontrolled) інпутами з точки зору продуктивності;
- яку архітектурну проблему вирішує інтеграція бібліотеки React Hook Form у формах із великою кількістю полів;
- як метод `.refine()` у бібліотеці Zod дозволяє валідувати взаємозалежні поля форми (наприклад, підтвердження пароля);
- які переваги надає використання пропу `action` у тегу `<form>` у React 19 порівняно з класичним обробником `onSubmit`;
- як хук `useOptimistic` дозволяє реалізувати патерн Optimistic UI без написання складного коду ручного відкочування стану?
