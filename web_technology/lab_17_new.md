# Лабораторна робота №17 (2 години)

**Тема:** Керування URL-параметрами, історією браузера та пагінація каталогу.

Інтернет-магазин "TechShop" отримує фільтрацію за категоріями, сортування та посторінкову навігацію, стан яких зберігається в адресному рядку і відновлюється за посиланням, після F5 та кнопками браузера «Назад / Вперед».

**Мета:** Опанувати практичну роботу з URL API, інтерфейсом `URLSearchParams` та History API (`pushState()`, `replaceState()`, подія `popstate`). Навчитися проєктувати єдиний об'єкт стану каталогу, будувати конвеєр обробки даних «фільтрація → сортування → пагінація», синхронізувати стан інтерфейсу з адресним рядком у двох напрямках без перезавантаження сторінки, а також безпечно валідувати параметри, що надходять із зовнішнього URL.

**Технологічний стек:** HTML5, CSS3 (CSS-змінні тем з ЛР №16), JavaScript (ES6+), URL API, `URLSearchParams`, History API, Clipboard API, Fetch API (FakeStore API), Chrome DevTools, Git / GitHub, розширення Live Server для VS Code.

## Завдання

### 1. Перелік завдань

- додати на сторінку каталогу панель керування - випадаючий список категорій, список сортування, кнопку скидання фільтрів, кнопку «Поділитися посиланням» та контейнер пагінації;
- створити єдиний об'єкт стану каталогу `catalogState` із значеннями за замовчуванням та білими списками (Allowlist) допустимих значень;
- реалізувати читання стану з URL через `URLSearchParams` із валідацією кожного параметра (`q`, `category`, `sort`, `page`);
- реалізувати запис стану в URL через `history.pushState()` для дискретних переходів і `history.replaceState()` для живого пошуку;
- побудувати конвеєр обробки товарів: фільтрація за пошуковим запитом і категорією → сортування → нарізка сторінки методом `slice()`;
- реалізувати посторінкову навігацію з кнопками «Попередня / Наступна» та номерами сторінок через делегування подій;
- обробити подію `popstate` для коректної роботи кнопок браузера «Назад / Вперед»;
- замінити обробник живого пошуку з ЛР №15 на новий, інтегрований у загальний стан каталогу, з затримкою (debounce) на основі таймерів з ЛР №11;
- перевірити, що функціональність попередніх робіт (кошик, «Улюблене», Drag-and-Drop, тема, чернетка форми) працює без змін;
- зафіксувати результат у Git та оформити звіт.

### 2. Додаткові завдання (для отримання максимальної оцінки)

- додати фільтр за діапазоном ціни (`minPrice`, `maxPrice`) з відображенням у URL та валідацією через `Number()` і перевірку на `NaN`;
- додати випадаючий список «Товарів на сторінці» (`perPage`: 4, 6, 8, 12) зі збереженням вибору в URL;
- додати сортування за рейтингом покупців (`rating_desc`) з виведенням рейтингу на картці товару;
- реалізувати синхронізацію номера сторінки з клавіатурою (стрілки `←` / `→` перемикають сторінки, якщо фокус не в полі введення).

## Хід виконання роботи

### Крок 1. Підготовка проєкту та аналіз вихідного стану

Скопіюйте проєкт з ЛР №16 у нову папку `web_lab_17` (або продовжуйте роботу в тому самому репозиторії в окремій гілці `lab-17`). Структура проєкту не змінюється:

```text
web_lab_17/
├── assets/
│   ├── css/
│   │   └── style.css       # стилі каталогу, тем, модального вікна + нові стилі панелі та пагінації
│   └── scripts/
│       └── main.js         # логіка каталогу, кошика, Web Storage + новий модуль URL-стану
├── index.html              # головна сторінка: каталог, панель фільтрів, пагінація, кошик
└── readme.md               # опис виконаної роботи
```

Що вже реалізовано у проєкті перед стартом ЛР №17:
- завантаження каталогу - товари завантажуються через Fetch API з FakeStore API у глобальний масив `allProducts` (або `globalStoreProducts`) і відображаються функцією `renderProducts(products)`;
- живий пошук (ЛР №15) - обробник події `input` на полі `#searchInput` фільтрує масив за назвою і викликає `renderProducts()`;
- кошик, «Улюблене» та тема (ЛР №14, №16) - стан зберігається в `localStorage`, чернетка форми замовлення — у `sessionStorage`, синхронізація між вкладками — через подію `storage`.

Проблема, яку ми вирішуємо в цій роботі:
- результати пошуку зникають після F5 - пошуковий запит зберігається лише в полі введення, тому після перезавантаження сторінки користувач знову бачить повний каталог;
- неможливо поділитися вибіркою - адресний рядок завжди містить `index.html` без параметрів, тому колега, відкривши надіслане посилання, побачить зовсім інший вміст;
- кнопка «Назад» не працює всередині каталогу - браузер не знає про зміни фільтрів і замість повернення до попередньої вибірки виводить користувача із сайту;
- каталог не масштабується - усі 20 товарів виводяться однією довгою стрічкою, що незручно на мобільних пристроях і погано працюватиме, коли товарів стане сотні.

Цільовий формат адреси, який ми отримаємо в кінці роботи:

```text
http://127.0.0.1:5500/index.html?q=shirt&category=men%27s+clothing&sort=price_asc&page=2
                                 └──┬──┘ └───────────┬────────────┘ └─────┬──────┘ └──┬──┘
                              пошук (replace)   категорія (push)    сортування (push) сторінка (push)
```

> [!IMPORTANT]
> Обов'язково відкривайте проєкт через **Live Server** (адреса `http://127.0.0.1:5500/...`), а не подвійним кліком по файлу (`file:///...`). Для протоколу `file:` браузер Chrome вважає джерело (origin) непрозорим (`null`), і виклик `history.pushState()` може завершитися помилкою `SecurityError`.

> [!NOTE]
> У прикладах нижче головний скрипт позначається як `assets/scripts/main.js`, а масив товарів — `allProducts`. Якщо у вашому проєкті використовується `globalStoreProducts`, `#num` чи інші ідентифікатори — залишайте свої назви.

---

### Крок 2. Розмітка панелі керування каталогом і контейнера пагінації

У файлі `index.html` знайдіть блок пошуку `.search-bar`, створений у ЛР №15, і замініть його розширеною панеллю керування. Контейнер пагінації розмістіть одразу **після** сітки товарів `.products-grid`:

```html
<!-- Панель керування каталогом (замінює .search-bar з ЛР №15) -->
<section class="catalog-toolbar" aria-label="Фільтри каталогу">
  <input
    type="search"
    id="searchInput"
    class="toolbar-control"
    placeholder="Пошук за назвою товару..."
    maxlength="50"
    autocomplete="off"
  >

  <select id="categorySelect" class="toolbar-control" aria-label="Категорія">
    <option value="all">Усі категорії</option>
    <!-- Решта категорій додається динамічно з JavaScript -->
  </select>

  <select id="sortSelect" class="toolbar-control" aria-label="Сортування">
    <option value="default">За замовчуванням</option>
    <option value="price_asc">Ціна: від дешевих до дорогих</option>
    <option value="price_desc">Ціна: від дорогих до дешевих</option>
    <option value="title_asc">Назва: А → Я</option>
    <option value="rating_desc">Рейтинг: найкращі спочатку</option>
  </select>

  <button type="button" id="resetFiltersBtn" class="btn btn-secondary">Скинути</button>
  <button type="button" id="shareLinkBtn" class="btn btn-secondary">🔗 Поділитися</button>
</section>

<!-- Інформаційний рядок: "Показано 7–12 з 20 товарів" -->
<p id="catalogInfo" class="catalog-info" aria-live="polite"></p>

<!-- Існуюча сітка товарів з попередніх робіт -->
<div class="products-grid"></div>

<!-- Новий контейнер посторінкової навігації -->
<nav id="pagination" class="pagination" aria-label="Сторінки каталогу"></nav>
```

Додайте стилі у кінець файлу `assets/css/style.css`. Зверніть увагу, що використовуються CSS-змінні з ЛР №16, тому панель автоматично підлаштовується під темну тему:

```css
/* ===== ЛР №17: панель керування каталогом ===== */
.catalog-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 20px 0 8px;
}

.toolbar-control {
  padding: 10px 12px;
  min-width: 200px;
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
}

#searchInput {
  flex: 1 1 260px;
}

.btn-secondary {
  padding: 10px 14px;
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.catalog-info {
  margin: 0 0 16px;
  color: var(--text-muted);
  font-size: 14px;
}

/* ===== ЛР №17: пагінація ===== */
.pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 28px 0;
}

.pagination:empty {
  display: none;
}

.page-btn {
  min-width: 40px;
  padding: 8px 12px;
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
}

.page-btn.is-active {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

---

### Крок 3. Єдиний об'єкт стану каталогу та білі списки значень

Ключова ідея роботи: **інтерфейс каталогу повністю описується одним об'єктом стану**. Поля пошуку, списки, сітка товарів і пагінація — лише різні «проєкції» цього об'єкта, а URL — його текстова копія.

```text
                    ┌──────────────────────────────┐
  URL (?q=&page=) ─►│  catalogState                │─► renderProducts()
  readStateFromURL  │  { q, category, sort, page } │─► renderPagination()
                    └──────────────┬───────────────┘─► renderCatalogInfo()
                                   │
                                   ▼ syncURL('push' | 'replace')
                       history.pushState / replaceState
```

На початку файлу `assets/scripts/main.js` (після оголошення `allProducts`) додайте модуль стану:

```javascript
// ===================== ЛР №17: стан каталогу =====================

// Значення за замовчуванням. Object.freeze() захищає їх від випадкової мутації
const CATALOG_DEFAULTS = Object.freeze({
  q: '',            // пошуковий запит
  category: 'all',  // категорія товару
  sort: 'default',  // критерій сортування
  page: 1           // номер сторінки пагінації
});

// Білий список (Allowlist) допустимих значень сортування
const ALLOWED_SORTS = ['default', 'price_asc', 'price_desc', 'title_asc', 'rating_desc'];

// Кількість товарів на одній сторінці
const PRODUCTS_PER_PAGE = 6;

// Максимальна довжина пошукового запиту (захист від надто довгих URL)
const MAX_QUERY_LENGTH = 50;

// Поточний стан каталогу: створюємо поверхневу копію дефолтів через spread
let catalogState = { ...CATALOG_DEFAULTS };

// Посилання на елементи панелі керування
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const shareLinkBtn = document.getElementById('shareLinkBtn');
const paginationContainer = document.getElementById('pagination');
const catalogInfo = document.getElementById('catalogInfo');
```

> [!NOTE]
> Константа `searchInput` уже оголошена у вашому коді з ЛР №15 (`const searchInput = document.getElementById('searchInput');`). Не оголошуйте її повторно, інакше отримаєте помилку `SyntaxError: Identifier 'searchInput' has already been declared`.

---

### Крок 4. Читання та валідація стану з адресного рядка (`URLSearchParams`)

Будь-який параметр в адресному рядку може бути змінений користувачем вручну або підроблений у надісланому посиланні. Тому значення з URL **ніколи не використовуються напряму** — кожне з них проходить перевірку і при помилці замінюється значенням за замовчуванням.

```javascript
// Читає стан каталогу з поточного URL та валідує кожен параметр
function readStateFromURL() {
  const params = new URLSearchParams(window.location.search);

  // 1. Пошуковий запит: обрізаємо пробіли та довжину
  const q = (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);

  // 2. Категорія: остаточна перевірка виконується після завантаження товарів
  const category = params.get('category') || CATALOG_DEFAULTS.category;

  // 3. Сортування: дозволені лише значення з білого списку
  const rawSort = params.get('sort');
  const sort = ALLOWED_SORTS.includes(rawSort) ? rawSort : CATALOG_DEFAULTS.sort;

  // 4. Сторінка: лише ціле додатне число, інакше — 1
  const rawPage = Number.parseInt(params.get('page'), 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : CATALOG_DEFAULTS.page;

  return { q, category, sort, page };
}

// Повертає масив унікальних категорій із завантажених товарів
function getAvailableCategories(products) {
  // Set автоматично прибирає дублікати
  return [...new Set(products.map(product => product.category))];
}

// Перевіряє, чи існує категорія з URL у реальному каталозі
function validateCategory(category) {
  const categories = getAvailableCategories(allProducts);
  return categories.includes(category) ? category : CATALOG_DEFAULTS.category;
}
```

Перевірте роботу функції в консолі DevTools, додавши до адреси `?sort=hack&page=-5&category=xyz`:

```javascript
readStateFromURL();
// { q: '', category: 'xyz', sort: 'default', page: 1 }
validateCategory('xyz');
// 'all'
```

---

### Крок 5. Запис стану в URL: `pushState()` проти `replaceState()`

Функція `syncURL()` перетворює об'єкт стану на рядок параметрів. Щоб адреса була короткою й охайною, параметри зі значенням за замовчуванням **не записуються** в URL.

```javascript
// Формує об'єкт URL на основі поточного стану каталогу
function buildCatalogURL(state) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  // Записуємо лише ті параметри, що відрізняються від значень за замовчуванням
  if (state.q) params.set('q', state.q);
  if (state.category !== CATALOG_DEFAULTS.category) params.set('category', state.category);
  if (state.sort !== CATALOG_DEFAULTS.sort) params.set('sort', state.sort);
  if (state.page !== CATALOG_DEFAULTS.page) params.set('page', String(state.page));

  // URLSearchParams автоматично кодує пробіли, апострофи та кирилицю
  url.search = params.toString();
  return url;
}

// Синхронізує адресний рядок зі станом каталогу
// mode: 'push' — новий запис в історії, 'replace' — заміна поточного запису
function syncURL(mode = 'push') {
  const newURL = buildCatalogURL(catalogState);

  // Якщо адреса не змінилася — не створюємо дублікат запису в історії
  if (newURL.href === window.location.href) return;

  // Передаємо копію стану як history.state (знадобиться для налагодження)
  const stateSnapshot = { ...catalogState };

  if (mode === 'replace') {
    history.replaceState(stateSnapshot, '', newURL);
  } else {
    history.pushState(stateSnapshot, '', newURL);
  }
}
```

Правило вибору методу History API у нашому каталозі:
- `pushState()` - для дискретних дій, до яких користувач може захотіти повернутися кнопкою «Назад»: вибір категорії, зміна сортування, перехід на іншу сторінку, скидання фільтрів;
- `replaceState()` - для потокових змін, які відбуваються на кожне натискання клавіші (живий пошук), а також для «тихої» нормалізації некоректної адреси під час першого завантаження; інакше введення слова `laptop` створило б шість записів в історії.

---

### Крок 6. Конвеєр обробки даних: фільтрація → сортування → пагінація

Розділимо обробку на три **чисті функції**, які не змінюють вихідний масив `allProducts`, а щоразу повертають новий. Порядок етапів принциповий: спочатку відбираємо товари, потім упорядковуємо, і лише в кінці «нарізаємо» сторінку.

```javascript
// Етап 1. Фільтрація за пошуковим запитом та категорією
function filterProducts(products, { q, category }) {
  const normalizedQuery = q.toLowerCase();

  return products.filter(product => {
    const matchesQuery = product.title.toLowerCase().includes(normalizedQuery);
    const matchesCategory = category === 'all' || product.category === category;
    return matchesQuery && matchesCategory;
  });
}

// Етап 2. Сортування (працюємо з копією, бо sort() мутує масив!)
function sortProducts(products, sort) {
  const sorted = [...products];

  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'title_asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'rating_desc':
      // Опціональний ланцюжок ?. захищає від товарів без рейтингу
      return sorted.sort((a, b) => (b.rating?.rate ?? 0) - (a.rating?.rate ?? 0));
    default:
      return sorted; // порядок, у якому товари прийшли з сервера
  }
}

// Етап 3. Пагінація: обчислення меж сторінки та нарізка slice()
function paginateProducts(products, page, perPage) {
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  // Обмежуємо номер сторінки діапазоном [1; totalPages]
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  return {
    items: products.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage,
    startIndex
  };
}
```

Математика пагінації на прикладі 20 товарів і 6 товарів на сторінці:

| Сторінка | `startIndex = (page − 1) × 6` | `endIndex = startIndex + 6` | Індекси товарів | Кількість |
| :---: | :---: | :---: | :---: | :---: |
| 1 | 0 | 6 | 0–5 | 6 |
| 2 | 6 | 12 | 6–11 | 6 |
| 3 | 12 | 18 | 12–17 | 6 |
| 4 | 18 | 24 | 18–19 | 2 |

Кількість сторінок обчислюється як `Math.ceil(20 / 6) = 4`. Метод `slice(18, 24)` не викидає помилку при виході за межі масиву, а просто повертає два останні елементи.

---

### Крок 7. Центральна функція оновлення каталогу та рендеринг пагінації

Функція `updateCatalog()` — єдина точка, через яку проходить будь-яка зміна вітрини. Вона запускає конвеєр, оновлює DOM і (за потреби) синхронізує URL.

```javascript
// Головна функція: стан → конвеєр → DOM → URL
function updateCatalog(historyMode = null) {
  const filtered = filterProducts(allProducts, catalogState);
  const sorted = sortProducts(filtered, catalogState.sort);
  const { items, totalItems, totalPages, currentPage, startIndex } =
    paginateProducts(sorted, catalogState.page, PRODUCTS_PER_PAGE);

  // Якщо в URL була неіснуюча сторінка (наприклад, ?page=99) — виправляємо стан
  if (currentPage !== catalogState.page) {
    catalogState.page = currentPage;
    historyMode = historyMode || 'replace';
  }

  // Функція renderProducts() з ЛР №15 — тепер отримує лише товари поточної сторінки
  renderProducts(items);
  renderPagination(currentPage, totalPages);
  renderCatalogInfo(totalItems, startIndex, items.length);

  if (historyMode) {
    syncURL(historyMode);
  }
}

// Інформаційний рядок над каталогом
function renderCatalogInfo(totalItems, startIndex, shownCount) {
  if (!catalogInfo) return;

  if (totalItems === 0) {
    // textContent замість innerHTML: запит із URL не буде виконано як HTML-код (захист від XSS)
    catalogInfo.textContent = catalogState.q
      ? `За запитом «${catalogState.q}» нічого не знайдено`
      : 'У цій категорії поки немає товарів';
    return;
  }

  const from = startIndex + 1;
  const to = startIndex + shownCount;
  catalogInfo.textContent = `Показано ${from}–${to} з ${totalItems} товарів`;
}

// Генерація кнопок пагінації
function renderPagination(currentPage, totalPages) {
  if (!paginationContainer) return;

  // Якщо сторінка одна — пагінація не потрібна
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  // Масив номерів [1, 2, ..., totalPages]
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  paginationContainer.innerHTML = `
    <button class="page-btn" data-page="${currentPage - 1}"
      ${currentPage === 1 ? 'disabled' : ''} aria-label="Попередня сторінка">‹</button>

    ${pageNumbers.map(number => `
      <button class="page-btn ${number === currentPage ? 'is-active' : ''}"
        data-page="${number}"
        ${number === currentPage ? 'aria-current="page"' : ''}>${number}</button>
    `).join('')}

    <button class="page-btn" data-page="${currentPage + 1}"
      ${currentPage === totalPages ? 'disabled' : ''} aria-label="Наступна сторінка">›</button>
  `;
}
```

Обробку кліків по кнопках пагінації реалізуйте через **делегування подій** (ЛР №14): один слухач на контейнері замість окремого слухача на кожній кнопці, яка щоразу перестворюється.

```javascript
if (paginationContainer) {
  paginationContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.page-btn');
    if (!button || button.disabled) return;

    const targetPage = Number(button.dataset.page);
    if (targetPage === catalogState.page) return;

    catalogState.page = targetPage;
    updateCatalog('push'); // перехід між сторінками — новий запис в історії

    // Прокручуємо до початку каталогу, щоб користувач бачив нові товари
    document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'smooth' });
  });
}
```

---

### Крок 8. Обробники елементів керування та живий пошук із затримкою

**Видаліть** зі скрипта старий обробник `searchInput.addEventListener('input', ...)` з ЛР №15. Якщо залишити обидва, вони конфліктуватимуть: старий виводитиме всі знайдені товари без пагінації.

Для пошуку застосуємо прийом **debounce** — відкладене виконання на основі `setTimeout()` / `clearTimeout()`, з якими ви працювали в ЛР №11. Каталог оновлюється лише тоді, коли користувач зробив паузу у введенні на 300 мс.

```javascript
// Універсальна функція затримки виклику (debounce)
function debounce(callback, delay = 300) {
  let timerId = null;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
}

// Перенесення значень стану в елементи керування (потрібно при старті та popstate)
function applyStateToControls() {
  if (searchInput) searchInput.value = catalogState.q;
  if (categorySelect) categorySelect.value = catalogState.category;
  if (sortSelect) sortSelect.value = catalogState.sort;
}

// 1. Живий пошук: replaceState, щоб не засмічувати історію
if (searchInput) {
  const handleSearch = debounce((value) => {
    catalogState.q = value.trim().slice(0, MAX_QUERY_LENGTH);
    catalogState.page = 1; // новий запит — завжди з першої сторінки
    updateCatalog('replace');
  }, 300);

  searchInput.addEventListener('input', (event) => handleSearch(event.target.value));
}

// 2. Категорія: pushState
if (categorySelect) {
  categorySelect.addEventListener('change', (event) => {
    catalogState.category = event.target.value;
    catalogState.page = 1; // інакше можна опинитися на неіснуючій сторінці нової вибірки
    updateCatalog('push');
  });
}

// 3. Сортування: pushState
if (sortSelect) {
  sortSelect.addEventListener('change', (event) => {
    catalogState.sort = event.target.value;
    catalogState.page = 1;
    updateCatalog('push');
  });
}

// 4. Скидання всіх фільтрів до значень за замовчуванням
if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', () => {
    catalogState = { ...CATALOG_DEFAULTS };
    applyStateToControls();
    updateCatalog('push');
  });
}
```

> [!WARNING]
> Скидання сторінки на `1` при зміні пошуку, категорії чи сортування — обов'язкове правило. Якщо користувач був на 4-й сторінці повного каталогу й обрав категорію з 5 товарами (одна сторінка), без скидання він побачив би порожню вітрину.

---

### Крок 9. Обробка кнопок «Назад / Вперед»: подія `popstate`

Коли користувач натискає кнопку «Назад», браузер змінює URL на попередній запис історії та генерує подію `popstate`. Сторінка при цьому **не перезавантажується**, тому відновити вітрину ми маємо самостійно.

```javascript
window.addEventListener('popstate', (event) => {
  // event.state містить знімок, переданий у pushState (корисно для налагодження)
  console.log('popstate → history.state:', event.state);

  // Надійніше перечитати стан з URL: так коректно обробляються і записи,
  // створені вручну або до завантаження скрипта (у них event.state === null)
  catalogState = readStateFromURL();
  catalogState.category = validateCategory(catalogState.category);

  applyStateToControls();
  updateCatalog(); // БЕЗ аргументу: при навігації по історії нічого не записуємо в неї
});
```

> [!CAUTION]
> Ніколи не викликайте `pushState()` всередині обробника `popstate`. Це додасть новий запис замість переходу по історії, і кнопка «Вперед» перестане працювати, а користувач потрапить у «петлю» між двома станами.

---

### Крок 10. Інтеграція з функцією `initShop()` та динамічний список категорій

Категорії не прописуються в HTML вручну: вони обчислюються з реальних даних сервера. Тоді при появі нової категорії в API вона автоматично з'явиться у фільтрі.

```javascript
// Заповнення списку категорій на основі завантажених товарів
function populateCategorySelect(products) {
  if (!categorySelect) return;

  const categories = getAvailableCategories(products);

  // Залишаємо пункт "Усі категорії" і додаємо решту
  categorySelect.innerHTML = '<option value="all">Усі категорії</option>';

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    // textContent — безпечне виведення даних, отриманих із зовнішнього API
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.append(option);
  });
}
```

Модифікуйте функцію `initShop()`: замість прямого виклику `renderProducts(data)` тепер спочатку відновлюється стан із URL, а вже потім запускається конвеєр.

```javascript
async function initShop() {
  // ... показ спінера (loader) з попередніх робіт
  const data = await fetchProducts();
  allProducts = data;            // або globalStoreProducts = data;
  loader.classList.add('hidden');

  // ЛР №17: 1. Будуємо список категорій з реальних даних
  populateCategorySelect(allProducts);

  // ЛР №17: 2. Відновлюємо стан каталогу з адресного рядка
  catalogState = readStateFromURL();
  catalogState.category = validateCategory(catalogState.category);

  // ЛР №17: 3. Переносимо стан у поля фільтрів
  applyStateToControls();

  // ЛР №17: 4. Рендеримо каталог; 'replace' виправить некоректні параметри в URL
  updateCatalog('replace');

  // ЛР №16: відновлення зони "Улюблене" (залишається без змін)
  renderFavoritesZone();
}
```

Зверніть увагу: зона «Улюблене» та кошик працюють з повним масивом `allProducts`, а не з поточною сторінкою, тому товар, доданий в «Улюблене» на 1-й сторінці, відображається там і при перегляді 3-ї сторінки. Drag-and-Drop і кнопки «Купити» продовжують працювати, бо їхні обробники делеговані на контейнер `.products-grid`, який не перестворюється.

---

### Крок 11. Кнопка «Поділитися посиланням» (Clipboard API)

Тепер адреса повністю описує вибірку, тому її можна скопіювати й надіслати. Реалізуємо копіювання поточного URL одним кліком:

```javascript
if (shareLinkBtn) {
  shareLinkBtn.addEventListener('click', async () => {
    const originalText = shareLinkBtn.textContent;

    try {
      // Clipboard API доступний лише в безпечному контексті (https або localhost / 127.0.0.1)
      await navigator.clipboard.writeText(window.location.href);
      shareLinkBtn.textContent = '✅ Скопійовано';
    } catch (error) {
      console.error('Не вдалося скопіювати посилання:', error);
      // Запасний варіант: показуємо адресу для ручного копіювання
      window.prompt('Скопіюйте посилання вручну:', window.location.href);
    }

    // Повертаємо текст кнопки через 2 секунди
    setTimeout(() => {
      shareLinkBtn.textContent = originalText;
    }, 2000);
  });
}
```

---

### Крок 12. Тестування сценаріїв та збереження результатів (Commit & Push)

Виконайте послідовно всі сценарії перевірки та зробіть скріншоти для звіту:
- відновлення після F5 - оберіть категорію, сортування «Ціна: від дешевих до дорогих» і перейдіть на 2-гу сторінку; натисніть F5 і переконайтеся, що вітрина, списки та номер сторінки відновилися;
- спільний доступ - натисніть «Поділитися», відкрийте нову вкладку в режимі інкогніто (`Ctrl + Shift + N`) і вставте посилання; вибірка має бути ідентичною;
- навігація по історії - змініть послідовно категорію, сортування і сторінку, потім кілька разів натисніть «Назад» і «Вперед» у браузері; кожен крок має відновлювати попередній стан без перезавантаження сторінки;
- живий пошук - введіть слово `jacket` і переконайтеся, що адресний рядок оновлюється, але в історії не з'являються окремі записи для кожної літери (одне натискання «Назад» повертає стан до початку пошуку);
- захист від некоректних параметрів - вручну введіть адресу `index.html?sort=hack&page=999&category=cars`; сторінка має відобразити коректну вибірку, а адреса автоматично виправитися;
- перевірка XSS - введіть адресу `index.html?q=<img src=x onerror=alert(1)>`; повідомлення має відобразитися як звичайний текст без спливаючого вікна `alert`;
- регресійне тестування - перевірте, що кошик, «Улюблене», Drag-and-Drop, перемикач теми та чернетка форми замовлення працюють так само, як після ЛР №16;
- аудит у DevTools - у консолі виконайте `history.length` та `history.state` після кількох переходів і поясніть отримані значення у звіті.

Зафіксуйте зміни в системі контролю версій:

```bash
git add .
git commit -m "Lab 17: URL state, History API navigation, catalog filters, sorting and pagination"
git push origin master
```

### Контрольні запитання

- чому стан фільтрів, сортування та номер сторінки каталогу зберігається в URL, а вміст кошика і тема оформлення — у `localStorage`?
- у чому різниця між методами `URLSearchParams.get()`, `set()`, `append()` і `delete()`, та чому для формування адреси зручніше використовувати `URLSearchParams`, ніж склеювати рядок вручну?
- чому зміна `window.location.search` призводить до перезавантаження сторінки, а виклик `history.pushState()` — ні?
- за яким принципом у роботі обрано `pushState()` для зміни категорії та сторінки і `replaceState()` для живого пошуку?
- у який момент генерується подія `popstate`, чому вона не спрацьовує під час виклику `pushState()` і чому в її обробнику не можна записувати нові стани в історію?
- чому в конвеєрі обробки нарізка сторінки `slice()` виконується після фільтрації та сортування, а не до них?
- як обчислюються `startIndex`, `endIndex` і загальна кількість сторінок, і що поверне `slice()`, якщо `endIndex` перевищує довжину масиву?
- навіщо в функції `sortProducts()` створюється копія масиву `[...products]` перед викликом `sort()`?
- які загрози виникають при використанні параметрів URL без валідації і які прийоми захисту застосовано в роботі (білий список, `parseInt` з перевіркою, `textContent`)?
- чому при зміні пошукового запиту, категорії або сортування номер сторінки обов'язково скидається на `1`?
- як працює прийом debounce і яку проблему він вирішує під час живого пошуку?

### Вимоги до звіту

- посилання на GitHub-репозиторій з виконаною роботою (гілка `master` або `lab-17`) надіслати в Google Classroom;
- у файлі `lab17.md` у корені репозиторію навести фрагменти коду функцій `readStateFromURL()`, `syncURL()`, `paginateProducts()` та обробника події `popstate` з короткими поясненнями;
- у файлі `lab17.md` розмістити скріншоти: адресного рядка з параметрами фільтрації, вітрини на 2-й сторінці, результату перевірки некоректних параметрів і XSS-рядка, консолі з виведенням `history.state`;
- у файлі `lab17.md` дати письмові відповіді на контрольні запитання;
- за виконання додаткових завдань — описати їх реалізацію окремим розділом звіту з прикладом адреси (наприклад, `?minPrice=20&maxPrice=100&perPage=8`).
