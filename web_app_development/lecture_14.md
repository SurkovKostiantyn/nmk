# Лекція 14 (2 години). Клієнтська маршрутизація у SPA: React Router 7 та TanStack Router

## План лекції

- 1. Принципи клієнтської маршрутизації у Single Page Application: робота браузерного History API;
- 2. Архітектура React Router 7: декларативні маршрути, вкладені лейаути та компонент підстановки `Outlet`;
- 3. Робота з динамічними сегментами URL (`useParams`) та рядком параметрів запиту (`useSearchParams`);
- 4. Програмна та декларативна навігація: компоненти `Link`, `NavLink` та хук `useNavigate`;
- 5. Захищені маршрути (Protected Routes) та реалізація авторизаційного бар'єра;
- 6. Нова парадигма типобезпечної маршрутизації: можливості та переваги TanStack Router.

## Перелік умовних скорочень

- **UI** (User Interface) — користувацький інтерфейс;
- **DOM** (Document Object Model) — об'єктна модель документа браузера;
- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **SPA** (Single Page Application) — односторінковий веб-додаток;
- **URL** (Uniform Resource Locator) — уніфікований покажчик місцезнаходження ресурсу;
- **HTML** (HyperText Markup Language) — мова розмітки гіпертексту.

## Вступ

У класичних багатосторінкових веб-сайтах (MPA) перехід за будь-яким посиланням викликав синхронний HTTP-запит до сервера, повне очищення вікна браузера та повторне завантаження всіх ресурсів (HTML, стилів, скриптів). Це супроводжувалося неприємним білим спалахом екрана та втратою поточного стану інтерфейсу.

Односторінкові додатки (SPA) вирішують цю проблему за допомогою **клієнтської маршрутизації (Client-Side Routing)**. При зміні адреси сторінки браузер більше не звертається до сервера за новим HTML-файлом. Натомість внутрішній маршрутизатор на базі JavaScript перехоплює зміну URL, синхронізує її з історією переходів та динамічно монтує потрібні компоненти в дерево DOM.

У цій лекції розглядаються низькорівневі механізми браузерного `History API`, аналізується сучасна архітектура флагманської бібліотеки React Router 7 (із вкладеними лейаутами та захищеними маршрутами), а також демонструється новий індустріальний стандарт строго типізованої маршрутизації — TanStack Router.

---

## 1. Принципи клієнтської маршрутизації та браузерний History API

Для того щоб змінювати URL-адресу без перезавантаження веб-сторінки, сучасні браузери надають об'єкт `window.history` та механізм HTML5 History API.

### Ключові методи History API

- `history.pushState(state, title, url)` — додає новий запис у стек історії браузера та змінює URL в адресному рядку без перезавантаження сторінки;
- `history.replaceState(state, title, url)` — замінює поточний запис у стеку історії без створення нового кроку "Назад";
- подія `popstate` — виникає, коли користувач натискає кнопки браузера "Назад" або "Вперед". Маршрутизатор підписується на цю подію для синхронізації UI зі зміненою адресою.

### Чому кліку по звичайному тегу `<a href="...">` недостатньо?

Звичайний клік по гіперпосиланню `<a href="/dashboard">` запускає стандартну поведінку браузера: надсилання запиту на сервер і перезавантаження документа.

Клієнтський маршрутизатор надає спеціальний компонент `Link`, який:
- перехоплює нативну подію кліку (`event.preventDefault()`);
- перевіряє модифікатори клавіш (наприклад, відкриття у новій вкладці через `Ctrl+Click` або `Cmd+Click`);
- викликає `history.pushState` для миттєвої зміни URL;
- сповіщає дерево компонентів React про необхідність перерендерити відповідний маршрут.

---

## 2. Архітектура React Router 7: декларативні та вкладені маршрути

React Router 7 є стандартом де-факто для маршрутизації в клієнтському React. Сучасна версія підтримує створення роутера за допомогою функції `createBrowserRouter`.

### Конфігурація кореневого роутера

```tsx
// src/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'catalog',
        element: <CatalogPage />,
      },
      {
        path: 'catalog/:productId',
        element: <ProductDetailsPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### Вкладені маршрути (Nested Routes) та компонент `Outlet`

Головна архітектурна перевага React Router — підтримка вкладених маршрутів. Замість дублювання спільних елементів (шапка, сайдбар, футер) на кожній сторінці, спільна розмітка виносяться в компонент-лейаут (`RootLayout`).

Компонент `<Outlet />` виступає динамічним слотом (плейсхолдером), всередині якого монтується активний дочірній маршрут:

```tsx
// src/layouts/RootLayout.tsx
import { Outlet, NavLink } from 'react-router-dom';

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Головна
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => (isActive ? 'active-link' : '')}>
          Каталог товарів
        </NavLink>
      </header>

      <main className="main-content">
        {/* Сюди автоматично рендериться HomePage, CatalogPage або ProductDetailsPage */}
        <Outlet />
      </main>

      <footer className="footer">
        <p>© 2026 DevFlow Platform</p>
      </footer>
    </div>
  );
}
```

При навігації між сторінками `RootLayout` **ніколи не розмонтовується**, що зберігає стан сайдбара, фонової музики або відкритого чату підтримки.

---

## 3. Робота з параметрами URL: `useParams` та `useSearchParams`

Адресний рядок містить два типи динамічних даних: параметри шляху та параметри запиту (Query Strings).

### 3.1. Динамічні сегменти шляху через `useParams`

Сегменти шляху з двокрапкою (наприклад, `:productId`) позначають динамічні змінні. Хук `useParams` дістає їх у вигляді об'єкта рядкових ключів:

```tsx
// src/pages/ProductDetailsPage.tsx
import { useParams } from 'react-router-dom';

interface RouteParams {
  productId: string;
}

export function ProductDetailsPage() {
  const { productId } = useParams<keyof RouteParams>() as RouteParams;

  return (
    <div className="product-details">
      <h2>Деталі товару #{productId}</h2>
      <p>Завантаження специфікацій продукту...</p>
    </div>
  );
}
```

### 3.2. Рядок пошукових параметрів через `useSearchParams`

Параметри запиту (`?search=macbook&page=2&sort=asc`) ідеально підходять для збереження стану фільтрів, сортування та пагінації. Вони дозволяють користувачам ділитися посиланням на точний стан сторінки.

Хук `useSearchParams` працює подібно до `useState`, повертаючи поточні параметри (`URLSearchParams`) та функцію їхнього оновлення:

```tsx
// src/pages/CatalogPage.tsx
import { useSearchParams } from 'react-router-dom';
import { ChangeEvent } from 'react';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || 'all';

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchParams((prev) => {
      if (value) {
        prev.set('q', value);
      } else {
        prev.delete('q');
      }
      return prev;
    });
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Фільтр товарів..."
        value={searchQuery}
        onChange={handleSearchChange}
      />
      <p>Активний фільтр: {searchQuery || 'Всі товари'}</p>
      <p>Категорія: {currentCategory}</p>
    </div>
  );
}
```

---

## 4. Програмна та декларативна навігація

Керування переходами здійснюється як через користувацькі кліки, так і програмно з коду.

### Порівняння компонентів `Link` та `NavLink`

- `<Link to="/path">` — стандартний компонент для переходів;
- `<NavLink to="/path">` — спеціалізоване посилання з підтримкою перевірки активного стану. Приймає функцію у пропси `className` та `style`, надаючи прапорець `isActive` для підсвічування поточного пункту навігаційного меню.

### Програмне перенаправлення через `useNavigate`

Хук `useNavigate` повертає функцію, яка дозволяє переходити на інші сторінки після виконання бізнес-логіки (наприклад, після успішного збереження форми або кліку на кнопку скасування):

```tsx
import { useNavigate } from 'react-router-dom';

export function CheckoutButton() {
  const navigate = useNavigate();

  const handleCompleteOrder = async () => {
    // 1. Виконуємо транзакцію
    await submitOrder();

    // 2. Програмно спрямовуємо на сторінку підтвердження
    navigate('/order/success', { replace: true });
  };

  return <button onClick={handleCompleteOrder}>Оформити замовлення</button>;
}
```

Опція `{ replace: true }` замінює поточний запис у стеку історії, що запобігає повторній відправці оплати при натисканні користувачем кнопки браузера "Назад".

---

## 5. Захищені маршрути (Protected Routes) та авторизаційний бар'єр

Багато веб-додатків мають закриті розділи (особистий кабінет, панель адміністратора, налаштування облікового запису), доступні лише після проходження автентифікації.

### Реалізація компонента-охоронця `ProtectedRoute`

Для реалізації захисту створюється компонент вищого рівня, який перевіряє статус сесії користувача. Якщо користувач не авторизований, він перенаправляється на сторінку входу за допомогою `<Navigate />`:

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface ProtectedRouteProps {
  requiredRole?: 'user' | 'admin';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Зберігаємо поточну адресу в state, щоб повернути користувача сюди після логіну
    return <Navigate to="/login" state={ { from: location } } replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Якщо перевірки пройдені, рендеримо дочірній маршрут
  return <Outlet />;
}
```

### Підключення захищених маршрутів у конфігурації роутера

```tsx
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'unauthorized', element: <ForbiddenPage /> },
      
      // Захищена зона для авторизованих користувачів
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },

      // Спеціальна захищена зона лише для адміністраторів
      {
        element: <ProtectedRoute requiredRole="admin" />,
        children: [
          { path: 'admin/analytics', element: <AdminAnalyticsPage /> },
        ],
      },
    ],
  },
]);
```

---

## 6. Нова парадигма типобезпечної маршрутизації: TanStack Router

Незважаючи на популярність React Router, його класичний підхід має суттєвий недолік — **відсутність суворої типізації шляхів та параметрів**:

- адреси вказуються звичайними рядками (`<Link to="/products/123">`);
- опечатка в рядку шляху (`/prducts/123`) виявляється лише в браузері під час виконання (404 Not Found);
- типи параметрів `useParams` повертають `string | undefined`, що вимагає ручного приведення типів.

### Бібліотека TanStack Router

**TanStack Router** — це найсучасніший маршрутизатор нового покоління, створений з акцентом на 100% Type Safety та файлову структуру:

- автоматична генерація типів — маршрутизатор автоматично генерує типи TypeScript на основі файлової структури або конфігурації;
- автокомпліт посилань — під час набору `<Link to="...">` TypeScript підказує доступні адреси;
- типізовані параметри запиту — параметри пошуку валідуються за допомогою Zod-схем, автоматично перетворюючись із рядків на числа та булеві значення;
- вбудоване попереднє завантаження (Prefetching) — завантаження даних маршруту ще до того, як користувач клікнув по посиланню (наприклад, при наведенні курсора).

TanStack Router швидко стає стандартом у високотехнологічних великих Enterprise-проєктах, де надійність типів стоїть на першому місці.

---

## Висновки

- механізм History API - клієнтська маршрутизація працює на базі методів `pushState` та `replaceState`, змінюючи адресу сторінки без перевантаження документа браузером;
- вкладена маршрутизація та лейаути - компонент `<Outlet />` у React Router дозволяє ізолювати спільні інтерфейсні панелі від розмонтування при навігації;
- робота з динамічними даними адреси - параметри сегментів шляху читаються через `useParams`, а фільтри та пагінація синхронізуються через `useSearchParams`;
- програмне керування навігацією - хук `useNavigate` дозволяє реалізувати переходи за подіями завершення бізнес-процесів із можливістю заміни стека історії;
- архітектура авторизаційного бар'єра - компоненти-охоронці `ProtectedRoute` захищають приватні секції додатку та запам'ятовують адресу для повернення;
- типобезпечна маршрутизація нового покоління - бібліотека TanStack Router вирішує проблему рядкових помилок шляхів, забезпечуючи повну типізацію параметрів та посилань.

---

## Рекомендована література та джерела

- офіційна документація React Router 7 - https://reactrouter.com/;
- керівництво з вкладених маршрутів та лейаутів - https://reactrouter.com/en/main/start/concepts#nested-routes;
- документація типобезпечного маршрутизатора TanStack Router - https://tanstack.com/router/latest;
- опис браузерного стандарту History API на MDN - https://developer.mozilla.org/en-US/docs/Web/API/History_API;
- патерн реалізації Protected Routes у React Router - https://ui.dev/react-router-protected-routes-and-authentication.

---

## Запитання для самоперевірки

- яка принципова різниця між переходами за звичайним HTML-тегом `<a>` та компонентом `<Link>` у Single Page Application;
- як метод `history.pushState` змінює поведінку стеку переходів браузера;
- яку архітектурну роль виконує компонент `<Outlet />` у вкладених лейаутах React Router;
- у яких практичних сценаріях дані слід зберігати в URL-параметрах `useSearchParams`, а не в локальному стані `useState`;
- чим компонент `NavLink` відрізняється від звичайного компонента `Link`;
- як за допомогою хука `useLocation` та компонента `<Navigate />` організувати повернення користувача на вихідну сторінку після успішної авторизації;
- які переваги надає строга типізація маршрутів у бібліотеці TanStack Router порівняно з класичним рядковим підходом.
