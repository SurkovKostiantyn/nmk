# Практичне заняття №11 (2 години) Робота з таймерами та симуляція мережевих затримок.

## Мета

Опанувати асинхронність у JavaScript. Навчитися працювати з таймерами (`setTimeout`, `setInterval`) та об'єктом `Promise` для симуляції завантаження даних (товарів) "із сервера". Створити візуальний індикатор завантаження (Spinner/Loader).

## План

1. Створення функції затримки `delay(ms)` на базі `Promise`.
2. Огортання синхронного масиву `products` в асинхронну функцію `fetchProducts()`.
3. Додавання HTML/CSS-компонента Spinner (завантажувача).
4. Управління станом UI (показ/сховання Spinner'а під час "завантаження").
5. Обробка можливих помилок за допомогою блоку `try...catch`.

## Хід роботи

**Увага:** Продовжуємо вдосконалювати "TechShop". У реальному житті товари не лежать у змінній `main.js`, вони приходять з бази даних через інтернет, що займає час (від 100 мс до кількох секунд). Користувач не повинен бачити порожній екран.

1. **Створення Spinner (Завантажувача):**
   - У вашому `index.html`, всередині контейнера `.products-grid` (або перед ним), додайте HTML-код для спінера:
     ```html
     <div class="loader-container" id="loader">
       <div class="spinner"></div>
       <p>Завантаження товарів...</p>
     </div>
     ```
   - У `style.css` додайте стилі та CSS-анімацію обертання:
     ```css
     .loader-container {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       padding: 3rem;
     }
     .spinner {
       width: 40px;
       height: 40px;
       border: 4px solid #f3f3f3;
       border-top: 4px solid var(--primary-color);
       border-radius: 50%;
       animation: spin 1s linear infinite;
     }
     @keyframes spin {
       0% {
         transform: rotate(0deg);
       }
       100% {
         transform: rotate(360deg);
       }
     }
     /* Клас для приховування */
     .hidden {
       display: none !important;
     }
     ```

2. **Симуляція Сервера (Promise):**
   - У `main.js` ви маєте масив `const products = [...]` та одразу його рендерите.
   - Створіть функцію `fetchProducts`, яка повертатиме `Promise` і штучно затримуватиме віддачу масиву на 1.5 секунди (використайте `setTimeout`):
     ```javascript
     function fetchProducts() {
       return new Promise((resolve, reject) => {
         setTimeout(() => {
           // Штучно симулюємо успішну відповідь від сервера
           resolve(products);

           // Можна також симулювати помилку розкоментувавши рядок нижче:
           // reject(new Error("Не вдалося підключитися до бази даних"));
         }, 1500); // 1.5 секунди затримки
       });
     }
     ```

3. **Асинхронний Рендеринг (async/await):**
   - Змініть ваш старий синхронний код відображення товарів.
   - Створіть асинхронну функцію `initShop()`, яка викличе `fetchProducts`:

     ```javascript
     async function initShop() {
       const loader = document.getElementById("loader");
       const container = document.querySelector(".products-grid");

       // 1. Показуємо спінер (він і так видимий по замовчуванню, але переконаємось)
       loader.classList.remove("hidden");
       container.innerHTML = ""; // Очищаємо сітку

       try {
         // 2. ЧЕКАЄМО 1.5 секунди на "відповідь сервера"
         const data = await fetchProducts();

         // 3. Сервер відповів (успіх)! Ховаємо спінер
         loader.classList.add("hidden");

         // 4. Малюємо карточки товарів (як у ПР №9)
         const htmlString = data
           .map(
             (product) => `
                 <article class="product-card">... (ваш старий код) </article>
             `,
           )
           .join("");

         container.innerHTML = htmlString;
       } catch (error) {
         // Якщо сталася помилка сервера (reject)
         loader.classList.add("hidden");
         container.innerHTML = `<p class="error">Помилка: ${error.message}</p>`;
       }
     }

     // Запускаємо наш "двигун"
     initShop();
     ```

4. **Збереження (Commit & Push):**
   - Оновіть сторінку в браузері. Ви повинні бачити красивий спінер і напис "Завантаження..." протягом півтори секунди, після чого плавно з'являться картки ваших товарів.
   - Виконайте `git add .` та `git commit -m "Add loading spinner and simulate API delay using Promises"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

Сторінка магазину стала "живою" і реалістичною. Замість миттєвого відображення жорстко зашитих даних, вона правильно обробляє асинхронність та інформує користувача про стан очікування, покращуючи User Experience (UX).

## Контрольні питання

1. В чому принципова різниця між синхронним та асинхронним виконанням коду у JavaScript? Що б сталося, якби `setTimeout` зупиняв (блокував) виконання всього іншого коду навколо себе?
2. Назвіть 3 стани будь-якого `Promise` об'єкта. Що означають слова `resolve` та `reject`?
3. Що робить ключове слово `await` і чому його можна використовувати лише всередині `async` функцій? Чому не можна просто написати `const data = setTimeout() // => Promise`?
4. Для чого потрібен блок `try...catch` під час роботи з мережею чи Promise'ами?
5. Який CSS-клас відповідальний за приховування Spinner-компонента після завершення Promise? Яка властивість у ньому використовується?
