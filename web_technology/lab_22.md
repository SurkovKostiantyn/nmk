# Лабораторне заняття №22 (2 години). Підключення бази даних до додатку (BaaS / Supabase).

## Мета

Перейти від "заглушок" у пам'яті (файли масивів) до справжньої хмарної SQL-бази даних (PostgreSQL), використовуючи сервіс Supabase. Навчитися налаштовувати таблиці, створювати політики безпеки (RLS) та виконувати `SELECT` / `INSERT` запити з React додатку за допомогою SDK-бібліотеки.

## План

1. Створення проекту в Supabase Dashboard.
2. Створення таблиці `products` та наповнення її тестовими товарами.
3. Налаштування Row Level Security (Дозволити читання всім анонімним користувачам).
4. Підключення SupabaseClient у проект `TechShop` (Vite + React).
5. Заміна `fetch()` з попередніх робіт на методи API Supabase: `supabase.from('products').select('*')`.

## Хід роботи

**Увага:** Продовжуємо вдосконалювати "TechShop". Сьогодні наш додаток стане професійним. Уся інформація про товари, яку ми раніше тримали у своєму Node-сервері або масивах, тепер буде зберігатися у сучасній реляційній Базі Даних від Supabase (аналог Firebase, але на PostgreSQL).

1. **Ініціалізація Хмарної БД:**
   - Перейдіть на сайт [Supabase.com](https://supabase.com/). Зайдіть через GitHub акаунт. Натисніть "New Project", назвіть його `techshop-db`. Відзначте пароль від бази (запам'ятайте його).
   - Зачекайте пару хвилин (сервер розгортається). В цей час можете випити кави.

2. **Створення Таблиці (Table Editor) та Безпека:**
   - Відкрийте бічне меню -> `Table Editor` -> `Create a new table`.
   - Назвіть її `products` (маленькими буквами).
   - Зніміть галку `Enable Row Level Security` (для простоти навчання). Натисніть `Save`.
   - Додайте нові Колонки (Columns): `title` (тип text), `price` (тип numeric), `image` (тип text), `category` (тип text).
   - Натисніть `Insert Row` і заповніть 3-4 тестових товари:
     - Наприклад: Назва "Ігрова миша X", ціна "35", image "url картинки".

3. **Інтеграція в React Додаток:**
   - У терміналі (у папці з вашим Vite-додатком `techshop`) виконайте:
     ```bash
     npm install @supabase/supabase-js
     ```
   - У корені додатку створіть файл конфігурації `src/supabaseClient.js`.
   - Візьміть власні ключі (URL та Anon Key) в Dashboard -> `Settings` (Шестірня внизу) -> `API`:

     ```javascript
     // src/supabaseClient.js
     import { createClient } from "@supabase/supabase-js";
     const supabaseUrl = "https://tviy-url-тут.supabase.co"; // Вставте своє!
     const supabaseKey = "eyJhbGciOiJIUzI1...твій-аnon-ключ-тут..."; // Вставте своє!

     export const supabase = createClient(supabaseUrl, supabaseKey);
     ```

4. **Заміна `fetch` на `Supabase.select`:**
   - Відкрийте сторінку Головної (`src/pages/Home.jsx`).
   - Нам більше не потрібні старі `fetch` запити до нашого сервера на Node!
   - Імпортуйте вашого клієнта бази даних і перепишіть хук `useEffect`:

     ```jsx
     import { supabase } from '../supabaseClient'; // 1. Імпортуємо
     // ...інші імпорти

     export function Home() {
         const [products, setProducts] = useState([]);
         const [isLoading, setIsLoading] = useState(true);
         const [error, setError] = useState(null);

         useEffect(() => {
             const fetchProductsFromDB = async () => {
                 try {
                     // Магія Supabase SDK (SQL-подібний запит: SELECT * FROM products)
                     const { data, error } = await supabase
                         .from('products')
                         .select('*');

                     // Якщо є помилка при підключенні до БД
                     if (error) throw error;

                     // Інакше оновлюємо стан нашими товарами з Хмарної БД!
                     setProducts(data);

                 } catch (err) {
                     setError(err.message);
                 } finally {
                     setIsLoading(false);
                 }
             };

             fetchProductsFromDB();
         }, []);

         return (
             // ...ваш старий JSX з ПР №17
         );
     }
     ```

5. **Збереження (Commit & Push):**
   - Перевірте відображення: сайт має завантажити дані прямо з Супабейсу! Змініть ціну товару в `Table Editor` (у браузері), оновіть React-додаток і ви побачите миттєву зміну ціни (база даних підключена успішно).
   - Виконайте `git add .` та `git commit -m "Integrate Supabase Database for products table"`.
   - Запушіть у свою гілку та злийте в `main`.

## Результат

Жодних статичних файлів або серверних заглушок. Інтернет-магазин працює з реальною "живою" реляційною БД (PostgreSQL) в хмарі. Дані можна візуально редагувати через зручну панель Supabase. Користувачі по всьому світу бачитимуть актуальний стан каталогу товарів.

## Контрольні питання

1. Чому зберігати дані в оперативній пам'яті (JS змінних/масивах бекенду) погана ідея для реальних проектів? Що відбудеться після перезавантаження сервера?
2. Яка різниця між реляційною БД (як PostgreSQL під капотом Supabase) та нереляційною (NoSQL, як-от Firebase / MongoDB)? Опишіть коротко, чому "колонки та рядки" vs "документи".
3. Як Supabase перетворив синтаксис запиту `SELECT * FROM products` на JavaScript Promise? Що ми використали для цього (яку функцію/пакет)?
4. Опишіть значення поняття `Anon Key` (Anon public) ключа з налаштувань API. Чи безпечно цей ключ залишати в публічному коді фронтенду (наприклад на GitHub)?
5. Напишіть гіпотетичний код для Supabase (`.from`, `.insert()`), за допомогою якого можна було б зберегти нове замовлення користувача (кошик) з форми `CheckoutPage` до таблиці `orders`.

