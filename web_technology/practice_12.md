# Практичне заняття №12 (2 години). Створення інтерактивних елементів (модальні вікна).

## Мета

Навчитися працювати з об'єктною моделлю документа (DOM) для створення динамічних інтерфейсів. Реалізувати повноцінне "Модальне вікно" кошика покупок, яке відкриватиметься поверх контенту сайту при натисканні на кнопку кошика в навігації.

## План

1. Створення HTML-розмітки модального вікна та фону-затемнення (Overlay).
2. Завдання стилів для абсолютного позиціювання модалки по центру екрану (`position: fixed`, `z-index`).
3. Написання JS-логіки для відкриття вікна (модифікація класів через `classList.add`).
4. Написання JS-логіки для закриття вікна (кнопка "Х" або клік по фону).
5. Рендеринг товарів з масиву `cart` всередину списку в модальному вікні.

## Хід роботи

**Увага:** Продовжуємо роботу над інтернет-магазином "TechShop". В нас вже є кнопка кошика в Header (з ПР №7) і масив `cart` (з ПР №10), але досі ми виводили суму лише в консоль. Час показати її користувачеві візуально.

1. **HTML Розмітка (Модальне вікно):**
   - У файл `index.html`, одразу ПЕРЕД закриваючим тегом `</body>`, додайте структуру модалки:

     ```html
     <!-- Темний напівпрозорий фон, який перекриває весь сайт -->
     <div class="modal-overlay hidden" id="cartOverlay">
       <!-- Саме біле вікно кошика по центру -->
       <div class="modal-window">
         <div class="modal-header">
           <h2>Ваш Кошик</h2>
           <button class="close-btn" id="closeCartBtn">&times;</button>
         </div>

         <!-- Тут JS малюватиме додані товари -->
         <div class="cart-items" id="cartItemsContainer">
           <p>Кошик порожній.</p>
         </div>

         <div class="modal-footer">
           <h3>Разом: <span id="cartTotalSum">0</span> грн</h3>
           <!-- Посилання на нашу форму оформлення з ПР №6 -->
           <a href="checkout.html" class="btn btn-primary" id="checkoutBtn"
             >Оформити замовлення</a
           >
         </div>
       </div>
     </div>
     ```

2. **CSS Оформлення (`style.css`):**
   - Задайте стилі для Overlay (`position: fixed`, щоб він не прокручувався разом зі сторінкою) та віконця по центру (через `display: flex; align-items: center` або `transform`):

     ```css
     .modal-overlay {
       position: fixed;
       top: 0;
       left: 0;
       right: 0;
       bottom: 0;
       background-color: rgba(0, 0, 0, 0.5); /* Напівпрозорий чорний */
       display: flex;
       justify-content: center;
       align-items: center;
       z-index: 1000; /* Вікно поверх усього іншого на сторінці */
       transition: opacity 0.3s ease;
     }
     .modal-window {
       background: #fff;
       padding: 2rem;
       border-radius: 8px;
       width: 90%;
       max-width: 500px;
       max-height: 80vh;
       overflow-y: auto; /* Дозволяємо скролити список всередині вікна, якщо багато товарів */
       box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
     }
     .close-btn {
       background: transparent;
       border: none;
       font-size: 1.5rem;
       cursor: pointer;
     }

     /* Утиліта приховування, якщо ви ще не створили її в ПР №11 */
     .hidden {
       display: none !important;
       opacity: 0;
     }
     ```

3. **JS Логіка Модалки (`main.js`):**
   - Знайдіть ваші кнопки та оверлей:

     ```javascript
     const cartButton = document.querySelector(".btn-cart"); // Ваша кнопка в Header з SVG (ПР №7)
     const cartOverlay = document.getElementById("cartOverlay");
     const closeBtn = document.getElementById("closeCartBtn");

     // Функція відкриття
     function openCartModal() {
       cartOverlay.classList.remove("hidden");
       renderCartItems(); // Оновлюємо список перед тим як показати
     }

     // Функція закриття
     function closeCartModal() {
       cartOverlay.classList.add("hidden");
     }

     // Вішаємо слухачі
     cartButton.addEventListener("click", openCartModal);
     closeBtn.addEventListener("click", closeCartModal);

     // Закриття кліком по темному фону (оверлею) повз вікно
     cartOverlay.addEventListener("click", (event) => {
       if (event.target === cartOverlay) {
         closeCartModal();
       }
     });
     ```

4. **Рендеринг товарів у Модалці (`renderCartItems`):**
   - В кінці вашої функції `updateUI()` з ПР №10, або в окремій функції `renderCartItems()`, переберіть масив `cart` і створіть HTML для КОЖНОГО товару в кошику (картинка, назва, ціна, та кнопки "плюс"/"мінус"). Вставте цей рядок у `<div id="cartItemsContainer">`.
   - Оновіть цифру `<span id="cartTotalSum">` за допомогою виклику вашої старої функції обчислення `calculateTotal()`.

5. **Збереження (Commit & Push):**
   - Додайте декілька товарів. Відкрийте кошик. Ви маєте побачити красиве спливаюче вікно з реальним переліком обраного.
   - Виконайте `git add .` та `git commit -m "Implement interactive Cart Modal"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

У проектах з'явилася складна взаємодія з DOM. Інтернет-магазин став відчуватися як повноцінний додаток: кошик працює поверх сторінки, плавно з'являється і зникає, та візуалізує всі бізнес-операції.

## Контрольні питання

1. Чому ми застосували до модального вікна `position: fixed;`, а не `position: absolute;`? Що сталося б, якби модалка була відкритою, а користувач прокрутив (просролив) сторінку вниз?
2. Яка CSS властивість відповідає за те, щоб модальне вікно знаходилося "ближче" до глядача (перекривало інші елементи `header`, `z-index` тощо)?
3. Який ключовий метод об'єкта `classList` (в JavaScript) дозволяє швидко додавати або забирати клас `.hidden` у відповідь на подію кліку без написання `if...else`? (Підказка: є метод `add`, `remove`, та `?`)
4. Для чого ми написали перевірку `if (event.target === cartOverlay)` у функції закриття фону? Що сталося б без цієї перевірки, якби користувач клікнув просто на саме біле вікно з товаром?
5. Згадайте тег `setTimeout`. Якщо ми хочемо зробити модалку не тільки display: none, але й плавно прозорою (`opacity`), як JS і таймери можуть допомогти в організації анімації CSS?
