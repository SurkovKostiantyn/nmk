# Лабораторне заняття №18 (2 години). Створення багатосторінкового додатку (React Router).

## Мета

Перетворити односторінковий додаток (SPA) на багатосторінковий інтернет-магазин. Навчитися встановлювати маршрутизатор `react-router-dom`, налаштовувати шляхи до сторінок (Головна, Кошик/Оформлення) та безпечно переходити між ними за допомогою компонента `<Link>` без стирання глобального стану додатку.

## План

1. Встановлення пакету `react-router-dom` через `npm`.
2. Огортання додатку в `<BrowserRouter>`.
3. Створення компонентів-сторінок (Pages): `Home.jsx` та `CheckoutPage.jsx`.
4. Налаштування маршрутизації за допомогою `<Routes>` та `<Route>`.
5. Зміна звичайних тегів `<a>` на компоненти `<Link to="...">`.

## Хід роботи

**Увага:** Продовжуємо роботу в проекті "TechShop" (React). До цього моменту весь наш код жив у одному файлі `App.jsx`, який стає занадто великим. Пора навести лад в архітектурі.

1. **Встановлення Бібліотеки:**
   - Відкрийте термінал у вашому VS Code (переконайтеся, що ви знаходитесь у папці з React-додатком).
   - Виконайте команду: `npm install react-router-dom`.
   - Запустіть сервер розробки: `npm run dev`.

2. **Підготовка структури сторінок (Pages):**
   - Усередині папки `src` створіть папку `pages`.
   - Створіть файл `src/pages/Home.jsx`. Перенесіть туди **ВЕСЬ ВМІСТ** малювання карток товарів та завантаження через `fetch()` з вашого старого `App.jsx` (переконайтеся, що ви імпортували `useEffect`, `useState` та `ProductCard`).

     ```jsx
     // src/pages/Home.jsx
     import { useState, useEffect } from "react";
     import { ProductCard } from "../components/ProductCard";

     export function Home() {
       const [products, setProducts] = useState([]);
       // ... логіка fetchProducts() з ПР17

       return (
         <main className="page-layout">
           <h2>Популярні товари</h2>
           {/* ... Ваш мапинг карток */}
         </main>
       );
     }
     ```

   - Створіть файл `src/pages/CheckoutPage.jsx`. Всередину нього помістіть заголовок та вашу форму (її ми створювали у папці компонентів у ПР №16).

     ```jsx
     // src/pages/CheckoutPage.jsx
     import { CheckoutForm } from "../components/CheckoutForm";

     export function CheckoutPage() {
       return (
         <main className="page-layout">
           <h2>Оформлення замовлення</h2>
           <CheckoutForm />
         </main>
       );
     }
     ```

3. **Огортання Додатку в Маршрутизатор:**
   - Відкрийте головний вхідний файл `src/main.jsx`.
   - Імпортуйте `<BrowserRouter>` та обгорніть ним `<App />`.

     ```jsx
     import { BrowserRouter } from "react-router-dom";

     createRoot(document.getElementById("root")).render(
       <StrictMode>
         <BrowserRouter>
           <App />
         </BrowserRouter>
       </StrictMode>,
     );
     ```

4. **Налаштування Маршрутів у `App.jsx`:**
   - Відкрийте `App.jsx` (він у нас тепер майже порожній).
   - Імпортуйте ваші сторінки та компоненти `<Routes>`, `<Route>` з `react-router-dom`.
   - Встановіть `Header` поверх змінної частини екрану:

     ```jsx
     // src/App.jsx
     import { Routes, Route } from "react-router-dom";
     import { Header } from "./components/Header";
     import { Home } from "./pages/Home";
     import { CheckoutPage } from "./pages/CheckoutPage";

     function App() {
       return (
         <div className="app-container">
           {/* Header висить на ВСІХ сторінках */}
           <Header />

           {/* А тут контент змінюється залежно від адреси (URL) */}
           <Routes>
             <Route path="/" element={<Home />} />
             <Route path="/checkout" element={<CheckoutPage />} />

             {/* Можна додати сторінку 404 */}
             <Route
               path="*"
               element={
                 <main>
                   <h2>Сторінка не знайдена</h2>
                 </main>
               }
             />
           </Routes>
         </div>
       );
     }
     export default App;
     ```

5. **Навігація без перезавантаження (`Link`):**
   - Відкрийте `src/components/Header.jsx`.
   - Якщо ви залишите старий код `<a href="/checkout">Кошик</a>`, то під час кліку ब्राउзер перезавантажить сторінку повністю (моргне екран, всі стани React зітруться).
   - Імпортуйте `<Link>` та замініть звичайні посилання.

     ```jsx
     import { Link } from "react-router-dom";

     export function Header() {
       return (
         <header className="header">
           {/* Повернення на головну */}
           <div className="logo">
             <Link to="/">TechShop React</Link>
           </div>

           <div className="user-actions">
             {/* Перехід на оформлення */}
             <Link to="/checkout" className="btn btn-cart">
               Кошик
             </Link>
           </div>
         </header>
       );
     }
     ```

6. **Збереження (Commit & Push):**
   - Перевірте в браузері: клікніть по кнопці Кошик (URL зміниться на `/checkout`, форма з'явиться), і клікніть на Логотип (повернення на `/`). Екран НЕ ПОВИНЕН кліпати (біліти)!
   - Виконайте `git add .` та `git commit -m "Configure React Router dom with Home and Checkout pages"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

Додаток здобув багаторівневу структуру. Завдяки React Router ми "симулюємо" перехід по багатосторінковому сайту, хоча фізично користувач не завантажував жодного нового HTML-файлу з сервера (суть підходу SPA - Single Page Application).

## Контрольні питання

1. Чому ми застосували компонент `<Link to="...">` замість стандартного `<a href="...">`? Що таке "гаряча підміна DOM" (Virtual DOM) під час переходу між сторінками?
2. Для чого потрібно обгортати весь додаток `<App />` у `<BrowserRouter>` всередині файлу `main.jsx`? Звідки Router дізнається поточний шлях?
3. Яке значення має компонент `<Routes>` усередині `App.jsx` і навіщо ми ставимо `<Header />` ВИЩЕ від `<Routes>` (на одному рівні з ним)?
4. Поясніть маршрут `<Route path="*" />`. Для чого слугує зірочка?
5. Напишіть через кому, які компоненти ви повинні імпортувати у файлі сторінки з `react-router-dom`, щоб працювала стандартна конфігурація з переліку маршрутів.

