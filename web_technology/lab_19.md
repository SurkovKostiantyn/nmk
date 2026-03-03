# Лабораторне заняття №19 (2 години). Управління глобальним станом кошика (Context API).

## Мета

Опанувати управління глобальним станом додатку в React без нескінченної передачі пропсів вниз по дереву (Prop Drilling). Створити `CartContext`, який буде зберігати масив куплених товарів, і надати доступ до нього будь-якому компоненту (наприклад, `Header` для лічильника та `CheckoutPage` для підрахунку суми).

## План

1. Створення файлу `CartContext.jsx`.
2. Використання `createContext()` для ініціалізації контексту.
3. Написання `CartProvider` (компонента-обгортки) зі стейтом `[cart, setCart]`.
4. Реалізація функцій-помічників всередині провайдера (`addToCart`, `removeFromCart`, `clearCart`).
5. Обгортання додатку в `<CartProvider>` у `main.jsx`.
6. Отримання даних у `Header` та `ProductCard` через хук `useContext`.

## Хід роботи

**Увага:** Продовжуємо роботу в проекті "TechShop". У нас вже є сторінки та роутінг. Але якщо ви додасте товар на сторінці `Home`, індикатор у `Header` про це не дізнається (бо вони не мають спільного батьківського `useState`). Тут нам і допоможе Context API.

1. **Створення файлу Контексту:**
   - У папці `src` створіть теку `context` (поруч з `pages` та `components`).
   - Створіть файл `src/context/CartContext.jsx`.
   - Заімпортуйте необхідні хуки: `import { createContext, useState, useContext } from 'react';`

2. **Ініціалізація та Провайдер:**
   - Створіть сам контекст:
     ```jsx
     export const CartContext = createContext(); // Пустий контекст
     ```
   - Напишіть компонент `CartProvider`, який буде "постачальником" даних:

     ```jsx
     export function CartProvider({ children }) {
       // Наш глобальний масив кошика (схоже ми робили в ПР №10 на чистому JS)
       const [cart, setCart] = useState([]);

       // Функція для кнопки "Купити"
       const addToCart = (product) => {
         setCart((prevCart) => {
           // Шукаємо, чи є вже такий товар
           const existingItem = prevCart.find((item) => item.id === product.id);
           if (existingItem) {
             // Збільшуємо кількість
             return prevCart.map((item) =>
               item.id === product.id
                 ? { ...item, quantity: item.quantity + 1 }
                 : item,
             );
           }
           // Якщо товару немає, додаємо новий з quantity: 1
           return [...prevCart, { ...product, quantity: 1 }];
         });
       };

       return (
         // Передаємо стейт cart та функцію addToCart всім "дітям"
         <CartContext.Provider value={{ cart, addToCart }}>
           {children}
         </CartContext.Provider>
       );
     }
     ```

3. **Огортання всього додатку:**
   - Відкрийте вхідний файл `src/main.jsx`.
   - Імпортуйте `<CartProvider>` та обгорніть ним ваш `<App />` (можна просто всередині або зовні `<BrowserRouter>`).

     ```jsx
     import { CartProvider } from "./context/CartContext";

     createRoot(document.getElementById("root")).render(
       <StrictMode>
         <BrowserRouter>
           {/* Тепер АБСОЛЮТНО всі компоненти мають доступ до кошика! */}
           <CartProvider>
             <App />
           </CartProvider>
         </BrowserRouter>
       </StrictMode>,
     );
     ```

4. **Використання контексту (Додавання товарів):**
   - Відкрийте компонент `ProductCard.jsx`.
   - Імпортуйте хук `useContext` та сам список `CartContext`.
   - Витягніть функцію `addToCart`:

     ```jsx
     import { useContext } from "react";
     import { CartContext } from "../context/CartContext";

     export function ProductCard({ title, price, image, id }) {
       // Переконайтеся, що id теж передається в пропсах!

       // Підключаємося до глобального провайдера
       const { addToCart } = useContext(CartContext);

       // Функція-обгортка для кліку
       const handleBuyClick = () => {
         // Передаємо ВЕСЬ об'єкт товару
         addToCart({ id, title, price, image });
         alert(`${title} додано в кошик!`);
       };

       return (
         <article className="product-card">
           {/* ... */}
           <button className="btn btn-buy" onClick={handleBuyClick}>
             Купити
           </button>
         </article>
       );
     }
     ```

5. **Оновлення Лічильника в Header:**
   - Відкрийте `Header.jsx`.
   - Аналогічно використайте `useContext`, але витягніть масив `cart`:

     ```jsx
     import { useContext } from "react";
     import { CartContext } from "../context/CartContext";
     import { Link } from "react-router-dom";

     export function Header() {
       const { cart } = useContext(CartContext);

       // Рахуємо сумарну кількість усіх одиниць товарів (reduce)
       const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

       return (
         <header className="header">
           <div className="logo">
             <Link to="/">TechShop React</Link>
           </div>
           <div className="user-actions">
             <Link to="/checkout" className="btn btn-cart">
               Кошик <span>({totalItems})</span>
             </Link>
           </div>
         </header>
       );
     }
     ```

6. **Збереження (Commit & Push):**
   - Перевірте: кліки по товарах на сторінці `Home` миттєво змінюють цифру в кошику у `Header`. Навіть після переходу на сторінку `/checkout` цифра зберігається (бо контекст живе в `main.jsx`, вище за `Routes`).
   - Виконайте `git add .` та `git commit -m "Implement Global Cart State using React Context API"`.
   - Запушіть та злийте в `main`.

## Результат

Проблема "Prop Drilling" ефективно вирішена. Вам більше не потрібно передавати масив кошика через 10 проміжних файлів у React. Дані живуть в ізольованому глобальному сховищі (Контексті) в пам'яті комп'ютера.

## Контрольні питання

1. Вкажіть причину, через яку виникла концепція "Prop Drilling". Що відбувається, коли компонент глибини #5 в ієрархії хоче отримати дані, які існують у стані компонента глибини #1?
2. Що таке `children` у визначенні провайдера контексту (`function CartProvider({ children })`)? Куди цей тег монтується і нащо він нам потрібен?
3. Опишіть значення ключового слова `value` в компоненті `<CartContext.Provider value={{ cart, addToCart }}>`. Чи можна передати в нього звичайний масив, рядок, число, об'єкт або функцію?
4. Який React-хук дозволяє будь-якому компоненту зв'язатися з провайдером і отримати доступ до його `value`?
5. Чому функція `handleBuyClick` у `ProductCard` викликає `addToCart` як звичайну функцію (з круглими дужками), а не просто передається на подію `onClick={addToCart}`?

