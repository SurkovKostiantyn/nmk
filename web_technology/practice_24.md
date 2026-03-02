# Практичне заняття №24 (2 години) Вступ до TypeScript.

## Мета

Перевести частину проекту з динамічного JavaScript (де змінні можуть змінювати свій тип) на строго типізований TypeScript. Навчитися описувати Інтерфейси (Interfaces) для об'єктів товарів та типізувати компоненти React, передаючи їм `props`.

## План

1. Перейменування файлів `.jsx` у `.tsx`.
2. Опис інтерфейсу `Product` (ідентифікатор, назва, ціна, картинка).
3. Типізація `ProductCard`: вказування, що саме має прийти у `props`.
4. Розв'язання проблеми помилок TypeScript під час розробки в редакторі VS Code.
5. Фінальний білд та підготовка "TechShop" до успішного релізу!

## Хід роботи

**Увага:** Це ваше останнє заняття. "TechShop" майже готовий! Але коли над проектом працює ціла команда, хтось може випадково передати ціну товару як рядок `"500"` замість числа `500`, і ваш `calculateTotalAmount` видасть помилку на екрані "500100" замість "600". **TypeScript** це відловить ДО того як проект потрапить у браузер.

1. **Міграція на TSX:**
   - (Увага: В реальності проект створюють з TS відразу командою `npm create vite@latest -- --template react-ts`. Тут ми зробимо базовий рефакторинг існуючого файлу, щоб зрозуміти ідею).
   - Перейменуйте файл вашого компонента `src/components/ProductCard.jsx` на `ProductCard.tsx` (зверніть увагу, тепер розширення `.tsx`).
   - Якщо ви використовуєте VS Code, він має автоматично підключити TypeScript.

2. **Створення Інтерфейсів (Interfaces):**
   - У нових великих проектах типи виділяються у спеціальні папки `types`. Ми зробимо простіше — прямо в файлі:

     ```tsx
     // src/components/ProductCard.tsx
     import { useContext } from "react";
     // ...інші імпорти

     // 1. Описуємо, як ДОСТЕМЕННО має виглядати товар у нашому магазині
     export interface Product {
       id: number;
       title: string;
       price: number;
       image: string;
       category?: string; // Знак питання означає, що це поле є НЕОБОВ'ЯЗКОВИМ
     }

     // 2. Описуємо Props для самого компонента (вони співпадають з Product)
     interface ProductCardProps {
       product: Product;
     }
     ```

3. **Типізація Компонента (Props):**
   - Нехай ваш компонент приймає замість 4-х окремих полів одразу весь об'єкт товару (щоб було легше передавати в Context):

     ```tsx
     // Вказуємо після двокрапки :React.FC<ProductCardProps>
     // (FC = Function Component)
     export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
       const { addToCart } = useContext(CartContext);

       const handleBuyClick = () => {
         addToCart(product); // Тепер ніхто не передасть сюди половину об'єкта випадково!
       };

       return (
         <article className="p-4 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition flex flex-col justify-between">
           {/* Якщо ви напишете product.titla - TS підкреслить червоним, бо такої властивості не заявлено */}
           <img
             src={product.image}
             alt={product.title}
             className="h-48 w-full object-contain mb-4"
           />
           <h3
             className="text-lg font-semibold text-gray-800 mb-2 truncate"
             title={product.title}
           >
             {product.title}
           </h3>
           <p className="text-xl font-bold text-green-600 mb-4">
             ${product.price}
           </p>
           <button
             className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded"
             onClick={handleBuyClick}
           >
             Купити
           </button>
         </article>
       );
     };
     ```

4. **Перевірка "Магії" Type Safety:**
   - Якщо ви спробуєте використати цей компонент де-небудь у `Home.jsx` і не передати всі аргументи, або замість `id={5}` передати `id="п'ять"`, VS Code миттєво почервоніє. Код не збілдиться (`npm run build`).

5. **Фінальний реліз:**
   - Ваш додаток пройшов довгий шлях від `practise_1.md` до `practise_24.md`. Ви стали справжніми інженерами "TechShop" Web Development.
   - Виконайте `git add .` та `git commit -m "Refactor ProductCard to TypeScript and define Interfaces"`. Нарешті: `git push origin main`.
   - Ваш деплой на Vercel автоматично збере проект та викладе в інтернет фінальну версію!

## Результат

Відсутність багів на виході! Якщо ви зміните назву поля бази даних `price` на `cost`, TypeScript підкаже вам про ВСІ файли в проекті (`CartContext.tsx`, `ProductCard.tsx`, `Checkout.tsx`), які вимагають оновлення.

## Контрольні питання

1. У чому полягає основна відмінність "Динамічної типізації" JavaScript (ES6) від "Статичної типізації" TypeScript?
2. Що таке `Interface` і чи можливо було б використати ключове слово `type` замість нього? У чому принципова різниця (коротко)?
3. Чим корисний лінтер і перевірка помилок 'на етапі написання' (у редакторі коду VS Code), у порівнянні з перевіркою 'в реальному часі' (Runtime) в консолі браузера?
4. Для чого в інтерфейсі використовується символ `?` (наприклад `category?: string;`)? Що станеться, якщо цього символу не буде, а товар прийде без категорії з FakeStoreAPI?
5. Що відбудеться з усім кодом TypeScript під час збірки (build) для браузера? Чи розуміє браузер (Chrome) мову TypeScript напряму?
