# Лекція №16 (2 години). Збереження даних користувача — Web Storage API.

## План лекції

- проблема збереження стану на клієнті — навіщо веб-додаткам «пам'ять» та еволюція підходів від Cookies до Web Storage;
- механізм роботи Web Storage API — інтерфейси `localStorage` і `sessionStorage`, їхні спільні методи та відмінності життєвого циклу;
- серіалізація та десеріалізація складних даних — збереження об'єктів і масивів через `JSON.stringify()` / `JSON.parse()`;
- практичні сценарії застосування — збереження обраної теми оформлення, налаштувань користувача та списку задач (To-Do List);
- синхронізація між вкладками та безпека — подія `storage`, обмеження обсягу, політика Same-Origin та захист від XSS.

## Перелік умовних скорочень

- **API** (Application Programming Interface) — інтерфейс прикладного програмування;
- **DOM** (Document Object Model) — об'єктна модель документа;
- **JSON** (JavaScript Object Notation) — текстовий формат обміну даними;
- **XSS** (Cross-Site Scripting) — міжсайтовий скриптинг;
- **UI** (User Interface) — користувацький інтерфейс;
- **CRUD** (Create, Read, Update, Delete) — базові операції роботи з даними.

## Вступ

Кожного разу, коли користувач закриває вкладку браузера, весь стан JavaScript-додатку — значення змінних, вміст масивів, обрана тема оформлення — зникає назавжди. Оперативна пам'ять звільняється, і при наступному відвідуванні сторінки користувач починає з «чистого аркуша». Для простих інформаційних сайтів це прийнятно, але для сучасних інтерактивних веб-додатків така поведінка є проблемою.

Уявіть інтернет-магазин, де кошик покупок обнуляється після випадкового закриття вкладки. Або додаток-планувальник, де весь список задач щоразу зникає. Або ж просто: користувач обрав темну тему, але при перезавантаженні сторінка знову стала білою і засліпила його серед ночі.

Для вирішення цієї проблеми браузери надають спеціальний механізм — **Web Storage API**. Це простий, синхронний інтерфейс «ключ-значення», який дозволяє JavaScript-коду зберігати текстові дані безпосередньо у браузері користувача. Дані зберігаються між сесіями перегляду та доступні лише для того самого джерела (домену), яке їх записало.

У цій лекції ми детально розглянемо два сховища — `localStorage` та `sessionStorage`, — вивчимо їхні методи, обмеження та практичне застосування для створення веб-додатків із «пам'яттю».

---

## 1. Проблема стану та еволюція клієнтського зберігання

### 1.1. Чому JavaScript «забуває» дані

JavaScript у браузері працює в рамках моделі «запит — відповідь». Щоразу, коли користувач відкриває або перезавантажує сторінку, браузер виконує такі кроки:

- завантажує HTML-документ із сервера;
- парсить розмітку та будує DOM-дерево;
- завантажує та виконує підключені CSS- та JS-файли;
- створює нове середовище виконання (execution context) із порожніми змінними.

Усі змінні, створені під час виконання скрипту, існують лише в **оперативній пам'яті** (RAM). Коли користувач закриває вкладку або перезавантажує сторінку, середовище виконання знищується, а разом із ним — усі дані.

```javascript
// Ця змінна існує лише до перезавантаження сторінки
let darkModeEnabled = true;
let cartItems = ["Ноутбук", "Миша", "Навушники"];

// Після F5 або закриття вкладки — darkModeEnabled та cartItems не існують
```

### 1.2. Cookies — перший механізм зберігання

Першим інструментом для збереження даних на стороні клієнта стали **HTTP Cookies** (1994 рік, Netscape Navigator). Cookies мають ряд особливостей та обмежень:

- максимальний обсяг одного cookie — **≈ 4 КБ**;
- cookies **автоматично передаються на сервер** із кожним HTTP-запитом, що збільшує трафік навіть якщо дані потрібні лише на клієнті;
- складний і неінтуїтивний API на основі рядка `document.cookie`;
- кількість cookies обмежена — зазвичай **≈ 20–50** на один домен.

```javascript
// Встановлення cookie — неінтуїтивний рядковий синтаксис
document.cookie = "theme=dark; max-age=31536000; path=/";

// Зчитування — повертає ВСІ cookies одним рядком, розбирати доводиться вручну
console.log(document.cookie); // "theme=dark; lang=uk; session_id=abc123"
```

Cookies залишаються незамінними для завдань автентифікації та серверної взаємодії, але для зберігання клієнтських даних (налаштувань UI, стану додатку) вони є надмірно складними та обмеженими.

### 1.3. Web Storage API — сучасна альтернатива

У 2009 році специфікація **HTML5** представила Web Storage API, який вирішує більшість обмежень cookies для клієнтських сценаріїв:

- обсяг сховища — **≈ 5–10 МБ** на одне джерело (origin), залежно від браузера;
- дані **не передаються на сервер** із запитами — вони існують лише в браузері;
- простий та зрозумілий API з інтуїтивними методами `setItem()`, `getItem()`, `removeItem()`;
- два окремі сховища з різним життєвим циклом — `localStorage` та `sessionStorage`.

---

## 2. Інтерфейси localStorage та sessionStorage

### 2.1. Спільний інтерфейс Storage

Обидва сховища — `localStorage` і `sessionStorage` — реалізують один і той самий інтерфейс `Storage`, тобто мають однаковий набір методів та властивостей. Різниця полягає лише в **тривалості зберігання** та **області видимості** даних.

Доступ до сховищ здійснюється через глобальні об'єкти `window.localStorage` та `window.sessionStorage` (або просто `localStorage` та `sessionStorage`, оскільки `window` є глобальним контекстом у браузері).

**Основні методи інтерфейсу Storage:**

- `setItem(key, value)` — записує пару «ключ-значення» у сховище; якщо ключ уже існує, значення буде перезаписане;
- `getItem(key)` — повертає значення за вказаним ключем або `null`, якщо такого ключа не існує;
- `removeItem(key)` — видаляє конкретний запис за ключем;
- `clear()` — повністю очищує сховище, видаляючи всі записи;
- `key(index)` — повертає назву ключа за його числовим індексом у сховищі;
- `length` — властивість, що повертає кількість записів у сховищі.

```javascript
// Запис значень
localStorage.setItem("username", "Тарас");
localStorage.setItem("language", "uk");

// Читання значення за ключем
const user = localStorage.getItem("username");
console.log(user); // "Тарас"

// Читання неіснуючого ключа
const missing = localStorage.getItem("nonexistent");
console.log(missing); // null

// Кількість записів у сховищі
console.log(localStorage.length); // 2

// Отримання ключа за індексом
console.log(localStorage.key(0)); // "username" (порядок може варіюватися)

// Видалення конкретного запису
localStorage.removeItem("language");
console.log(localStorage.length); // 1

// Повне очищення сховища
localStorage.clear();
console.log(localStorage.length); // 0
```

### 2.2. Альтернативний синтаксис доступу

Окрім офіційних методів `setItem()` та `getItem()`, до `localStorage` і `sessionStorage` можна звертатися, як до звичайного JavaScript-об'єкта — через крапкову нотацію або квадратні дужки:

```javascript
// Запис через крапку та квадратні дужки
localStorage.theme = "dark";
localStorage["fontSize"] = "16px";

// Читання
console.log(localStorage.theme);       // "dark"
console.log(localStorage["fontSize"]); // "16px"

// Видалення
delete localStorage.theme;
```

Проте офіційні методи `setItem()` та `getItem()` є **рекомендованим підходом** з кількох причин:

- метод `getItem()` для неіснуючого ключа повертає `null`, тоді як крапкова нотація повертає `undefined` — це може призводити до непередбачуваної поведінки;
- ключі, що збігаються з назвами вбудованих властивостей об'єкта (`length`, `key`, `setItem`), можуть спричинити конфлікти при використанні крапкової нотації;
- методи `setItem()` та `getItem()` чітко виражають намір — код стає більш читабельним та самодокументованим.

```javascript
// Проблема: ключ "length" конфліктує з вбудованою властивістю
localStorage.length = "200cm"; // НЕ збереже значення, бо length — readonly властивість
localStorage.setItem("length", "200cm"); // Працює коректно

console.log(localStorage.getItem("length")); // "200cm"
console.log(localStorage.length);            // 1 (кількість записів, а не "200cm")
```

### 2.3. localStorage — довготривале зберігання

`localStorage` зберігає дані **без обмеження часу**. Дані залишаються в браузері навіть після:

- закриття вкладки;
- закриття всього вікна браузера;
- перезавантаження операційної системи.

Дані видаляються лише в таких випадках:

- явне видалення через JavaScript-код (`removeItem()`, `clear()`);
- ручне очищення користувачем через налаштування браузера (очищення даних сайтів);
- вичерпання квоти сховища та примусове очищення браузером.

```javascript
// Цей код виконується при першому відвідуванні сторінки
localStorage.setItem("firstVisit", new Date().toISOString());

// Через тиждень, місяць або рік — значення все ще доступне
const firstVisit = localStorage.getItem("firstVisit");
console.log(`Перший візит: ${firstVisit}`); // "2026-10-21T08:43:50.000Z"
```

### 2.4. sessionStorage — зберігання на час сесії

`sessionStorage` зберігає дані лише **протягом поточної сесії вкладки браузера**. Дані видаляються автоматично, коли:

- користувач закриває вкладку;
- користувач закриває вікно браузера.

Важливі особливості `sessionStorage`:

- дані **зберігаються** при перезавантаженні сторінки (F5);
- дані **не зберігаються** між вкладками — кожна вкладка має своє ізольоване сховище, навіть якщо обидві вкладки відкриті на одному сайті;
- дублювання вкладки (Ctrl + Shift + T або «Відкрити у новій вкладці») копіює поточний стан `sessionStorage` у нову вкладку, але далі вони працюють незалежно.

```javascript
// Збереження тимчасових даних поточної сесії
sessionStorage.setItem("currentStep", "3");
sessionStorage.setItem("formDraft", "Текст, який ще не відправлений");

// Після перезавантаження (F5) — дані залишаються
console.log(sessionStorage.getItem("currentStep")); // "3"

// Після закриття вкладки та відкриття нової — дані зникають
```

### 2.5. Порівняння localStorage, sessionStorage та Cookies

| Характеристика | `localStorage` | `sessionStorage` | Cookies |
|---|---|---|---|
| **Обсяг** | ≈ 5–10 МБ | ≈ 5–10 МБ | ≈ 4 КБ |
| **Тривалість** | Без обмежень | До закриття вкладки | Налаштовується (max-age) |
| **Область видимості** | Усі вкладки одного origin | Лише поточна вкладка | Усі вкладки одного домену |
| **Передача на сервер** | Ні | Ні | Так, із кожним запитом |
| **API** | Простий (`setItem/getItem`) | Простий (`setItem/getItem`) | Рядковий (`document.cookie`) |
| **Доступ із JS** | Так | Так | Так (якщо не `HttpOnly`) |

---

## 3. Серіалізація та десеріалізація складних даних

### 3.1. Обмеження: тільки рядки

Ключова особливість (і водночас обмеження) Web Storage API полягає в тому, що **обидва сховища зберігають виключно рядки**. Якщо ви спробуєте зберегти число, логічне значення, масив або об'єкт, значення буде автоматично приведене до рядка через виклик методу `.toString()`:

```javascript
// Збереження числа
localStorage.setItem("count", 42);
const count = localStorage.getItem("count");
console.log(count);        // "42" (рядок, не число!)
console.log(typeof count); // "string"

// Збереження логічного значення
localStorage.setItem("isActive", true);
const isActive = localStorage.getItem("isActive");
console.log(isActive);        // "true" (рядок!)
console.log(typeof isActive); // "string"

// УВАГА: рядок "false" є truthy-значенням у JavaScript!
localStorage.setItem("isDarkMode", false);
const isDark = localStorage.getItem("isDarkMode");
if (isDark) {
  console.log("Ця гілка виконається, бо рядок 'false' — truthy!");
}

// Збереження масиву — результат непередбачуваний
localStorage.setItem("items", [1, 2, 3]);
console.log(localStorage.getItem("items")); // "1,2,3" (втрачена структура масиву)

// Збереження об'єкта — втрачаються всі дані
localStorage.setItem("user", { name: "Тарас", age: 21 });
console.log(localStorage.getItem("user")); // "[object Object]" (дані втрачені!)
```

### 3.2. Рішення: JSON.stringify() та JSON.parse()

Для коректного збереження та відновлення складних структур даних (масивів, об'єктів) необхідно використовувати серіалізацію у формат JSON:

- `JSON.stringify(value)` — перетворює JavaScript-значення (об'єкт, масив, число, рядок, логічне значення, `null`) у JSON-рядок для збереження;
- `JSON.parse(jsonString)` — перетворює JSON-рядок назад у JavaScript-значення.

```javascript
// === Збереження об'єкта ===
const userSettings = {
  theme: "dark",
  fontSize: 16,
  notifications: true,
  favoriteColors: ["#6C63FF", "#FF6584", "#00C9A7"]
};

// Серіалізація: об'єкт -> JSON-рядок
const serialized = JSON.stringify(userSettings);
console.log(serialized);
// '{"theme":"dark","fontSize":16,"notifications":true,"favoriteColors":["#6C63FF","#FF6584","#00C9A7"]}'

localStorage.setItem("settings", serialized);

// === Відновлення об'єкта ===
const raw = localStorage.getItem("settings");

// Десеріалізація: JSON-рядок -> об'єкт
const restored = JSON.parse(raw);

console.log(restored.theme);              // "dark"
console.log(restored.fontSize);           // 16 (число, не рядок)
console.log(restored.notifications);      // true (boolean, не рядок)
console.log(restored.favoriteColors[0]);  // "#6C63FF"
```

### 3.3. Безпечне зчитування з обробкою помилок

При зчитуванні з `localStorage` слід завжди враховувати два ризики:

- ключ може не існувати (повертається `null`);
- збережений рядок може бути пошкоджений або не відповідати формату JSON (наприклад, через ручне редагування в DevTools).

Виклик `JSON.parse(null)` поверне `null` без помилки, але `JSON.parse("пошкоджений текст")` кине виняток `SyntaxError`, який зупинить виконання скрипту, якщо його не перехопити.

```javascript
/**
 * Безпечно зчитує значення з localStorage та парсить його як JSON.
 * @param {string} key — ключ запису в localStorage.
 * @param {*} defaultValue — значення за замовчуванням, якщо ключ відсутній або дані пошкоджені.
 * @returns {*} — розпарсене значення або defaultValue.
 */
function getFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);

    // Якщо ключ не існує — повертаємо значення за замовчуванням
    if (raw === null) {
      return defaultValue;
    }

    // Спроба парсингу JSON-рядка
    return JSON.parse(raw);
  } catch (error) {
    // JSON.parse() кинув SyntaxError — дані пошкоджені
    console.warn(`Помилка читання "${key}" з localStorage:`, error.message);
    return defaultValue;
  }
}

/**
 * Серіалізує значення та записує його в localStorage.
 * @param {string} key — ключ запису.
 * @param {*} value — значення для збереження.
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Можливий QuotaExceededError при перевищенні обсягу сховища
    console.error(`Помилка запису "${key}" в localStorage:`, error.message);
  }
}

// Використання:
const tasks = getFromStorage("todoList", []);        // [] якщо ключ відсутній
const theme = getFromStorage("theme", "light");       // "light" за замовчуванням
const prefs = getFromStorage("preferences", { lang: "uk" });
```

### 3.4. Обмеження JSON-серіалізації

Слід пам'ятати, що `JSON.stringify()` **не зберігає** деякі типи JavaScript-значень:

- **функції** — ігноруються повністю;
- **`undefined`** — ігнорується у властивостях об'єкта, перетворюється на `null` у масивах;
- **`Symbol`** — ігнорується;
- **`Date`** — перетворюється на рядок ISO, але `JSON.parse()` не відновить його як об'єкт Date;
- **циклічні посилання** — спричиняють помилку `TypeError`.

```javascript
const data = {
  name: "Проєкт",
  createdAt: new Date(),          // Date -> рядок
  callback: function() {},        // функція — ігнорується
  status: undefined,              // undefined — ігнорується
  id: Symbol("unique")            // Symbol — ігнорується
};

const json = JSON.stringify(data);
console.log(json);
// '{"name":"Проєкт","createdAt":"2026-10-21T08:43:50.000Z"}'
// callback, status та id — відсутні в результаті

const restored = JSON.parse(json);
console.log(typeof restored.createdAt); // "string" (не Date!)
```

---

## 4. Практичний сценарій: збереження теми оформлення

Одним із найпоширеніших застосувань `localStorage` є збереження обраної користувачем теми оформлення (світла / темна). Розглянемо повну реалізацію.

### 4.1. HTML-структура

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Перемикач теми</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="header">
    <h1>Мій веб-додаток</h1>
    <button id="theme-toggle" class="theme-btn" aria-label="Перемкнути тему">
      🌙 Темна тема
    </button>
  </header>

  <main class="content">
    <p>Обрана тема зберігається у localStorage і відновлюється при наступному візиті.</p>
  </main>

  <script src="theme.js"></script>
</body>
</html>
```

### 4.2. CSS-стилі з CSS-змінними

```css
/* Базова (світла) тема */
:root {
  --bg-color: #FFFFFF;
  --text-color: #1A1A2E;
  --header-bg: #F0F0F5;
  --btn-bg: #6C63FF;
  --btn-text: #FFFFFF;
}

/* Темна тема — застосовується через data-атрибут */
[data-theme="dark"] {
  --bg-color: #1A1A2E;
  --text-color: #E0E0E0;
  --header-bg: #16213E;
  --btn-bg: #FF6584;
  --btn-text: #FFFFFF;
}

body {
  margin: 0;
  font-family: "Segoe UI", sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background-color: var(--header-bg);
  transition: background-color 0.3s ease;
}

.theme-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background-color: var(--btn-bg);
  color: var(--btn-text);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.15s ease;
}

.theme-btn:hover {
  transform: scale(1.05);
}
```

### 4.3. JavaScript-логіка з localStorage

```javascript
// theme.js

// 1. Отримуємо посилання на DOM-елементи
const themeToggleBtn = document.getElementById("theme-toggle");
const htmlElement = document.documentElement; // <html>

// 2. Функція застосування теми до сторінки
function applyTheme(theme) {
  // Встановлюємо data-атрибут, який активує відповідні CSS-змінні
  htmlElement.setAttribute("data-theme", theme);

  // Оновлюємо текст та іконку кнопки
  themeToggleBtn.textContent = theme === "dark"
    ? "☀️ Світла тема"
    : "🌙 Темна тема";
}

// 3. Відновлення збереженої теми при завантаженні сторінки
// Якщо в localStorage немає запису "theme", використовуємо "light" за замовчуванням
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// 4. Обробник кліку по кнопці перемикання теми
themeToggleBtn.addEventListener("click", () => {
  // Визначаємо поточну тему та перемикаємо на протилежну
  const currentTheme = htmlElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  // Застосовуємо нову тему до UI
  applyTheme(newTheme);

  // Зберігаємо обрану тему в localStorage
  localStorage.setItem("theme", newTheme);

  console.log(`Тему змінено на: ${newTheme}`);
});
```

Тепер при будь-якому перезавантаженні або повторному відвідуванні сайту обрана тема автоматично відновлюється з `localStorage`.

---

## 5. Практичний сценарій: збереження списку задач (To-Do List)

Розглянемо повноцінну реалізацію додатку «Список задач» із CRUD-операціями (створення, читання, оновлення, видалення) та автоматичним збереженням стану в `localStorage`.

### 5.1. HTML-структура

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Список задач</title>
  <link rel="stylesheet" href="todo.css">
</head>
<body>
  <div class="app-container">
    <h1>📋 Мої задачі</h1>

    <form id="todo-form" class="todo-form">
      <input
        type="text"
        id="todo-input"
        class="todo-input"
        placeholder="Додати нову задачу..."
        required
        minlength="2"
        maxlength="100"
      >
      <button type="submit" class="add-btn">Додати</button>
    </form>

    <ul id="todo-list" class="todo-list">
      <!-- Задачі додаються динамічно через JavaScript -->
    </ul>

    <div class="todo-footer">
      <span id="tasks-counter">Задач: 0</span>
      <button id="clear-completed" class="clear-btn">Очистити виконані</button>
    </div>
  </div>

  <script src="todo.js"></script>
</body>
</html>
```

### 5.2. JavaScript-логіка з повним CRUD та localStorage

```javascript
// todo.js

// ==========================================
// 1. СТАН ДОДАТКУ ТА РОБОТА ЗІ СХОВИЩЕМ
// ==========================================

/**
 * Безпечно зчитує масив задач із localStorage.
 * @returns {Array} — масив об'єктів задач або порожній масив.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem("todoTasks");
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    // Додаткова перевірка: результат парсингу повинен бути масивом
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Помилка завантаження задач:", error.message);
    return [];
  }
}

/**
 * Зберігає поточний масив задач у localStorage.
 * @param {Array} tasks — масив об'єктів задач для збереження.
 */
function saveTasks(tasks) {
  try {
    localStorage.setItem("todoTasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Помилка збереження задач:", error.message);
    alert("Не вдалося зберегти задачі. Можливо, сховище переповнене.");
  }
}

// Ініціалізація масиву задач із localStorage
let tasks = loadTasks();

// ==========================================
// 2. DOM-ЕЛЕМЕНТИ
// ==========================================

const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const tasksCounter = document.getElementById("tasks-counter");
const clearCompletedBtn = document.getElementById("clear-completed");

// ==========================================
// 3. РЕНДЕРИНГ СПИСКУ ЗАДАЧ
// ==========================================

/**
 * Перемальовує весь список задач на основі масиву tasks.
 * Використовує повну заміну innerHTML (підходить для невеликих списків).
 */
function renderTasks() {
  // Формуємо HTML-розмітку для кожної задачі
  todoList.innerHTML = tasks.map((task, index) => `
    <li class="todo-item ${task.completed ? 'completed' : ''}" data-index="${index}">
      <label class="todo-label">
        <input
          type="checkbox"
          class="todo-checkbox"
          ${task.completed ? 'checked' : ''}
        >
        <span class="todo-text">${escapeHTML(task.text)}</span>
      </label>
      <button class="delete-btn" title="Видалити задачу">&times;</button>
    </li>
  `).join("");

  // Оновлюємо лічильник задач
  const activeTasks = tasks.filter(task => !task.completed).length;
  tasksCounter.textContent = `Задач: ${activeTasks} з ${tasks.length}`;
}

/**
 * Екранує HTML-спецсимволи для запобігання XSS-атакам.
 * @param {string} text — вхідний текст.
 * @returns {string} — безпечний текст для вставки в HTML.
 */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 4. CRUD-ОПЕРАЦІЇ
// ==========================================

/**
 * Додає нову задачу до списку.
 * @param {string} text — текст нової задачі.
 */
function addTask(text) {
  const newTask = {
    id: Date.now(),           // Унікальний ідентифікатор на основі мітки часу
    text: text.trim(),        // Очищений текст задачі
    completed: false,         // Статус виконання
    createdAt: new Date().toISOString() // Дата створення
  };

  tasks.push(newTask);
  saveTasks(tasks);  // Зберігаємо оновлений масив у localStorage
  renderTasks();     // Перемальовуємо UI
}

/**
 * Перемикає статус виконання задачі за індексом.
 * @param {number} index — індекс задачі в масиві.
 */
function toggleTask(index) {
  if (index >= 0 && index < tasks.length) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks(tasks);
    renderTasks();
  }
}

/**
 * Видаляє задачу за індексом.
 * @param {number} index — індекс задачі в масиві.
 */
function deleteTask(index) {
  if (index >= 0 && index < tasks.length) {
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
  }
}

/**
 * Видаляє всі виконані задачі.
 */
function clearCompleted() {
  tasks = tasks.filter(task => !task.completed);
  saveTasks(tasks);
  renderTasks();
}

// ==========================================
// 5. ОБРОБНИКИ ПОДІЙ
// ==========================================

// Додавання нової задачі через форму
todoForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = todoInput.value.trim();
  if (text.length < 2) {
    alert("Задача повинна містити щонайменше 2 символи.");
    return;
  }

  addTask(text);
  todoInput.value = "";   // Очищаємо поле вводу
  todoInput.focus();      // Повертаємо фокус на поле
});

// Делегування подій для чекбоксів та кнопок видалення
todoList.addEventListener("click", (event) => {
  const listItem = event.target.closest(".todo-item");
  if (!listItem) return;

  const index = parseInt(listItem.dataset.index, 10);

  // Клік по чекбоксу — перемикання статусу
  if (event.target.classList.contains("todo-checkbox")) {
    toggleTask(index);
    return;
  }

  // Клік по кнопці видалення
  if (event.target.classList.contains("delete-btn")) {
    deleteTask(index);
    return;
  }
});

// Очищення виконаних задач
clearCompletedBtn.addEventListener("click", clearCompleted);

// ==========================================
// 6. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
// ==========================================

// Перший рендер — відображаємо збережені задачі з localStorage
renderTasks();
```

### 5.3. Як працює збереження стану

Потік даних у цьому додатку:

```
Користувач додає задачу
        ↓
tasks.push(newTask)         ← оновлення масиву в пам'яті
        ↓
saveTasks(tasks)            ← JSON.stringify() → localStorage.setItem()
        ↓
renderTasks()               ← перемальовка UI на основі масиву tasks

---

Користувач перезавантажує сторінку
        ↓
loadTasks()                 ← localStorage.getItem() → JSON.parse()
        ↓
tasks = [відновлений масив] ← масив відновлений із localStorage
        ↓
renderTasks()               ← UI відображає збережений стан
```

Кожна дія (додавання, видалення, зміна статусу) негайно синхронізує масив `tasks` зі сховищем `localStorage`, забезпечуючи **персистентність** (збереження стану між сесіями).

---

## 6. Практичний сценарій: збереження налаштувань із sessionStorage

Розглянемо використання `sessionStorage` для збереження тимчасових налаштувань, які мають існувати лише протягом поточної сесії (наприклад, стан багатокрокової форми, яку користувач заповнює).

```javascript
// ================================================
// Збереження прогресу багатокрокової форми реєстрації
// ================================================

// Крок 1: Користувач заповнив основну інформацію
function saveStepData(stepNumber, data) {
  const key = `registration_step_${stepNumber}`;
  sessionStorage.setItem(key, JSON.stringify(data));
  console.log(`Крок ${stepNumber} збережено у sessionStorage`);
}

// Крок 2: Відновлення даних кроку (наприклад, після натискання кнопки "Назад")
function loadStepData(stepNumber) {
  const key = `registration_step_${stepNumber}`;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Приклад використання:
// Користувач заповнює крок 1 і переходить далі
saveStepData(1, {
  firstName: "Тарас",
  lastName: "Шевченко",
  email: "taras@example.com"
});

// Користувач заповнює крок 2
saveStepData(2, {
  university: "КПІ",
  faculty: "ФІОТ",
  year: 3
});

// Користувач натискає "Назад" — дані кроку 1 відновлюються
const step1Data = loadStepData(1);
console.log(step1Data);
// { firstName: "Тарас", lastName: "Шевченко", email: "taras@example.com" }

// Після завершення реєстрації — очищуємо тимчасові дані
function completeRegistration() {
  // Збираємо дані всіх кроків
  const allSteps = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.startsWith("registration_step_")) {
      allSteps[key] = JSON.parse(sessionStorage.getItem(key));
    }
  }

  console.log("Повні дані реєстрації:", allSteps);

  // Видаляємо тимчасові дані сесії
  Object.keys(allSteps).forEach(key => sessionStorage.removeItem(key));
}
```

Чому `sessionStorage`, а не `localStorage`?

- чернетка форми реєстрації не повинна зберігатися після закриття вкладки — це може бути неочікувано для користувача та навіть небезпечно (наприклад, якщо комп'ютер є спільним);
- кожна вкладка має своє ізольоване сховище — користувач може одночасно заповнювати дві різні форми в двох вкладках без конфліктів.

---

## 7. Перебір записів сховища

Для обходу всіх записів у сховищі можна використовувати кілька підходів.

### 7.1. Цикл for з key(index)

```javascript
// Виведення всіх записів localStorage у консоль
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
}
```

### 7.2. Object.keys() та Object.entries()

```javascript
// Отримати всі ключі як масив
const allKeys = Object.keys(localStorage);
console.log("Ключі:", allKeys); // ["theme", "todoTasks", "username"]

// Отримати масив пар [ключ, значення]
const allEntries = Object.entries(localStorage);
allEntries.forEach(([key, value]) => {
  console.log(`${key} = ${value}`);
});
```

### 7.3. Фільтрація записів за префіксом

У реальних додатках часто використовують префікси ключів для логічного групування записів:

```javascript
// Збереження з префіксом "cart_"
localStorage.setItem("cart_item_1", JSON.stringify({ title: "Ноутбук", price: 25000 }));
localStorage.setItem("cart_item_2", JSON.stringify({ title: "Миша", price: 800 }));
localStorage.setItem("cart_item_3", JSON.stringify({ title: "Клавіатура", price: 1500 }));

// Отримання лише записів кошика
const cartKeys = Object.keys(localStorage).filter(key => key.startsWith("cart_"));
const cartItems = cartKeys.map(key => JSON.parse(localStorage.getItem(key)));

console.log("Товари в кошику:", cartItems);
// [{ title: "Ноутбук", price: 25000 }, { title: "Миша", price: 800 }, ...]

// Підрахунок загальної суми кошика
const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
console.log(`Загальна сума: ${totalPrice} грн`); // 27300 грн
```

---

## 8. Синхронізація між вкладками: подія storage

### 8.1. Механізм роботи

Коли дані в `localStorage` змінюються в одній вкладці, **всі інші вкладки** того самого origin отримують подію `storage`. Це дозволяє синхронізувати стан між кількома відкритими вкладками без використання складних механізмів (WebSockets, SharedWorker тощо).

Важливі особливості події `storage`:

- подія спрацьовує **лише в інших вкладках**, а не в тій, де відбулася зміна;
- подія спрацьовує **лише для `localStorage`**, не для `sessionStorage`;
- подія не спрацьовує, якщо нове значення ідентичне попередньому.

### 8.2. Об'єкт StorageEvent

Обробник події `storage` отримує об'єкт `StorageEvent` з такими властивостями:

- `event.key` — ключ, значення якого змінилось (або `null`, якщо викликано `clear()`);
- `event.oldValue` — попереднє значення (або `null`, якщо ключ створений вперше);
- `event.newValue` — нове значення (або `null`, якщо ключ було видалено);
- `event.url` — URL сторінки, яка ініціювала зміну;
- `event.storageArea` — посилання на об'єкт сховища (`localStorage`).

```javascript
// Цей обробник спрацює в ІНШИХ вкладках, коли localStorage зміниться
window.addEventListener("storage", (event) => {
  console.log("Зміна в localStorage виявлена з іншої вкладки!");
  console.log("Ключ:", event.key);
  console.log("Старе значення:", event.oldValue);
  console.log("Нове значення:", event.newValue);
  console.log("URL джерела:", event.url);
});
```

### 8.3. Приклад: синхронізація теми між вкладками

```javascript
// Додаємо обробник до існуючого коду перемикача теми (з Розділу 4)

window.addEventListener("storage", (event) => {
  // Реагуємо лише на зміну ключа "theme"
  if (event.key === "theme" && event.newValue) {
    console.log(`Тему змінено в іншій вкладці на: ${event.newValue}`);
    applyTheme(event.newValue); // Функція з Розділу 4.3
  }

  // Якщо event.key === null — було викликано localStorage.clear()
  if (event.key === null) {
    console.log("localStorage було повністю очищено з іншої вкладки");
    applyTheme("light"); // Повернення до теми за замовчуванням
  }
});
```

Тепер, якщо користувач перемикає тему в одній вкладці, всі інші відкриті вкладки автоматично оновлять свій зовнішній вигляд.

---

## 9. Обмеження та безпека Web Storage

### 9.1. Обсяг сховища та QuotaExceededError

Кожне джерело (origin) має обмежену квоту на зберігання. Перевищення ліміту спричиняє виняток `QuotaExceededError`:

```javascript
// Перевірка приблизного обсягу зайнятого простору
function getStorageSize() {
  let totalBytes = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    // Кожен символ у JavaScript займає 2 байти (UTF-16)
    totalBytes += (key.length + value.length) * 2;
  }

  const totalKB = (totalBytes / 1024).toFixed(2);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(4);
  console.log(`Використано: ${totalKB} КБ (${totalMB} МБ)`);
  return totalBytes;
}

// Безпечний запис із перехопленням помилки квоти
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.error("Сховище переповнене! Необхідно звільнити місце.");
      // Можна спробувати видалити старі або менш важливі дані
      return false;
    }
    throw error; // Перекидаємо інші помилки далі
  }
}
```

### 9.2. Політика Same-Origin (однакового походження)

Web Storage суворо дотримується політики Same-Origin. Два сайти вважаються одним origin, лише якщо збігаються всі три компоненти:

- **протокол** (http vs https);
- **хост** (домен та піддомен);
- **порт**.

```
✅ https://example.com       та https://example.com/about      → Один origin
❌ https://example.com       та http://example.com             → Різні (протокол)
❌ https://example.com       та https://shop.example.com       → Різні (піддомен)
❌ https://example.com       та https://example.com:8080       → Різні (порт)
```

Це означає, що JavaScript-код на одному сайті **не може** читати або змінювати `localStorage` іншого сайту.

### 9.3. Захист від XSS-атак

Оскільки `localStorage` доступний будь-якому JavaScript-коду на сторінці, він **вразливий до XSS-атак** (Cross-Site Scripting). Якщо зловмисник зможе впровадити свій скрипт на вашу сторінку, він отримає повний доступ до `localStorage`:

```javascript
// Приклад того, як XSS-атака може викрасти дані з localStorage
// (цей код демонструє загрозу — НІКОЛИ не зберігайте конфіденційні дані в localStorage!)

// Зловмисник міг би виконати:
const stolen = JSON.stringify(localStorage);
// ...і надіслати дані на свій сервер
```

Рекомендації з безпеки:

- **НІКОЛИ** не зберігайте у `localStorage` паролі, токени автентифікації, номери кредитних карток та іншу конфіденційну інформацію;
- завжди **екрануйте** дані, отримані з `localStorage`, перед вставкою у HTML (функція `escapeHTML()` з Розділу 5.2);
- використовуйте **Content Security Policy (CSP)** для обмеження виконання стороннього JavaScript-коду;
- для зберігання токенів використовуйте **httpOnly cookies** — вони недоступні з JavaScript.

### 9.4. Синхронність операцій

Усі операції Web Storage API є **синхронними** — вони блокують основний потік виконання JavaScript до завершення. Для невеликих обсягів даних це непомітно, але при зчитуванні або записі великих об'ємів (мегабайти даних) це може спричинити «підвисання» інтерфейсу.

```javascript
// Для великих обсягів даних краще розбивати запис на частини
// або використовувати асинхронні альтернативи (IndexedDB)

// Запис великого масиву — може спричинити затримку
const bigArray = new Array(100000).fill("повторюваний рядок даних");
console.time("Запис великого масиву");
localStorage.setItem("bigData", JSON.stringify(bigArray));
console.timeEnd("Запис великого масиву"); // Може зайняти декілька десятків мілісекунд
```

---

## 10. Інструменти розробника для роботи з Web Storage

Сучасні браузери надають зручний візуальний інтерфейс для перегляду та редагування даних Web Storage:

- **Google Chrome / Microsoft Edge:** DevTools → вкладка «Application» → розділ «Storage» → «Local Storage» або «Session Storage»;
- **Mozilla Firefox:** DevTools → вкладка «Storage» → «Local Storage» або «Session Storage».

У DevTools ви можете:

- переглядати всі записи у вигляді таблиці «ключ — значення»;
- вручну додавати, редагувати та видаляти записи;
- очищувати все сховище одним кліком.

Для програмної взаємодії зі сховищем безпосередньо з консолі DevTools:

```javascript
// Перегляд усіх записів localStorage
console.table(Object.entries(localStorage));

// Швидка перевірка конкретного значення
console.log(JSON.parse(localStorage.getItem("todoTasks")));

// Повне очищення сховища (обережно!)
localStorage.clear();
```

---

## Висновки

- проблема збереження стану — JavaScript у браузері за замовчуванням не зберігає дані між сесіями; Web Storage API вирішує цю проблему, надаючи простий інтерфейс «ключ-значення» з обсягом до 5–10 МБ;
- два сховища з різним життєвим циклом — `localStorage` зберігає дані безстроково (до явного видалення), `sessionStorage` — лише до закриття вкладки; вибір залежить від характеру даних;
- серіалізація через JSON — оскільки Web Storage зберігає лише рядки, для роботи з об'єктами та масивами обов'язкове використання `JSON.stringify()` / `JSON.parse()` із обробкою можливих помилок;
- синхронізація між вкладками — подія `storage` дозволяє реагувати на зміни `localStorage` з інших вкладок, що забезпечує узгоджений стан інтерфейсу;
- безпека та обмеження — Web Storage захищений політикою Same-Origin, але вразливий до XSS; конфіденційні дані (паролі, токени) зберігати в ньому категорично заборонено.

## Джерела

- [MDN Web Docs: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN Web Docs: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN Web Docs: Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [MDN Web Docs: StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent)
- [Javascript.info: LocalStorage, sessionStorage](https://uk.javascript.info/localstorage)

## Запитання для самоперевірки

- У чому принципова відмінність між `localStorage` і `sessionStorage` щодо тривалості та області видимості зберігання даних?
- Чому `localStorage` зберігає лише рядки та який механізм використовується для збереження об'єктів і масивів?
- Чому рядок `"false"`, отриманий із `localStorage`, є truthy-значенням і як коректно відновити логічне значення?
- У яких випадках слід використовувати `sessionStorage` замість `localStorage`?
- Як подія `storage` дозволяє синхронізувати стан між кількома відкритими вкладками одного сайту?
- Чому не рекомендується зберігати конфіденційні дані (паролі, токени автентифікації) у `localStorage` та яка альтернатива існує?
- Який виняток виникає при спробі записати дані, що перевищують квоту сховища, та як його коректно обробити?
- У чому перевага використання методів `setItem()` / `getItem()` над крапковою нотацією при роботі з Web Storage?
