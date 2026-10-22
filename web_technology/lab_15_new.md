# Лабораторне заняття №15 (2 години). Обробка даних на клієнті та робота з формами.

## Мета

Опанувати практичні навички роботи з рядковими методами та регулярними виразами для нормалізації та санітизації введених користувачем даних. Навчитися використовувати методи-ітератори масивів (`filter`, `map`, `reduce`) для побудови декларативних конвеєрів обробки даних (живий пошук по каталогу та агрегація замовлення у кошику). Освоїти сучасні підходи до збору даних веб-форм за допомогою інтерфейсу `FormData` та реалізацію клієнтської валідації.

## План

- розробка живого пошуку товарів - обробка події `input`, нормалізація введеного запиту (`trim`, `toLowerCase`) та декларативна фільтрація каталогу за допомогою `filter()` та `includes()`;
- агрегація та розрахунок кошика - підрахунок загальної кількості товарів та підсумкової вартості замовлення за допомогою методу `reduce()`;
- інтеграція форми оформлення замовлення - створення розмітки форми з полями ПІБ, номера телефону, email та промокоду;
- збір та санітизація даних форми - заборона перезавантаження сторінки (`preventDefault`), отримання полів через `FormData` та очищення тексту за допомогою методів рядків;
- клієнтська валідація через RegExp - перевірка формату українського мобільного номера (`/^\+?380\d{9}$/`), імені та електронної пошти з візуалізацією помилок;
- розрахунок знижки та формування замовлення - перевірка промокоду, розрахунок суми до сплати, формування JSON-пакета та фіксація результату в Git.

## Початкові вимоги та структура проєкту

Для виконання цієї роботи використовується код попереднього лабораторного заняття №14. Залежно від вашої попередньої структури проєкту, файли можуть бути організовані одним із двох способів (обидва варіанти є правильними):

**Варіант А (ієрархічна структура з папкою assets):**
```text
web_lab_15/
├── assets/
│   ├── css/
│   │   └── style.css       # стилі каталогу, модальних вікон та форми
│   └── scripts/
│       └── main.js         # основний файл логіки (або app.js)
├── index.html              # розмітка магазину з каталогом
├── checkout.html           # сторінка замовлення (якщо винесена окремо)
└── readme.md               # опис виконаної роботи
```

**Варіант Б (пласка структура у корені каталогу):**
```text
web_lab_15/
├── index.html              # розмітка магазину
├── style.css               # стилі сторінки
├── app.js                  # скрипт магазину (або main.js)
├── checkout.html           # сторінка замовлення (опціонально)
└── readme.md               # опис виконаної роботи
```

### Що має бути готове перед стартом роботи:

- завантаження товарів через fetch - масив товарів завантажується із сервера (наприклад, FakeStore API) та зберігається у спільній змінній (`let allProducts = [];` або `let globalStoreProducts = [];`);
- окрема функція відображення карток - генерація карток має приймати масив товарів аргументом, наприклад `renderProducts(productsToDisplay)`. Якщо у вашій попередній роботі генерація HTML була вбудована всередину `initShop()`, винесіть її в окрему функцію перед виконанням поточних завдань:
  ```javascript
  // Приклад винесення рендерингу в окрему функцію:
  function renderProducts(products) {
    const container = document.querySelector('.products-grid');
    if (!products || products.length === 0) {
      container.innerHTML = '<p class="no-products">Товарів не знайдено</p>';
      return;
    }
    container.innerHTML = products.map(product => `
      <article class="product-card" draggable="true" data-id="${product.id}">
        <img src="${product.image}" alt="${product.title}" draggable="false">
        <h3>${product.title}</h3>
        <p class="price">${product.price} $</p>
        <button class="btn btn-buy" data-id="${product.id}">Купити</button>
      </article>
    `).join('');
  }
  ```
- стан кошика - у скрипті має існувати масив `let cart = [];` для збереження обраних товарів та базове додавання позицій через делегування кліків;
- елементи інтерфейсу для кошика - у верстці мають бути елементи підрахунку кількості та вартості покупок (у методичці наведено `#cartCountBadge` та `#cartTotalPrice`, але якщо у вас це `#num` та `#total`, ви можете зберегти свої ID).

> [!NOTE]
> У зразках коду нижче головний скрипт позначається як `app.js` (якщо у вас `assets/scripts/main.js` — пишіть у нього), а масив товарів — `allProducts` (якщо у вас `globalStoreProducts` — використовуйте цю змінну).

## Хід роботи

У попередньому лабораторному занятті №14 ми оптимізували роботу інтернет-магазину "TechShop": реалізували делегування подій для кнопок покупок у каталозі `.products-grid` та створили інтерактивну зону перетягування "Улюблене" (Drag-and-Drop).

У цій роботі ми продовжуємо розвивати той самий проєкт. Наше завдання — додати швидкий живий пошук товарів по каталогу, розрахувати підсумок кошика за допомогою ітераторів та створити надійну форму замовлення з очищенням і валідацією даних.

### 1. Додавання живого пошуку товарів по каталогу (подія `input` та методи рядків)

У файлі `index.html` безпосередньо над контейнером товарів `.products-grid` додайте рядок пошуку:

```html
<div class="search-bar" style="margin: 20px 0; display: flex; gap: 12px; align-items: center;">
  <input type="text" id="searchInput" placeholder="Почніть вводити назву товару..." style="padding: 10px; width: 320px; border: 1px solid #ccc; border-radius: 6px;">
  <span id="searchResultCount" style="color: #666; font-size: 14px;"></span>
</div>
```

У вашому файлі скриптів (`app.js` або `main.js`) реалізуйте фільтрацію каталогу товарів:

```javascript
const searchInput = document.getElementById('searchInput');
const searchResultCount = document.getElementById('searchResultCount');

// Використовуємо глобальний масив товарів (allProducts або globalStoreProducts):
searchInput.addEventListener('input', (event) => {
  // 1. Нормалізація введеного тексту: прибираємо зайві пробіли та зводимо до нижнього регістру
  const searchQuery = event.target.value.trim().toLowerCase();

  // 2. Фільтруємо масив товарів за назвою за допомогою методів filter() та includes()
  const matchedProducts = allProducts.filter(product => {
    return product.title.toLowerCase().includes(searchQuery);
  });

  // 3. Інформуємо користувача про кількість знайдених збігів
  if (searchQuery.length > 0) {
    searchResultCount.textContent = `Знайдено товарів: ${matchedProducts.length}`;
  } else {
    searchResultCount.textContent = '';
  }

  // 4. Перемальовуємо вітрину каталогу, передаючи відфільтрований масив
  renderProducts(matchedProducts);
});
```

### 2. Агрегація вартості кошика за допомогою методу `reduce()`

Коли користувач додає товари до кошика через кнопку "Купити", вони зберігаються у масиві `cart`. Замість використання класичних імперативних циклів розрахуємо кількість та суму покупок декларативно через `reduce()`.

Додайте або адаптуйте функцію перерахунку кошика:

```javascript
// Зразок структури елементів у кошику:
// cart = [{ id: 1, title: "Рюкзак", price: 109.95, quantity: 2 }, ...];

function updateCartSummary() {
  // 1. Розрахунок загальної кількості штук товарів у кошику
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  // 2. Розрахунок повної вартості всіх обраних позицій (ціна * кількість)
  const subtotalSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 3. Оновлення числових бейджів та блоку чека в інтерфейсі:
  // (використовуйте cartBadge/cartTotalPrice або власні num/total із розмітки)
  const cartBadge = document.getElementById('cartCountBadge') || document.getElementById('num');
  const cartPriceElement = document.getElementById('cartTotalPrice') || document.getElementById('total');

  if (cartBadge) cartBadge.textContent = totalItems;
  if (cartPriceElement) cartPriceElement.textContent = `${subtotalSum.toFixed(2)} грн`;

  return subtotalSum;
}
```

### 3. Створення форми оформлення замовлення (Checkout Form)

Форму оформлення замовлення можна розмістити:
- безпосередньо у файлі `index.html` - наприклад, під сіткою товарів або всередині модального вікна кошика;
- на окремій сторінці `checkout.html` - якщо ви використовуєте окрему сторінку чекауту (підключивши до неї відповідний скрипт).

Додайте розмітку форми:

```html
<section class="checkout-card" style="margin: 30px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px;">
  <h3>Оформлення замовлення</h3>
  <form id="checkoutOrderForm" novalidate>
    <div class="form-row" style="margin-bottom: 12px;">
      <label for="clientName" style="display: block; margin-bottom: 4px;">ПІБ покупця:</label>
      <input type="text" id="clientName" name="clientName" placeholder="Коваленко Олександр Сергійович" required style="width: 100%; padding: 8px; box-sizing: border-box;">
      <span class="input-error" id="nameError" style="color: red; font-size: 13px;"></span>
    </div>

    <div class="form-row" style="margin-bottom: 12px;">
      <label for="clientPhone" style="display: block; margin-bottom: 4px;">Номер телефону (+380...):</label>
      <input type="tel" id="clientPhone" name="clientPhone" placeholder="+38 (097) 123-45-67" required style="width: 100%; padding: 8px; box-sizing: border-box;">
      <span class="input-error" id="phoneError" style="color: red; font-size: 13px;"></span>
    </div>

    <div class="form-row" style="margin-bottom: 12px;">
      <label for="clientEmail" style="display: block; margin-bottom: 4px;">Електронна пошта:</label>
      <input type="email" id="clientEmail" name="clientEmail" placeholder="olexandr@example.com" required style="width: 100%; padding: 8px; box-sizing: border-box;">
      <span class="input-error" id="emailError" style="color: red; font-size: 13px;"></span>
    </div>

    <div class="form-row" style="margin-bottom: 16px;">
      <label for="orderPromo" style="display: block; margin-bottom: 4px;">Промокод (якщо є):</label>
      <input type="text" id="orderPromo" name="orderPromo" placeholder="Введіть SALE10 для знижки 10%" style="width: 100%; padding: 8px; box-sizing: border-box;">
    </div>

    <button type="submit" id="btnPlaceOrder" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Підтвердити замовлення
    </button>
  </form>
</section>
```

### 4. Збір та санітизація даних через `FormData` та методи рядків

У файлі скриптів додайте обробник події `submit` форми:

```javascript
const orderForm = document.getElementById('checkoutOrderForm');

if (orderForm) {
  orderForm.addEventListener('submit', (event) => {
    // 1. Зупиняємо дефолтне перезавантаження браузера
    event.preventDefault();

    // 2. Збираємо значення форми за допомогою FormData
    const formData = new FormData(orderForm);

    const rawName = formData.get('clientName') || '';
    const rawPhone = formData.get('clientPhone') || '';
    const rawEmail = formData.get('clientEmail') || '';
    const rawPromo = formData.get('orderPromo') || '';

    // 3. Санітизація та очищення введених даних методами рядків:
    // - видаляємо пробіли з країв та прибираємо дублюючі пробіли всередині:
    const cleanName = rawName.trim().replace(/\s+/g, ' ');

    // - очищаємо номер телефону від дефісів, пробілів та дужок за допомогою RegExp:
    const cleanPhone = rawPhone.replaceAll(/[\s\(\)\-]/g, '');

    // - приводимо поштову адресу до нижнього регістру:
    const cleanEmail = rawEmail.trim().toLowerCase();

    // - нормалізуємо промокод до верхнього регістру:
    const cleanPromo = rawPromo.trim().toUpperCase();

    // 4. Перевірка валідності даних
    const isFormValid = validateCheckoutForm(cleanName, cleanPhone, cleanEmail);
    if (!isFormValid) {
      return; // якщо є помилки, припиняємо обробку
    }

    // 5. Оформлення фінального замовлення
    completeCheckoutProcess(cleanName, cleanPhone, cleanEmail, cleanPromo);
  });
}
```

### 5. Клієнтська валідація полів форми за допомогою регулярних виразів

Створіть функцію валідації полів із виведенням повідомлень про помилки у відповідні елементи форми:

```javascript
function validateCheckoutForm(name, phone, email) {
  let isValid = true;

  // Очищаємо попередні повідомлення про помилки
  document.getElementById('nameError').textContent = '';
  document.getElementById('phoneError').textContent = '';
  document.getElementById('emailError').textContent = '';

  // 1. Валідація імені: щонайменше два слова (ім'я та прізвище) довжиною від 2 символів
  const words = name.split(' ').filter(Boolean);
  if (words.length < 2 || name.length < 5) {
    document.getElementById('nameError').textContent = "Введіть повне ім'я та прізвище (щонайменше 2 слова).";
    isValid = false;
  }

  // 2. Валідація українського мобільного номера через регулярний вираз
  const phonePattern = /^\+?380\d{9}$/;
  if (!phonePattern.test(phone)) {
    document.getElementById('phoneError').textContent = "Введіть коректний номер у форматі +380XXXXXXXXX.";
    isValid = false;
  }

  // 3. Валідація електронної пошти
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    document.getElementById('emailError').textContent = "Введіть дійсну поштову адресу (наприклад, user@mail.com).";
    isValid = false;
  }

  return isValid;
}
```

### 6. Розрахунок знижки за промокодом та формування фінального замовлення

Реалізуйте фінальну логіку замовлення, яка застосовує промокод, трансформує масив куплених товарів через `map()` та формує JSON Payload:

```javascript
function completeCheckoutProcess(name, phone, email, promo) {
  if (cart.length === 0) {
    alert("Ваш кошик порожній! Спочатку додайте товари до кошика.");
    return;
  }

  // 1. Базова вартість товарів через метод reduce()
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 2. Застосування знижки за промокодом
  let discountPercent = 0;
  if (promo === 'SALE10') {
    discountPercent = 10;
  }

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const finalAmount = Math.max(0, subtotal - discountAmount);

  // 3. Формування підсумкового об'єкта замовлення
  const orderData = {
    customer: {
      name: name,
      phone: phone,
      email: email
    },
    // Трансформуємо елементи кошика в оптимізований масив рядків чека за допомогою map():
    items: cart.map(item => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      cost: Number((item.price * item.quantity).toFixed(2))
    })),
    promoCode: promo || null,
    discountAmount: discountAmount,
    totalToPay: Number(finalAmount.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  console.log("Замовлення сформовано (JSON Payload):", orderData);
  alert(`Дякуємо, ${name}! Замовлення на суму ${finalAmount} грн успішно прийнято.`);

  // Очищаємо кошик та скидаємо поля форми
  cart = [];
  updateCartSummary();
  orderForm.reset();
}
```

### 7. Збереження результатів роботи (Commit & Push)

- відкрийте проєкт у браузері та протестуйте живий пошук - переконайтеся, що пошук працює в реальному часі незалежно від регістру літер (наприклад, "рюкзак", "Рюкзак");
- перевірте розрахунок кошика - додайте кілька позицій та переконайтеся у коректності підрахунку через `reduce()`;
- протестуйте валідацію форми - спробуйте надіслати порожні або некоректні дані та перевірте виведення підказок про помилки;
- перевірте дію промокоду - введіть `SALE10` і переконайтеся, що сума перераховується зі знижкою 10%;
- виконайте фіксацію змін у Git:
  ```bash
  git add .
  git commit -m "Add search, cart calculations and checkout form validation"
  git push origin master
  ```

## Результат

Інтернет-магазин "TechShop" доповнено повноцінною клієнтською обробкою даних: реалізовано динамічний живий пошук товарів з нормалізацією рядків, автоматичний розрахунок вартості та кількості покупок у кошику декларативними методами масивів (`reduce`), а також форму замовлення зі збором через `FormData`, санітизацією тексту та валідацією полів регулярними виразами.

## Контрольні питання

- навіщо при відправці форми обов'язково викликати метод `event.preventDefault()`;
- у чому полягає перевага використання класу `FormData` у порівнянні з ручним пошуком окремих полів через `document.querySelector()`;
- чому при створенні живого пошуку обробляється подія `input`, а не подія `change`;
- як за допомогою методів `trim()` та `toLowerCase()` реалізувати стійкий регістронезалежний пошук за підрядком;
- чому для підрахунку підсумкової вартості товарів у кошику метод `reduce()` є більш безпечним та декларативним, ніж звичайний цикл `for`.
