# Практичне заняття №15 (2 години). Побудова ієрархії компонентів (React).

## Мета

Перенести верстку інтернет-магазину зі старого ванільного проекту у новий React-додаток (створений у ПР №14 за допомогою Vite). Навчитися декомпозувати UI (ділити інтерфейс на незалежні шматочки) та передавати дані через `props`.

## План

1. Створення папки `components`.
2. Створення компонента `Header.jsx`.
3. Створення компонента `ProductCard.jsx` з використанням `props`.
4. Створення компонента `ProductList.jsx`.
5. Передача Mock-даних (масиву товарів) з `App.jsx` вниз по дереву.

## Хід роботи

**Увага:** Ми знаходимося у новому проекті на базі React + Vite. Ваш старий `index.html` залишився в минулому, ми переносимо його суть у компоненти.

1. **Архітектура папок:**
   - Всередині папки `src` створіть папку `components`.
   - Скопіюйте ваш старий `style.css` у папку `src` (замініть існуючий `index.css`) і переконайтеся, що він підключений в `main.jsx`.

2. **Компонент Header:**
   - Створіть файл `src/components/Header.jsx`.
   - Напишіть базову функцію, яка повертає HTML вашої шапки. У React слово `class` замінюється на `className`!
     ```jsx
     export function Header() {
       return (
         <header className="header">
           <div className="logo">TechShop React</div>
           <nav className="main-nav">
             <ul>
               <li>
                 <a href="#">Головна</a>
               </li>
             </ul>
           </nav>
           <div className="user-actions">
             <button className="btn btn-cart">
               Кошик <span>(0)</span>
             </button>
           </div>
         </header>
       );
     }
     ```

3. **Компонент Картки Товару (з Props):**
   - Створіть `src/components/ProductCard.jsx`.
   - Цей компонент має бути "дурним" — він просто малює те, що йому дали. Дані він отримує через аргумент `props` (або деструктурований об'єкт).
     ```jsx
     export function ProductCard({ title, price, image }) {
       return (
         <article className="product-card">
           <img src={image} alt={title} style={{ maxWidth: "100%" }} />
           <h3>{title}</h3>
           <p className="price">{price} грн</p>
           <button className="btn btn-buy">Купити</button>
         </article>
       );
     }
     ```

4. **Компонент Списку та Рендеринг (App.jsx):**
   - Відкрийте головний файл `App.jsx`. Видаліть звідти демо-вміст Vite.
   - Створіть там демо-масив `products` (як ви робили у ПР №9).
   - Відобразіть `Header` та відрендерете список карток за допомогою `.map()`:

     ```jsx
     import { Header } from "./components/Header";
     import { ProductCard } from "./components/ProductCard";

     const mockProducts = [
       {
         id: 1,
         title: "Телефон",
         price: 10000,
         image: "https://via.placeholder.com/150",
       },
       {
         id: 2,
         title: "Ноутбук",
         price: 30000,
         image: "https://via.placeholder.com/150",
       },
     ];

     function App() {
       return (
         <div className="app-container">
           <Header />
           <main className="page-layout">
             <h2>Популярні товари</h2>
             {/* Контейнер сітки */}
             <div className="products-grid">
               {/* Рендеринг */}
               {mockProducts.map((product) => (
                 <ProductCard
                   key={product.id}
                   title={product.title}
                   price={product.price}
                   image={product.image}
                 />
               ))}
             </div>
           </main>
         </div>
       );
     }

     export default App;
     ```

5. **Збереження (Commit & Push):**
   - Перевірте роботу в браузері (`npm run dev`). Сайт повинен виглядати як старий, але тепер він розбитий на логічні React-компоненти.
   - У вашому репозиторії створіть коміт `Migrate TechShop UI to React components`.

## Результат

Проєкт перенесено на сучасний фреймворк. Замість "локшини" коду в одному HTML-файлі, ми маємо чітку структуру `компонент = файл`, що дозволяє легко перевикористовувати `ProductCard` будь-де.

## Контрольні питання

1. Чому ми пишемо `className` замість `class` у JSX-файлах React? На що перетворюється JSX під капотом під час збірки?
2. Яка роль слова `key` під час використання `.map()` у React (наприклад `key={product.id}`) і чому React видає "червону" помилку в консолі, якщо його не вказати?
3. Поясніть концепцію `props`. Чи може дочірній компонент (напр. `ProductCard`) самостійно змінити свою назву (властивість `title`), передану йому від батька?
4. Звідки береться об'єкт з властивостями `title`, `price`, `image` у функції `function ProductCard({ title, price, image })`? Як цей синтаксис називається у JS?
5. Чому ми маємо імпортувати компоненти (через `import`) перед тим, як вставляти як `<Header />` у файл `App.jsx`? Як JS дізнається їхнє місцезнаходження?
