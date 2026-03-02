# Практичне заняття №20 (2 години). Адаптація інтерфейсу під різні пристрої (Tailwind CSS).

## Мета

Відмовитися від написання об'ємних і заплутаних файлів CSS з медіа-запитами. Опанувати найпопулярніший сучасний інструмент стилізації — **Tailwind CSS**. Навчитися писати адаптивний дизайн безпосередньо в атрибуті `className` React-компонентів, використовуючи утилітарні класи.

## План

1. Встановлення Tailwind CSS у проєкт Vite.
2. Конфігурація файлів `tailwind.config.js` та `index.css`.
3. Заміна класичного CSS на утилітарні класи Tailwind (`flex`, `p-4`, `bg-blue-500`) у компоненті `ProductCard`.
4. Реалізація адаптивної сітки для товарів (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
5. Стилізація кнопок за допомогою станів (`hover:bg-blue-600`).

## Хід роботи

**Увага:** Продовжуємо роботу в проекті "TechShop". Сьогодні ми переписуємо зовнішній вигляд карток товарів та сітки, роблячи їх повністю адаптивними з мінімальними зусиллями завдяки Tailwind CSS.

1. **Встановлення Tailwind CSS:**
   - Зупиніть локальний сервер (`Ctrl+C` у терміналі VS Code).
   - Виконайте наступні команди згідно з офіційною документацією (Tailwind + Vite):
     ```bash
     npm install -D tailwindcss postcss autoprefixer
     npx tailwindcss init -p
     ```
   - Запустіть сервер знову: `npm run dev`.

2. **Налаштування конфігурації:**
   - Відкрийте щойно створений файл `tailwind.config.js` і вкажіть шляхи до всіх ваших React-компонентів, щоб Tailwind знав, де шукати класи:
     ```javascript
     /** @type {import('tailwindcss').Config} */
     export default {
       content: [
         "./index.html",
         "./src/**/*.{js,ts,jsx,tsx}", // Шукати в усіх файлах папки src
       ],
       theme: {
         extend: {},
       },
       plugins: [],
     };
     ```
   - Відкрийте головний файл стилів `src/style.css` (або `index.css`) і ДОДАЙТЕ на самий початок директиви Tailwind. Якщо у вас там були глобальні стилі для `body` — можна залишити. Але всі ваші старі класи `.product-card`, `.products-grid` можна закоментувати або видалити!
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```

3. **Адаптивна Сітка (Grid) у `Home.jsx`:**
   - Перейдіть у `src/pages/Home.jsx`.
   - Знайдіть контейнер `<div className="products-grid">` і замініть класичний клас на класи Tailwind.
   - Ми зробимо сітку: 1 колонка на мобілках, 2 на планшетах (`sm:`), 3 на ноутбуках (`md:`), 4 на великих екранах (`lg:`):
     ```jsx
     {/* Було: <div className="products-grid"> */}
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
         {products.map(product => ( ... ))}
     </div>
     ```

4. **Переписування Компонента `ProductCard.jsx`:**
   - Відкрийте `src/components/ProductCard.jsx`. Видаліть старий клас `className="product-card"`. Збираємо картку як Lego:

     ```jsx
     export function ProductCard({ title, price, image, id }) {
       // ... логіка Context

       return (
         // p-4 = padding, bg-white = фон, rounded-lg = бордер радіус, shadow-md = тінь,
         // hover:shadow-xl hover:-translate-y-1 = анімація при наведенні, transition = плавний перехід
         <article className="p-4 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between">
           {/* Картинка: фіксована висота, обрізання, центрування об'єкта */}
           <img
             src={image}
             alt={title}
             className="h-48 w-full object-contain mb-4"
           />

           {/* Назва: жирний шрифт, який не вилазить за межі (truncate - три крапки) */}
           <h3
             className="text-lg font-semibold text-gray-800 mb-2 truncate"
             title={title}
           >
             {title}
           </h3>

           {/* Ціна: зелена та велика */}
           <p className="text-xl font-bold text-green-600 mb-4">${price}</p>

           {/* Кнопка: відступи, колір, скруглення, ширина на 100%, ховер ефект */}
           <button
             className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
             onClick={handleBuyClick}
           >
             Купити
           </button>
         </article>
       );
     }
     ```

5. **Збереження (Commit & Push):**
   - Перевірте відображення: сайт має змінити стиль. Тепер картки виглядають сучасно. Вони самостійно розташовуються по сітці залежно від ширини вікна без жодного медіа-запиту `@media` у вашому старому CSS.
   - Виконайте `git add .` та `git commit -m "Refactor ProductCard and Layout to use Tailwind CSS"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

Час написання стилів скоротився у декілька разів. Більше не потрібно придумувати тисячі імен класів для кожного елемента (своєрідна проблема BEM), достатньо використати готову дизайн-систему (утиліти Tailwind), вбудовуючи стилі безпосередньо в JSX.

## Контрольні питання

1. В чому кардинальна відмінність підходу "Утилітарних класів" (Tailwind CSS) від "Семантичного CSS" (наприклад BEM `block__element--modifier`)? Чому розмітка в JSX стає довшою?
2. Як у Tailwind реалізовано мобільний First (Mobile First) підхід? На які екрани за замовчуванням застосовується клас `grid-cols-1`, а на які — префікси, на кшталт `md:grid-cols-3`?
3. Що роблять класи `p-4`, `m-2`, `mt-8`? Яка між ними різниця (відступи)?
4. Завдяки якому файлу Tailwind знає, які класи ми використали в проєкті, щоб згенерувати фінальний мініатюрний `style.css` при білді? Що там вказано всередині масиву `content: []`?
5. Для чого кнопці задається класс `w-full` та `hover:bg-blue-600`? Що відбувається з класичною властивістю CSS `background-color` при наведенні?
