# Лабораторне заняття №16 (2 години). Збереження даних користувача та робота з Web Storage API.

## Мета

Опанувати практичні навички роботи з механізмами клієнтського сховища браузера Web Storage API (`localStorage` та `sessionStorage`). Навчитися серіалізувати складні структури даних (масиви та об'єкти) за допомогою `JSON.stringify()` та відновлювати їх через `JSON.parse()`. Створити постійну "пам'ять" для інтернет-магазину "TechShop": реалізувати збереження обраної теми оформлення (світла/темна), забезпечити персистентність стану кошика та списку улюблених товарів при перезавантаженні сторінки або переході між документами, впровадити автозбереження чернетки форми у сесійне сховище та налаштувати міжвкладочну реактивну синхронізацію через подію `storage`.

## План

- архітектура та обмеження Web Storage API - порівняльний аналіз `localStorage`, `sessionStorage`, `Cookies` та `IndexedDB`, ліміти пам'яті (5–10 МБ), принцип ізоляції Same-Origin Policy та аспекти безпеки (захист від XSS);
- серіалізація та відновлення стану даних - робота з методами `setItem()`, `getItem()`, `removeItem()`, `clear()`, серіалізація масивів об'єктів у JSON-рядки та безпечне парсинг із перехопленням винятків `try...catch`;
- створення глобальної пам'яті інтерфейсу (перемикач Dark/Light теми) - створення кнопки зміни теми, стилізація за допомогою CSS-змінних, збереження вибору користувача в `localStorage` та усунення артефакту блимання теми при завантаженні (FOUC);
- забезпечення довготривалої пам'яті кошика покупок - інтеграція автоматичного збереження масиву `cart` у `localStorage` при будь-якій модифікації (додавання, зміна кількості, видалення) та відновлення кошика при старті додатку;
- персистентність списку "Улюблене" (Favorites) - збереження товарів, перетягнутих у зону Drag-and-Drop, у клієнтському сховищі;
- автозбереження чернетки оформлення замовлення у `sessionStorage` - збереження введених полів форми (ПІБ, телефон, email, промокод) на час активного сеансу та їх очищення після завершення покупки;
- міжвкладочна синхронізація через подію `storage` - автоматичне оновлення інтерфейсу та лічильника кошика у паралельно відкритих вкладках без перезавантаження;
- аудит сховищ у Chrome DevTools, тестування сценаріїв очищення та фіксація змін у Git.

## Початкові вимоги та структура проєкту

Для виконання цієї роботи використовується кодова база інтернет-магазину "TechShop", розвинена у лабораторних заняттях №14 та №15:

```text
web_lab_16/
├── assets/
│   ├── css/
│   │   └── style.css       # стилі каталогу, модального вікна, форми та CSS-змінні тем
│   └── scripts/
│       └── main.js         # логіка каталогу, пошуку, валідації та Web Storage
├── index.html              # головна сторінка з каталогом, кошиком та перемикачем теми
└── readme.md               # опис виконаної роботи
```

### Що вже реалізовано у проєкті перед стартом ЛР №16:

- каталог товарів - товари завантажуються через Fetch API (`globalStoreProducts` або `allProducts`), формуються за допомогою `renderProducts()` та підтримують живий пошук;
- делегування подій та Drag-and-Drop - кнопки "Купити" обробляються через контейнер `.products-grid`, реалізовано перетягування карток товарів у зону "Улюблене" (`#favoritesZone`);
- кошик та валідація форми - стан кошика зберігається у масиві `let cart = []`, вартість та кількість агрегуються функцією `updateCartSummary()`, а форма замовлення у модальному вікні валідує поля перед оформленням;
- головна проблема, яку ми вирішуємо - при оновленні сторінки (F5) або випадковому закритті вкладки масив `cart` скидався до `[]`, зона улюбленого очищалася, а введена покупцем інформація у формі безповоротно зникала, оскільки всі змінні зберігалися лише в оперативній пам'яті (RAM) середовища виконання JavaScript.

> [!NOTE]
> У прикладах нижче головний скрипт позначається як `assets/scripts/main.js` (або `app.js`), а масив товарів — `allProducts` (або `globalStoreProducts`). Використовуйте ідентифікатори та змінні, прийняті у вашому проєкті.

---

## Хід роботи

### 1. Теоретичні засади Web Storage API: `localStorage` проти `sessionStorage`

Web Storage API надає веб-додаткам механізм збереження пар "ключ-значення" безпосередньо у браузері користувача. На відміну від традиційних кукі (Cookies), дані Web Storage не відправляються на сервер із кожним HTTP-запитом, що знижує мережеве навантаження та підвищує швидкодію.

Порівняльний аналіз клієнтських сховищ:
- обсяг сховища - `localStorage` та `sessionStorage` надають близько 5–10 МБ дискового простору на домен (порівняно з обмеженням 4 КБ для Cookies);
- життєвий цикл даних:
  - `localStorage` - постійне (персистентне) сховище; дані зберігаються безстроково, переживають перезавантаження сторінки, закриття вкладки, закриття браузера і навіть перезавантаження операційної системи; видаляються виключно програмно або вручну користувачем через очищення історії браузера;
  - `sessionStorage` - сесійне сховище; дані існують виключно протягом життєвого циклу поточної вкладки браузера (сесії); при оновленні вкладки (F5) або перенаправленні за посиланнями дані зберігаються, проте при закритті вкладки автоматично безповоротно знищуються;
- ізоляція та безпека (Same-Origin Policy) - сховище жорстко прив'язане до джерела (комбінація протоколу, домену та порту: `http://localhost:3000` і `https://myshop.ua` мають абсолютно ізольовані сховища);
- обмеження типів даних - Web Storage зберігає виключно рядкові дані (DOMString); спроба зберегти число, об'єкт або масив призводить до автоматичного виклику методу `.toString()`, тому для структурних даних є обов'язковою JSON-серіалізація.

Базовий інтерфейс методів Storage:
- `storage.setItem(key, value)` - запис значення за ключем;
- `storage.getItem(key)` - читання рядкового значення (повертає `null`, якщо ключ відсутній);
- `storage.removeItem(key)` - видалення конкретного запису;
- `storage.clear()` - повне очищення всього сховища поточного домену;
- `storage.length` та `storage.key(index)` - визначення кількості збережених записів та читання ключа за індексом.

---

### 2. Реалізація перемикача темної та світлої теми (Theme Switcher) у `localStorage`

Збереження візуальних уподобань користувача — класичний приклад застосування `localStorage`.

Крок 2.1. Додавання розмітки перемикача теми у шапку сайту.

У файлі `index.html` всередині тегу `<header>` поруч із кнопкою кошика додайте кнопку зміни теми:

```html
<!-- Кнопка перемикання теми оформлення -->
<button id="themeToggleBtn" class="btn btn-theme" aria-label="Перемкнути тему">
  <span class="theme-icon">🌙</span>
  <span class="theme-text">Темна тема</span>
</button>
```

Крок 2.2. Налаштування CSS-змінних у `assets/css/style.css`.

Визначте колірні палітри для світлої та темної тем за допомогою кастомних CSS-властивостей:

```css
/* Базова світла тема за замовчуванням */
:root {
  --bg-primary: #f8f9fa;
  --bg-card: #ffffff;
  --text-main: #212529;
  --text-muted: #6c757d;
  --border-color: #dee2e6;
  --accent-color: #007bff;
  --modal-bg: rgba(0, 0, 0, 0.6);
}

/* Перевизначення змінних для темної теми */
body.dark-theme {
  --bg-primary: #121212;
  --bg-card: #1e1e1e;
  --text-main: #f1f3f5;
  --text-muted: #adb5bd;
  --border-color: #343a40;
  --accent-color: #339af0;
  --modal-bg: rgba(0, 0, 0, 0.85);
}

/* Застосування змінних до базових елементів магазину */
body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.product-card,
.modal-window,
.favorites-zone {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.btn-theme {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
```

Крок 2.3. Логіка ініціалізації та перемикання теми у `assets/scripts/main.js`:

```javascript
const themeToggleBtn = document.getElementById('themeToggleBtn');
const THEME_STORAGE_KEY = 'techshop_theme';

// 1. Функція встановлення та синхронізації теми
function applyTheme(themeName) {
  const themeIcon = themeToggleBtn?.querySelector('.theme-icon');
  const themeText = themeToggleBtn?.querySelector('.theme-text');

  if (themeName === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Світла тема';
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Темна тема';
  }
}

// 2. Ініціалізація теми при старті сторінки (перевірка сховища та системних налаштувань ОС)
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme) {
    // Якщо користувач уже вибирав тему раніше — застосовуємо її
    applyTheme(savedTheme);
  } else {
    // Якщо вибору немає — перевіряємо системне налаштування темної теми в ОС користувача
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

// 3. Обробник кліку на перемикач
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark-theme');
    const newTheme = isCurrentlyDark ? 'light' : 'dark';

    applyTheme(newTheme);
    // Зберігаємо вибір у localStorage для довготривалої пам'яті
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  });
}

// Викликаємо ініціалізацію теми на початку роботи
initTheme();
```

> [!TIP]
> Щоб уникнути неприємного білого "спалаху" (FOUC — Flash of Unstyled Content) при завантаженні темної теми, виклик `initTheme()` або короткий інлайн-скрипт зчитування `localStorage.getItem('techshop_theme')` рекомендується розташовувати у секції `<head>` ще до повного завантаження DOM-дерева.

---

### 3. Довготривале збереження та відновлення стану кошика покупок

У попередніх лабораторних роботах кошик існував виключно у вигляді масиву `let cart = []`. Якщо користувач оновлював сторінку, всі додані товари безповоротно зникали. Тепер ми зробимо стан кошика стійким.

Крок 3.1. Універсальні функції читання та запису даних кошика.

У файлі `assets/scripts/main.js` створіть модуль збереження стану:

```javascript
const CART_STORAGE_KEY = 'techshop_cart';

// 1. Безпечне зчитування кошика з localStorage із захистом від пошкодженого JSON
function loadCartFromStorage() {
  const rawData = localStorage.getItem(CART_STORAGE_KEY);
  if (!rawData) {
    return []; // якщо сховище порожнє — повертаємо чистий масив
  }

  try {
    const parsedCart = JSON.parse(rawData);
    // Переконуємося, що в сховищі дійсно зберігся масив, а не довільний об'єкт чи примітив
    if (Array.isArray(parsedCart)) {
      return parsedCart;
    }
    return [];
  } catch (error) {
    console.error('Помилка парсингу кошика з localStorage:', error);
    // У разі пошкодження формату безпечно очищаємо некоректний запис
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

// 2. Серіалізація та запис актуального масиву cart у сховище
function saveCartToStorage() {
  try {
    const serializedData = JSON.stringify(cart);
    localStorage.setItem(CART_STORAGE_KEY, serializedData);
  } catch (error) {
    console.error('Помилка збереження кошика у Web Storage:', error);
  }
}
```

Крок 3.2. Модифікація життєвого циклу кошика.

Тепер ініціалізуйте масив `cart` не порожнім значенням, а даними зі сховища, та додайте виклики `saveCartToStorage()` у всі точки зміни стану:

```javascript
// 1. Ініціалізація глобального масиву cart зі сховища:
let cart = loadCartFromStorage();

// 2. Оновлення функції додавання товару в кошик (addToCart):
function addToCart(productId) {
  // Знаходимо товар у загальному масиві (allProducts або globalStoreProducts)
  const product = allProducts.find(item => item.id === Number(productId));
  if (!product) return;

  const existingCartItem = cart.find(item => item.id === product.id);

  if (existingCartItem) {
    existingCartItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  // Обов'язково фіксуємо зміни у localStorage:
  saveCartToStorage();

  // Оновлюємо UI (бейдж кількості та підсумкову суму)
  updateCartSummary();
  if (typeof renderCartModalItems === 'function') {
    renderCartModalItems();
  }
}

// 3. Оновлення функції зміни кількості (changeQuantity):
function changeCartQuantity(productId, delta) {
  const itemIndex = cart.findIndex(item => item.id === Number(productId));
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;

  // Якщо кількість впала до 0 або менше — видаляємо позицію з кошика
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  // Синхронізуємо зі сховищем та оновлюємо екран
  saveCartToStorage();
  updateCartSummary();
  if (typeof renderCartModalItems === 'function') {
    renderCartModalItems();
  }
}

// 4. Оновлення функції повного очищення кошика (clearCart):
function clearCart() {
  cart = [];
  // Очищаємо запис кошика з localStorage
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartSummary();
  if (typeof renderCartModalItems === 'function') {
    renderCartModalItems();
  }
}
```

Крок 3.3. Відновлення інтерфейсу кошика при завантаженні сторінки:

```javascript
// Обов'язково викликаємо перерахунок суми та бейджів одразу при старті скрипта:
document.addEventListener('DOMContentLoaded', () => {
  // Оновлюємо бейдж у шапці (#num або #cartCountBadge) на основі збережених даних
  updateCartSummary();
});
```

---

### 4. Персистентне збереження списку "Улюблене" (Favorites)

У лабораторній роботі №14 було створено зону Dropzone для перетягування товарів в улюблене (`#favoritesZone`). Зробимо так, щоб ID збережених товарів також не губилися при оновленні сторінки.

Крок 4.1. Логіка синхронізації списку обраного з `localStorage`:

```javascript
const FAVORITES_STORAGE_KEY = 'techshop_favorites';

// 1. Завантаження масиву ID улюблених товарів
function loadFavoritesFromStorage() {
  try {
    const rawData = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error('Помилка завантаження Favorites:', error);
    return [];
  }
}

// Глобальний масив збережених ID улюблених товарів:
let favoriteProductIds = loadFavoritesFromStorage();

// 2. Збереження масиву ID у сховище
function saveFavoritesToStorage() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteProductIds));
}

// 3. Функція візуального відображення зони улюбленого
function renderFavoritesZone() {
  const favoritesZone = document.getElementById('favoritesZone');
  if (!favoritesZone) return;

  if (favoriteProductIds.length === 0) {
    favoritesZone.innerHTML = '<p class="empty-fav">Перетягніть сюди товари в Улюблене</p>';
    return;
  }

  // Знаходимо повні об'єкти товарів із завантаженого каталогу
  const favoriteItems = allProducts.filter(product => favoriteProductIds.includes(product.id));

  favoritesZone.innerHTML = `
    <h4>Обрані товари (${favoriteItems.length}):</h4>
    <div class="fav-chips" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
      ${favoriteItems.map(item => `
        <span class="fav-chip" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 20px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
          ${item.title.substring(0, 18)}...
          <button class="btn-remove-fav" data-id="${item.id}" style="border:none; background:none; cursor:pointer; color:red;">×</button>
        </span>
      `).join('')}
    </div>
  `;
}

// 4. Оновлення обробника події Drop з ЛР №14:
const favoritesZone = document.getElementById('favoritesZone');
if (favoritesZone) {
  favoritesZone.addEventListener('dragover', (event) => event.preventDefault());

  favoritesZone.addEventListener('drop', (event) => {
    event.preventDefault();
    const productId = Number(event.dataTransfer.getData('text/plain'));

    if (productId && !favoriteProductIds.includes(productId)) {
      favoriteProductIds.push(productId);
      saveFavoritesToStorage();
      renderFavoritesZone();
    }
  });

  // Видалення товару з улюбленого за кліком на хрестик (делегування)
  favoritesZone.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-remove-fav')) {
      const idToRemove = Number(event.target.dataset.id);
      favoriteProductIds = favoriteProductIds.filter(id => id !== idToRemove);
      saveFavoritesToStorage();
      renderFavoritesZone();
    }
  });
}
```

---

### 5. Автозбереження чернетки форми замовлення у `sessionStorage`

На відміну від теми та кошика, персональні контактні дані покупця (ПІБ, телефон, email) не повинні зберігатися у браузері вічно з міркувань приватності (особливо на загальнодоступних або робочих комп'ютерах). Проте, якщо покупець заповнював форму замовлення і випадково натиснув кнопку оновлення сторінки чи перейшов на іншу вкладку, буде вкрай неприємно вводити всі дані наново.

Ідеальним рішенням тут є **`sessionStorage`** — дані зберігаються лише під час активної вкладки і безслідно зникають при її закритті.

Крок 5.1. Реалізація чернетки замовлення (Draft Order):

```javascript
const DRAFT_ORDER_KEY = 'techshop_order_draft';
const orderForm = document.getElementById('checkoutOrderForm');

// 1. Функція збереження поточного стану полів форми у sessionStorage
function saveOrderFormDraft() {
  if (!orderForm) return;

  const draftData = {
    clientName: document.getElementById('clientName')?.value || '',
    clientPhone: document.getElementById('clientPhone')?.value || '',
    clientEmail: document.getElementById('clientEmail')?.value || '',
    orderPromo: document.getElementById('orderPromo')?.value || ''
  };

  sessionStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(draftData));
}

// 2. Функція відновлення полів форми з sessionStorage при відкритті
function restoreOrderFormDraft() {
  const rawDraft = sessionStorage.getItem(DRAFT_ORDER_KEY);
  if (!rawDraft || !orderForm) return;

  try {
    const draft = JSON.parse(rawDraft);

    if (draft.clientName) document.getElementById('clientName').value = draft.clientName;
    if (draft.clientPhone) document.getElementById('clientPhone').value = draft.clientPhone;
    if (draft.clientEmail) document.getElementById('clientEmail').value = draft.clientEmail;
    if (draft.orderPromo) document.getElementById('orderPromo').value = draft.orderPromo;
  } catch (error) {
    console.error('Помилка відновлення чернетки замовлення:', error);
  }
}

// 3. Відстеження введення даних користувачем у формі (подія input з делегуванням)
if (orderForm) {
  orderForm.addEventListener('input', () => {
    // Автоматично записуємо кожну зміну в sessionStorage
    saveOrderFormDraft();
  });
}

// 4. Очищення чернетки після успішного оформлення покупки (всередині completeCheckoutProcess):
// Після успішного завершення замовлення обов'язково видаляємо чернетку:
// sessionStorage.removeItem(DRAFT_ORDER_KEY);
```

---

### 6. Реактивна міжвкладочна синхронізація через подію `storage`

Особливістю Web Storage API є подія `window.addEventListener('storage', ...)`. Вона виникає тоді, коли запис у `localStorage` змінюється **в іншій вкладці або вікні** того самого сайту.

Сценарій використання: покупець відкрив каталог інтернет-магазину у вкладці №1, а опис конкретного товару — у вкладці №2. Додавши товар у вкладці №2, лічильник у шапці вкладки №1 має оновитися автоматично без перезавантаження!

Крок 6.1. Додавання слухача події `storage` у `assets/scripts/main.js`:

```javascript
// Слухач синхронізації між паралельними вкладками одного браузера
window.addEventListener('storage', (event) => {
  // 1. Якщо змінився стан кошика в іншій вкладці:
  if (event.key === CART_STORAGE_KEY) {
    console.log('Виявлено зміну кошика в сусідній вкладці!');
    // Перечитуємо масив кошика з оновленого localStorage
    cart = loadCartFromStorage();
    // Оновлюємо бейдж та суму у поточному вікні
    updateCartSummary();
    if (typeof renderCartModalItems === 'function') {
      renderCartModalItems();
    }
  }

  // 2. Якщо користувач перемкнув тему в сусідній вкладці:
  if (event.key === THEME_STORAGE_KEY) {
    applyTheme(event.newValue || 'light');
  }

  // 3. Якщо змінився список "Улюблене":
  if (event.key === FAVORITES_STORAGE_KEY) {
    favoriteProductIds = loadFavoritesFromStorage();
    renderFavoritesZone();
  }
});
```

---

### 7. Збереження результатів роботи (Commit & Push)

- перевірте роботу темної теми - перемкніть тему на темну та оновіть сторінку клавішею F5; переконайтеся, що темна тема збереглася;
- протестуйте збереження кошика - додайте 2–3 товари до кошика, перезавантажте сторінку або закрийте браузер і відкрийте сайт знову; перевірте, чи збереглися товари та загальна вартість;
- перевірте роботу чернетки форми - відкрийте модальне вікно кошика, почніть заповнювати поля форми (ПІБ, телефон), після чого натисніть F5; переконайтеся, що дані відновилися з `sessionStorage`;
- протестуйте подію `storage` - відкрийте інтернет-магазин у двох різних вкладках одного браузера поруч; додайте товар до кошика в одній вкладці та перевірте, чи змінився числовий бейдж у шапці іншої вкладки без її оновлення;
- проведіть аудит через DevTools - відкрийте консоль розробника (`F12`), перейдіть на вкладку `Application` → розділ `Storage` → перегляньте вміст `Local storage` та `Session storage`;
- виконайте фіксацію коду в системі контролю версій Git:
  ```bash
  git add .
  git commit -m "Implement Web Storage API: persistent cart, theme switcher and session order draft"
  git push origin master
  ```

---

## Результат

Інтернет-магазин "TechShop" отримав повноцінну клієнтську систему збереження даних ("пам'ять" сторінки):
- вибір колірної теми (Light/Dark) тепер персиститься в `localStorage` з адаптацією під системні налаштування операційної системи;
- стан кошика покупок та список улюблених товарів зберігаються у форматі JSON у `localStorage`, що запобігає втраті даних при навігації та перезавантаженні сторінки;
- реалізовано безпечне автозбереження чернетки замовлення у сесійне сховище `sessionStorage` без ризику витоку персональних даних;
- налаштовано миттєву синхронізацію стану додатку між відкритими вкладками браузера через подію `storage`.

---

## Контрольні питання

- у чому полягає фундаментальна відмінність між `localStorage` та `sessionStorage` за тривалістю життя та областю видимості даних;
- чому при збереженні об'єктів або масивів у `localStorage` необхідно використовувати метод `JSON.stringify()`, і що станеться, якщо спробувати зберегти об'єкт напряму;
- які обмеження за обсягом пам'яті діють для Web Storage API, і як обробляти ситуацію переповнення квоти сховища (`QuotaExceededError`);
- з якої причини конфіденційні персональні дані покупця (наприклад, номер банківської картки чи пароль) категорично заборонено зберігати у відкритому вигляді в `localStorage`;
- за яких умов генерується подія `window.storage`, і чому вона не спрацьовує всередині тієї самої вкладки, яка щойно викликала метод `setItem()`.
