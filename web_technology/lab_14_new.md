# Лабораторне заняття №14 (2 години). Просунута робота з подіями (Делегування) та основи Drag-and-Drop.

## Мета

Навчитися ефективно обробляти події для великої кількості динамічних елементів за допомогою паттерну "Делегування подій". Опанувати основи Drag-and-Drop API для створення сучасних інтерактивних інтерфейсів.

## План

1. Розуміння проблеми: складнощі роботи з подіями для елементів, які генеруються динамічно (після завантаження сторінки).
2. Реалізація делегування подій для кнопок товарів.
3. Додавання атрибуту `draggable="true"` до карток товарів.
4. Обробка подій `dragstart`, `dragover` та `drop` для реалізації перетягування.
5. Створення "Зони улюблених товарів" (Favorites Zone).

## Хід роботи

**Увага:** У нашому інтернет-магазині "TechShop" товари завантажуються динамічно через Fetch. Якщо спробувати повісити обробник кліку на кнопку "Купити" одразу при старті скрипта, виникне помилка, бо самої кнопки ще не існує в DOM. Вирішення – делегування подій!

1. **Делегування подій для кнопок "Купити":**
   - Знайдіть ваш головний контейнер з товарами (наприклад, `.products-grid`). Він завжди є на сторінці з самого початку.
   - Замість того, щоб шукати всі кнопки і вішати на кожну з них `addEventListener`, повісьте лише ОДИН слухач на весь контейнер:
     ```javascript
     const productsContainer = document.querySelector('.products-grid');

     productsContainer.addEventListener('click', (event) => {
       // event.target - це той елемент, по якому фактично клікнули (можливо, кнопка, картинка чи текст)
       // Перевіряємо, чи має цей елемент потрібний нам клас кнопки
       if (event.target.classList.contains('btn-buy')) {
         const productId = event.target.dataset.id; // Отримуємо ID товару з HTML-атрибуту data-id
         console.log('Клік по товару з ID:', productId);
         // addToCart(productId); // Викликаємо функцію додавання в кошик
       }
     });
     ```
   - Завдяки цьому, навіть якщо товари завантажаться з сервера через 5 секунд, кліки все одно працюватимуть ідеально!

2. **Підготовка до Drag-and-Drop:**
   - Щоб зробити елемент таким, що перетягується, йому потрібен атрибут `draggable="true"`.
   - У вашій функції `renderProducts` (де ви генеруєте HTML-картки товарів), додайте цей атрибут до головного `<div>` картки: `<div class="product-card" draggable="true" data-id="${product.id}">`.
   - Додамо слухачі подій початку і кінця перетягування (також використовуючи делегування):
     ```javascript
     productsContainer.addEventListener('dragstart', (event) => {
       if (event.target.classList.contains('product-card')) {
         // Зберігаємо ID товару, який ми почали тягнути в спеціальний "буфер обміну" Drag-and-Drop
         event.dataTransfer.setData('text/plain', event.target.dataset.id);
         event.target.classList.add('dragging'); // Додаємо CSS-клас для напівпрозорості
       }
     });

     productsContainer.addEventListener('dragend', (event) => {
       if (event.target.classList.contains('product-card')) {
         event.target.classList.remove('dragging'); // Повертаємо нормальний вигляд
       }
     });
     ```

3. **Створення зони "Улюбленого" (Dropzone):**
   - У `index.html` додайте блок куди ми будемо кидати товари (наприклад, поруч із кошиком):
     ```html
     <div class="favorites-zone" id="favoritesZone">
       <p> Перетягніть сюди товари в Улюблене</p>
     </div>
     ```
   - У `style.css` стилізуйте цю зону (наприклад, пунктирна рамка, світлий фон). Для класу `.drag-over` задайте зміну кольору фону (для візуального відгуку).

4. **Логіка скидання (Drop):**
   - Щоб у зону можна було "кинути" елемент, браузеру потрібно заборонити його стандартну поведінку (яка блокує drop).
     ```javascript
     const favoritesZone = document.getElementById('favoritesZone');

     // Дозволяємо кидання! Без preventDefault() подія drop не спрацює
     favoritesZone.addEventListener('dragover', (event) => {
       event.preventDefault(); 
       favoritesZone.classList.add('drag-over'); // Підсвічуємо зону, коли над нею тягнуть товар
     });

     // Коли курсор залишає зону - прибираємо підсвітку
     favoritesZone.addEventListener('dragleave', () => {
       favoritesZone.classList.remove('drag-over'); 
     });

     // Обробка моменту "кидання" (відпускання миші)
     favoritesZone.addEventListener('drop', (event) => {
       event.preventDefault();
       favoritesZone.classList.remove('drag-over');

       // Дістаємо збережений ID товару з "буфера обміну"
       const productId = event.dataTransfer.getData('text/plain');
       
       // Візуалізуємо дію (в реальному проекті тут буде додавання до масиву favorites)
       favoritesZone.innerHTML += `<div class="fav-item">Товар #${productId}</div>`;
     });
     ```

5. **Збереження (Commit & Push):**
   - Перевірте роботу: кліки по кнопках повинні працювати бездоганно, а картки можна перетягувати у зону "Улюбленого", де буде з'являтися їх ID.
   - Виконайте `git add .` та `git commit -m "Add Event Delegation and Drag-and-Drop"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

Ваш код став значно більш оптимізованим та стійким до динамічних змін DOM (завдяки делегуванню). Крім того, інтерфейс отримав сучасну взаємодію за допомогою перетягування об'єктів мишею (Drag-and-Drop), що є типовим для сучасних веб-додатків.

## Контрольні питання

1. В чому головна перевага делегування подій порівняно з додаванням обробників `addEventListener` на кожен окремий елемент списку?
2. Як об'єкт події (`event`) та його властивість `event.target` допомагають реалізувати делегування?
3. Що станеться, якщо спробувати знайти кнопку через `document.querySelector` і повісити на неї подію ДО того, як ця кнопка з'явиться на сторінці (наприклад, під час очікування відповіді від сервера)?
4. Навіщо у події `dragover` ми обов'язково маємо викликати `event.preventDefault()`? Що буде без нього?
5. Яку роль відіграє об'єкт `event.dataTransfer` у подіях перетягування?
