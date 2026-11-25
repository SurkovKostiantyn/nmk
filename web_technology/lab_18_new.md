# Лабораторна робота №18 (2 години)

**Тема:** Поглиблена робота з об'єктами — деструктуризація, поверхневе та глибоке копіювання, організація та форматування даних для підготовки до роботи з бекендом.

Інтернет-магазин "TechShop" отримує захищений сервісний шар оформлення замовлень `OrderProcessingService`, який без мутації клієнтського стану кошика перетворює дані форми та товарів у стандартизований, глибоко заморожений DTO у форматі `snake_case`, готовий до відправки на REST API.

**Мета:** Опанувати практичне застосування посилальної моделі об'єктів у JavaScript (Stack vs Heap), навчитися розрізняти поверхневе (`Object.assign()`, Spread) та глибоке (`structuredClone()`) копіювання, використовувати деструктуризацію об'єктів і масивів (зокрема патерн Options Object), оператори Spread/Rest, статичні методи `Object.keys()`, `Object.values()`, `Object.entries()`, `Object.fromEntries()`, `Object.hasOwn()`, оператори `?.` і `??`, а також реалізовувати рекурсивне заморожування `deepFreeze()` та формувати чистий DTO (`snake_case`) для взаємодії з бекендом.

**Технологічний стек:** HTML5, CSS3 (CSS-змінні тем з ЛР №16), JavaScript (ES6–ES2023), `structuredClone()`, `Object.freeze()`, `Object.entries()` / `Object.fromEntries()`, `Object.hasOwn()`, `FormData`, Web Storage API (`localStorage`, `sessionStorage`), Chrome DevTools, Git / GitHub, Live Server.

## Завдання

### 1. Перелік завдань

- підготувати робочу копію проєкту "TechShop" з ЛР №17 (`web_lab_18` або гілка `lab-18`) та підключити окремий модуль `assets/scripts/orderService.js`;
- провести практичний експеримент із порівняння поверхневого копіювання (Spread / `Object.assign()`) та глибокого клонування (`structuredClone()`, `JSON.parse(JSON.stringify())`) на вкладених об'єктах каталогу й замовлення;
- реалізувати допоміжні функції `deepFreeze()`, `toSnakeCase()` та `convertKeysToSnakeCase()` для глибокого захисту об'єктів і трансляції ключів із `camelCase` у `snake_case`;
- створити клас `OrderProcessingService` із конструктором на базі патерну Options Object та замороженим білим списком методів оплати `allowedPaymentMethods`;
- реалізувати метод `buildOrderDTO(rawFormData, rawCartItems)` із глибоким клонуванням кошика через `structuredClone()`, деструктуризацією з аліасами й значеннями за замовчуванням, санітизацією даних, очищенням `null`-полів через `Object.entries()` / `Object.fromEntries()`, конвертацією ключів у `snake_case` та фінальним `deepFreeze()`;
- реалізувати методи `prepareRequestPayload(orderDTO)` для формування JSON-тіла HTTP-запиту та `parseServerResponse(rawJsonResponse)` для безпечного розбору відповіді сервера через `?.`, `??` і `Object.hasOwn()`;
- оновити форму оформлення замовлення в `index.html` (додати поля доставки, способу оплати та коментаря) і підключити `OrderProcessingService` до обробника відправки форми у `assets/scripts/main.js` із виведенням сформованого DTO у панель попереднього перегляду та консоль;
- перевести допоміжні операції оновлення кошика на неруйнівний (іммутабельний) підхід із використанням операторів Spread (`...`) та Rest (`...rest`);
- протестувати ізоляцію пам'яті, заморожування DTO, обробку помилок та регресію функціоналу ЛР №14–17, зафіксувати зміни у Git та оформити звіт.

### 2. Додаткові завдання (для отримання максимальної оцінки)

- реалізувати функцію `toCamelCase()` та `convertKeysToCamelCase()` для зворотної трансформації відповіді сервера з `snake_case` у клієнтський `camelCase`;
- додати метод `sanitizeProductForCart(product)` з використанням Rest-оператора (`const { description, rating, ...cartSnapshot } = product`), щоб у `localStorage` зберігалися лише необхідні для кошика поля без зайвих описів;
- реалізувати утиліту `diffObjects(prevObj, nextObj)` на базі `Object.entries()` та `Object.hasOwn()`, яка повертає об'єкт лише зі зміненими полями профілю або налаштувань;
- додати в модальне вікно замовлення кнопку «Копіювати JSON DTO» (через Clipboard API з ЛР №17) для зручної передачі тестового payload у Postman або DevTools.

## Хід виконання роботи

### Крок 1. Підготовка проєкту та аналіз вихідного стану

Скопіюйте проєкт з ЛР №17 у нову папку `web_lab_18` (або створіть нову гілку `lab-18` у спільному репозиторії). Додайте новий файл `assets/scripts/orderService.js`, у якому буде зосереджена логіка клонування, заморожування та підготовки DTO:

```text
web_lab_18/
├── assets/
│   ├── css/
│   │   └── style.css          # стилі каталогу, пагінації, тем + блок прев'ю DTO
│   └── scripts/
│       ├── orderService.js    # новий сервісний модуль (DTO, deepFreeze, snake_case)
│       └── main.js            # існуюча логіка каталогу, URL-стану, кошика та форми
├── index.html                 # форма замовлення з полями доставки, оплати та прев'ю DTO
└── readme.md                  # опис виконаної роботи
```

Що вже реалізовано у проєкті перед стартом ЛР №18:
- каталог та URL-стан (ЛР №17) - `allProducts`, `catalogState` з `CATALOG_DEFAULTS = Object.freeze(...)`, фільтрація, сортування, пагінація та навігація `popstate`;
- персистентне сховище (ЛР №16) - кошик `cart` та «Улюблене» зберігаються в `localStorage`, чернетка форми замовлення — у `sessionStorage`, тема оформлення — через CSS-змінні;
- форма замовлення (ЛР №15) - збір даних через `FormData`, клієнтська валідація полів та модальне вікно.

Проблема, яку ми вирішуємо в цій роботі:
- ризик випадкової мутації стану - передача `cart` або об'єктів товарів у допоміжні функції без глибокого клонування може через спільні посилання пошкодити дані в пам'яті та в `localStorage`;
- непідготовленість даних для бекенда - об'єкти кошика містять зайві візуальні поля (`image`, `description`, `rating`), а поля форми мають довільні пробіли, рядкові числа й неконсистентний регістр ключів;
- відсутність контракту відповіді - обробка відповіді сервера без `?.`, `??` та `Object.hasOwn()` призводить до помилок `TypeError: Cannot read properties of undefined` при нестандартних відповідях API.

Підключіть `assets/scripts/orderService.js` у `index.html` безпосередньо **перед** `assets/scripts/main.js`:

```html
<script src="assets/scripts/orderService.js"></script>
<script src="assets/scripts/main.js"></script>
```

> [!NOTE]
> Обидва скрипти працюють у глобальному контексті браузера без збирача модулів, тому функції та клас `OrderProcessingService`, оголошені в `orderService.js`, будуть доступні в `main.js`.

---

### Крок 2. Дослідження Shallow Copy та Deep Copy у консолі DevTools

Перед написанням сервісу переконайтеся на практиці, чому поверхневе копіювання не захищає вкладені структури. На початку файлу `assets/scripts/orderService.js` додайте діагностичну функцію `runCopyExperiment()`, яку можна викликати з консолі DevTools:

```javascript
// ===================== ЛР №18: демонстрація Shallow vs Deep Copy =====================

function runCopyExperiment() {
  const originalOrder = {
    id: 'ORD-100',
    createdAt: new Date(),
    customer: {
      name: 'Олена',
      address: { city: 'Київ' }
    },
    extraNote: undefined
  };

  // 1. Поверхнева копія (Spread): копіюється лише верхній рівень
  const shallowCopy = { ...originalOrder };
  shallowCopy.customer.address.city = 'Львів';

  console.log('Оригінал після зміни shallowCopy:', originalOrder.customer.address.city);
  // 'Львів' — вкладений об'єкт customer.address мутовано!

  // Повертаємо початкове значення для чистоти тесту
  originalOrder.customer.address.city = 'Київ';

  // 2. Клонування через JSON: втрачає Date (стає рядком) і видаляє undefined
  const jsonCopy = JSON.parse(JSON.stringify(originalOrder));
  console.log('JSON createdAt instanceof Date:', jsonCopy.createdAt instanceof Date); // false
  console.log('JSON has extraNote:', Object.hasOwn(jsonCopy, 'extraNote'));           // false

  // 3. Сучасний стандарт structuredClone(): повна ізоляція та збереження Date
  const deepCopy = structuredClone(originalOrder);
  deepCopy.customer.address.city = 'Одеса';

  console.log('Оригінал після зміни deepCopy:', originalOrder.customer.address.city); // 'Київ'
  console.log('deepCopy createdAt instanceof Date:', deepCopy.createdAt instanceof Date); // true
  console.log('deepCopy has extraNote:', Object.hasOwn(deepCopy, 'extraNote'));           // true
}
```

Відкрийте сторінку через Live Server, у консолі DevTools виконайте `runCopyExperiment()` та зафіксуйте результати для звіту.

---

### Крок 3. Утиліти трансформації ключів (`snake_case`) та глибокого заморожування (`deepFreeze`)

Додайте у `assets/scripts/orderService.js` утиліти для конвертації стилю найменування ключів (клієнтський `camelCase` → серверний `snake_case`) та рекурсивного захисту об'єктів від змін:

```javascript
// ===================== ЛР №18: утиліти ключів та заморожування =====================

// Перетворює рядок із camelCase у snake_case: "clientUnitCost" -> "client_unit_cost"
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Рекурсивно трансформує всі ключі об'єкта або масиву об'єктів у snake_case
function convertKeysToSnakeCase(data) {
  if (Array.isArray(data)) {
    return data.map(item => convertKeysToSnakeCase(item));
  }

  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        toSnakeCase(key),
        convertKeysToSnakeCase(value)
      ])
    );
  }

  return data;
}

// Рекурсивно заморожує об'єкт і всі його вкладені об'єкти та масиви
function deepFreeze(targetObject) {
  if (targetObject === null || typeof targetObject !== 'object') {
    return targetObject;
  }

  const propNames = Object.getOwnPropertyNames(targetObject);

  for (const name of propNames) {
    const value = targetObject[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(targetObject);
}
```

> [!NOTE]
> На відміну від поверхневого `Object.freeze()`, який захищає лише перший рівень ключів (як у `CATALOG_DEFAULTS` з ЛР №17), `deepFreeze()` гарантує, що жодна вкладена властивість згенерованого DTO (наприклад, `orderDTO.customer.phone` або `orderDTO.items[0].quantity`) не може бути змінена після створення.

---

### Крок 4. Реалізація класу `OrderProcessingService`

У `assets/scripts/orderService.js` реалізуйте сервісний клас оформлення замовлень. Зверніть увагу на використання ключових прийомів:
- патерн **Options Object** у конструкторі з деструктуризацією та значеннями за замовчуванням (`= {}`);
- глибоке клонування `structuredClone(rawCartItems)` перед будь-якою обробкою кошика;
- деструктуризація сирих полів форми з перейменуванням (аліасами) та дефолтами;
- санітизація рядків (`.trim()`, `.toLowerCase()`, очищення номера телефону) та суворе приведення числових значень (`parseInt`, `parseFloat`);
- конвеєрне очищення `null`-полів через `Object.entries()` + `.filter()` + `Object.fromEntries()`.

```javascript
// ===================== ЛР №18: сервісний шар замовлення =====================

class OrderProcessingService {
  constructor({
    apiEndpoint = 'https://api.techshop.ua/v1/orders',
    allowedPaymentMethods = ['card_online', 'cash_on_delivery', 'apple_pay'],
    currency = 'UAH'
  } = {}) {
    this.apiEndpoint = apiEndpoint;
    this.currency = currency;
    // Заморожуємо копію білого списку методів оплати
    this.allowedPaymentMethods = Object.freeze([...allowedPaymentMethods]);
  }

  /**
   * Формує очищений, нормалізований і заморожений DTO замовлення
   * @param {Object} rawFormData - сирі дані з HTML-форми
   * @param {Array} rawCartItems - масив товарів із кошика
   * @returns {Object} глибоко заморожений DTO у форматі snake_case
   */
  buildOrderDTO(rawFormData, rawCartItems) {
    // 1. Ізолюємо кошик через structuredClone, щоб не мутувати стан у пам'яті / localStorage
    const safeCart = structuredClone(rawCartItems);

    if (!Array.isArray(safeCart) || safeCart.length === 0) {
      throw new Error('Неможливо оформити порожнє замовлення!');
    }

    // 2. Деструктуризація полів форми з перейменуванням та значеннями за замовчуванням
    const {
      client_name: rawName = '',
      client_phone: rawPhone = '',
      client_email: rawEmail = '',
      delivery_city: rawCity = '',
      delivery_branch: rawBranch = '',
      payment_type: rawPayment = 'card_online',
      order_comment: rawComment = '',
      promo_code: rawPromo = ''
    } = rawFormData || {};

    // 3. Санітизація даних покупця
    const cleanCustomer = {
      fullName: rawName.trim(),
      phone: rawPhone.replace(/[^\d+]/g, '').trim(),
      email: rawEmail.trim().toLowerCase()
    };

    if (!cleanCustomer.fullName || cleanCustomer.phone.length < 10) {
      throw new Error('Перевірте коректність імені та номера телефону!');
    }

    // 4. Перевірка методу оплати за білим списком
    const paymentMethod = this.allowedPaymentMethods.includes(rawPayment)
      ? rawPayment
      : 'card_online';

    // 5. Нормалізація товарів кошика через деструктуризацію в параметрах map()
    const cleanItems = safeCart.map(({ id, quantity = 1, price }) => {
      const parsedQty = Number.parseInt(quantity, 10);
      const parsedPrice = Number.parseFloat(price);

      if (Number.isNaN(parsedQty) || parsedQty <= 0) {
        throw new Error(`Некоректна кількість товару з ID ${id}`);
      }

      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error(`Некоректна ціна товару з ID ${id}`);
      }

      return {
        productId: id,
        quantity: parsedQty,
        clientUnitCost: Number(parsedPrice.toFixed(2))
      };
    });

    // 6. Збирання проміжного клієнтського об'єкта (camelCase)
    const parsedBranch = Number.parseInt(rawBranch, 10);
    const clientOrderObject = {
      customer: cleanCustomer,
      delivery: {
        city: rawCity.trim(),
        branchId: Number.isInteger(parsedBranch) && parsedBranch > 0 ? parsedBranch : null
      },
      paymentMethod,
      comment: rawComment.trim() || null,
      promoCode: rawPromo.trim() ? rawPromo.trim().toUpperCase() : null,
      items: cleanItems,
      currency: this.currency,
      clientTimestamp: new Date().toISOString()
    };

    // 7. Видалення необов'язкових null-властивостей на верхньому рівні
    const sanitizedOrder = Object.fromEntries(
      Object.entries(clientOrderObject).filter(([_, value]) => value !== null)
    );

    // 8. Конвертація ключів у snake_case для бекенда
    const serverPayloadDTO = convertKeysToSnakeCase(sanitizedOrder);

    // 9. Глибоке заморожування перед поверненням
    return deepFreeze(serverPayloadDTO);
  }
```

---

### Крок 5. Підготовка JSON Payload та безпечний розбір відповіді сервера

Продовжте клас `OrderProcessingService` у файлі `assets/scripts/orderService.js`, додавши методи `prepareRequestPayload()` та `parseServerResponse()`:

```javascript
  /**
   * Готує конфігурацію HTTP-запиту для майбутньої відправки через fetch()
   */
  prepareRequestPayload(orderDTO) {
    return {
      url: this.apiEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderDTO)
    };
  }

  /**
   * Безпечно розбирає відповідь сервера з використанням ?. , ?? та Object.hasOwn()
   */
  parseServerResponse(rawJsonResponse) {
    const orderId = rawJsonResponse?.data?.order_id ?? 'UNKNOWN';
    const status = rawJsonResponse?.status ?? 500;
    const isSuccess = rawJsonResponse?.success === true;

    if (!rawJsonResponse || !isSuccess || Object.hasOwn(rawJsonResponse, 'error')) {
      const errorMessage =
        rawJsonResponse?.error?.message ?? 'Помилка обробки замовлення сервером';
      return {
        success: false,
        status,
        error: errorMessage
      };
    }

    return {
      success: true,
      orderId,
      status,
      confirmationMessage: `Дякуємо! Ваше замовлення #${orderId} успішно сформовано.`
    };
  }
}
```

> [!IMPORTANT]
> Використання `Object.hasOwn(rawJsonResponse, 'error')` замість застарілого `rawJsonResponse.hasOwnProperty('error')` безпечне навіть тоді, коли об'єкт створено через `Object.create(null)` або отримано із зовнішнього парсера без стандартного прототипу `Object.prototype`.

---

### Крок 6. Оновлення форми замовлення та інтеграція в `main.js`

У файлі `index.html` знайдіть форму оформлення замовлення всередині модального вікна (створену в ЛР №15–16) і переконайтеся, що поля мають відповідні атрибути `name` для зчитування через `FormData`. Додайте поля доставки, способу оплати, коментаря та блок попереднього перегляду згенерованого DTO:

```html
<!-- Доповнені поля форми оформлення замовлення -->
<label for="deliveryCity">Місто доставки</label>
<input type="text" id="deliveryCity" name="delivery_city" placeholder="Київ" required>

<label for="deliveryBranch">Номер відділення</label>
<input type="number" id="deliveryBranch" name="delivery_branch" min="1" placeholder="12">

<label for="paymentType">Спосіб оплати</label>
<select id="paymentType" name="payment_type">
  <option value="card_online">Карткою онлайн</option>
  <option value="cash_on_delivery">Оплата при отриманні</option>
  <option value="apple_pay">Apple Pay</option>
</select>

<label for="orderComment">Коментар до замовлення</label>
<textarea id="orderComment" name="order_comment" rows="2" placeholder="Необов'язково"></textarea>

<!-- Блок відображення сформованого DTO для перевірки -->
<details class="dto-preview-box">
  <summary>Попередній перегляд DTO для бекенда (JSON)</summary>
  <pre id="dtoPreviewOutput" class="dto-preview-code">Оформіть замовлення, щоб побачити DTO...</pre>
</details>
```

> [!NOTE]
> Якщо у вашій формі з ЛР №15–16 поля імені, телефону, email або промокоду мають інші значення `name` (наприклад, `userName` замість `client_name`), або приведіть їх до `client_name`, `client_phone`, `client_email`, `promo_code`, або адаптуйте аліаси під час деструктуризації в `buildOrderDTO()`.

Додайте базові стилі для блоку прев'ю DTO у кінець `assets/css/style.css`:

```css
/* ===== ЛР №18: попередній перегляд DTO ===== */
.dto-preview-box {
  margin-top: 16px;
  padding: 10px 12px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.dto-preview-code {
  margin: 10px 0 0;
  max-height: 220px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}
```

Тепер у `assets/scripts/main.js` ініціалізуйте `OrderProcessingService` та інтегруйте його в обробник події `submit` форми замовлення:

```javascript
// ===================== ЛР №18: інтеграція сервісу замовлення =====================

const orderService = new OrderProcessingService();
const dtoPreviewOutput = document.getElementById('dtoPreviewOutput');

// Приклад інтеграції в існуючий обробник submit форми замовлення (#checkoutForm)
if (checkoutForm) {
  checkoutForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Збираємо всі поля форми через FormData у звичайний об'єкт
    const formData = Object.fromEntries(new FormData(checkoutForm).entries());

    try {
      // 1. Формуємо захищений DTO без мутації масиву cart
      const orderDTO = orderService.buildOrderDTO(formData, cart);

      // 2. Готуємо HTTP payload (у ЛР №23–24 тут буде реальний fetch())
      const requestConfig = orderService.prepareRequestPayload(orderDTO);
      const formattedJson = JSON.stringify(orderDTO, null, 2);

      console.log('ЛР №18 — Заморожений DTO:', orderDTO);
      console.log('ЛР №18 — Payload для fetch():', requestConfig);

      if (dtoPreviewOutput) {
        dtoPreviewOutput.textContent = formattedJson;
      }

      // 3. Симуляція відповіді бекенда та її безпечний розбір
      const mockServerResponse = {
        success: true,
        status: 201,
        data: {
          order_id: `ORD-${Date.now()}`,
          created_at: new Date().toISOString()
        }
      };

      const result = orderService.parseServerResponse(mockServerResponse);

      if (result.success) {
        alert(result.confirmationMessage);
        // Очищаємо кошик і чернетку sessionStorage лише після підтвердження
        cart = [];
        saveCartToStorage();
        updateCartSummary();
        sessionStorage.removeItem('checkoutDraft');
        checkoutForm.reset();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Помилка підготовки замовлення:', error.message);
      alert(error.message);
    }
  });
}
```

> [!WARNING]
> Якщо у `main.js` уже є старий обробник `submit` для `#checkoutForm` з ЛР №15–16, замініть його на новий або оновіть існуючий, щоб на одній формі не спрацьовували два обробники одночасно.

---

### Крок 7. Імутабельні оновлення кошика (Spread та Rest)

Перегляньте у `assets/scripts/main.js` функції, які змінюють вміст кошика (додавання товару, зміна кількості, видалення позиції). Замініть прямі мутації на кшталт `existingItem.quantity += 1` на неруйнівне оновлення через оператор Spread (`...`) та `map()` / `filter()`, а зайві поля товару перед збереженням у `cart` відсікайте через Rest-оператор:

```javascript
// ===================== ЛР №18: імутабельне оновлення кошика =====================

// Вилучаємо лише потрібні для кошика поля, відкидаючи опис і рейтинг через Rest
function toCartItemSnapshot(product) {
  const { description, rating, ...cleanFields } = product;
  return {
    ...cleanFields,
    quantity: 1
  };
}

// Оновлення кількості товару без мутації існуючих об'єктів у масиві cart
function updateCartQuantityImmutable(currentCart, productId, delta) {
  return currentCart
    .map((item) => {
      if (item.id !== productId) {
        return item;
      }
      return {
        ...item,
        quantity: item.quantity + delta
      };
    })
    .filter((item) => item.quantity > 0);
}
```

Підключіть ці допоміжні функції у ваші обробники додавання в кошик та зміни кількості товару. Так кожна операція створюватиме новий масив із новими посиланнями на змінені об'єкти, що унеможливлює побічні ефекти.

---

### Крок 8. Тестування сценаріїв та фіксація результатів (Commit & Push)

Виконайте перевірку всіх ключових сценаріїв та зробіть скріншоти для звіту:
- експеримент із копіюванням - викличте `runCopyExperiment()` у консолі DevTools і переконайтеся, що `shallowCopy` змінює оригінал, `JSON`-копія втрачає `Date` та `undefined`, а `structuredClone()` повністю ізолює вкладені об'єкти;
- перевірка ізоляції кошика - додайте 2 товари до кошика, заповніть форму з пробілами на краях (`"  Іван Петренко  "`) та промокодом у нижньому регістрі (`" spring2026 "`), оформіть замовлення і перевірте в консолі: поля в DTO очищені, ключі переведені в `snake_case`, а властивість `null` (наприклад, порожній коментар) вилучена;
- перевірка глибокого заморожування - у консолі DevTools спробуйте змінити отриманий об'єкт `orderDTO.customer.full_name = 'Тест'` або `orderDTO.items[0].quantity = 999`; переконайтеся, що `Object.isFrozen(orderDTO)` та `Object.isFrozen(orderDTO.customer)` повертають `true`, а значення не змінюються;
- перевірка обробки помилок - у консолі викличте `orderService.buildOrderDTO({ client_name: '' }, cart)` та `orderService.parseServerResponse({ success: false, error: { message: 'Недостатньо товару на складі' } })`, переконавшись у коректній обробці винятків і помилкових відповідей без падіння скрипта;
- регресійне тестування - перевірте, що фільтри, сортування, пагінація, URL-параметри (`popstate`), тема оформлення, «Улюблене» (Drag-and-Drop) та чернетка в `sessionStorage` працюють так само стабільно, як після ЛР №17.

Зафіксуйте зміни в системі контролю версій:

```bash
git add .
git commit -m "Lab 18: deep copy, destructuring, deepFreeze and OrderProcessingService DTO"
git push origin master
```

### Контрольні запитання

- у чому полягає різниця між стеком (Stack) і купою (Heap) у JavaScript та чому `===` для двох однакових за вмістом об'єктів повертає `false`?
- чому `const obj = { ... }` дозволяє змінювати властивості об'єкта `obj`, і чим `Object.freeze()` відрізняється від `deepFreeze()`?
- у яких випадках достатньо поверхневого копіювання (`{ ...obj }`, `Object.assign()`), а коли обов'язково використовувати глибоке копіювання?
- які обмеження має клонування через `JSON.parse(JSON.stringify())` і які переваги надає нативна функція `structuredClone()`?
- навіщо при роботі з об'єктом `Object.entries()` та `Object.fromEntries()` поєднують із методами масивів `.map()` і `.filter()`?
- як працює патерн Options Object у конструкторі або параметрах функції та яку роль у ньому відіграє значення за замовчуванням `= {}`?
- що таке DTO (Data Transfer Object), навіщо перед відправкою на бекенд видаляти візуальні поля інтерфейсу, санітизувати типи та транслювати ключі з `camelCase` у `snake_case`?
- чому для перевірки наявності ключа у відповіді сервера варто використовувати `Object.hasOwn(obj, key)`, а для читання вкладених полів — оператори `?.` та `??`?

### Вимоги до звіту

- посилання на GitHub-репозиторій з виконаною роботою (гілка `master` або `lab-18`) надіслати в Google Classroom;
- у файлі `lab18.md` у корені репозиторію навести фрагменти коду функцій `convertKeysToSnakeCase()`, `deepFreeze()`, методу `buildOrderDTO()` та обробника відправки форми з короткими поясненнями;
- у файлі `lab18.md` розмістити скріншоти: результату `runCopyExperiment()` у консолі DevTools, панелі попереднього перегляду згенерованого DTO у форматі `snake_case`, а також перевірки `Object.isFrozen()` на вкладених полях DTO;
- у файлі `lab18.md` дати письмові відповіді на контрольні запитання;
- за виконання додаткових завдань — описати їх реалізацію окремим розділом звіту з прикладом коду та результатом перевірки у DevTools.
