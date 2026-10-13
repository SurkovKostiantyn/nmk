# Лекція №14 (2 години). Просунута робота з DOM та подіями.

## План лекції

1. Повторення: фази подій (Занурення та Спливання).
2. Патерн "Делегування подій" (Event Delegation) у складних інтерфейсах.
3. Native HTML5 Drag-and-Drop API.
4. Створення кастомного Drag-and-Drop (через події миші).
5. Відстеження змін у DOM-дереві: `MutationObserver`.

## Перелік умовних скорочень

- **DOM** (Document Object Model) — об'єктна модель документа.
- **API** (Application Programming Interface) — інтерфейс прикладного програмування.
- **JS** — JavaScript.
- **D&D** (Drag and Drop) — інтерфейс "тягни та кидай" (перетягування елементів).
- **UI** (User Interface) — користувацький інтерфейс.

## Вступ

В попередніх модулях ми познайомилися з основами DOM та обробки подій. Ми навчилися "слухати" кліки, взаємодіяти з формами та базово розуміємо концепцію спливання подій (Bubbling).

Проте при створенні сучасних інтерактивних веб-додатків (наприклад, дошок Trello, динамічних таблиць або складних UI-віджетів) базових знань стає недостатньо. Як ефективно обробляти кліки для тисяч елементів, які постійно створюються і видаляються? Як реалізувати плавне перетягування карток? І головне — як дізнатися, що у DOM-дереві щось змінилося, якщо ці зміни були зроблені іншим стороннім скриптом?

У цій лекції ми розглянемо потужні інструменти та патерни JavaScript, які допоможуть вам підняти роботу з DOM на новий, архітектурний рівень.

---

## 1. Делегування подій (Event Delegation)

Делегування подій — це один із найважливіших архітектурних патернів у JavaScript. Його суть полягає в тому, що замість призначення обробників подій (Event Listeners) на кожен окремий дочірній елемент, ми призначаємо **один єдиний обробник** на їхнього спільного батька.

### 1.1. Проблема сотні обробників

Уявіть список завдань (To-Do List), де користувач може динамічно додавати нові пункти. Біля кожного пункту є кнопка "Видалити".

```html
<ul id="todo-list">
  <li>Купити молоко <button class="delete-btn">x</button></li>
  <li>Вивчити JS <button class="delete-btn">x</button></li>
  <!-- ... ще 1000 елементів ... -->
</ul>
```

Якщо ми будемо шукати всі кнопки і вішати на них `addEventListener`, ми зіткнемося з двома проблемами:
1. **Витік пам'яті (Memory Leak):** 1000 обробників забирають багато оперативної пам'яті браузера, що може призвести до "гальм" на слабких пристроях.
2. **Динамічні елементи:** коли ми додамо новий пункт `<li>` через JS, на його кнопці "Видалити" не буде висіти обробника (адже ми вішали їх лише для існуючих на момент завантаження сторінки кнопок).

### 1.2. Вирішення: Делегування та метод `closest()`

Завдяки механізму **спливання (Bubbling)**, клік на кнопці обов'язково "спливе" до батьківського тегу `<ul>`. Тому ми вішаємо слухач на `<ul>` і перевіряємо, на чому саме стався клік за допомогою методу `closest(selector)`. 

Цей метод шукає елемент, піднімаючись вгору по дереву, що рятує нас, якщо кнопка має всередині інші теги (наприклад, іконку `<i>`).

```javascript
const todoList = document.getElementById('todo-list');

todoList.addEventListener('click', (event) => {
  // Шукаємо найближчу кнопку вгору по дереву, починаючи від місця кліку
  const btn = event.target.closest('.delete-btn');
  
  // Якщо клік був не всередині кнопки - ігноруємо подію (вихід з функції)
  if (!btn) return; 
  
  // Якщо ми тут, значить клікнули саме по кнопці
  const li = btn.closest('li'); // Знаходимо батьківський елемент списку
  li.remove(); // Видаляємо його
});
```

### 1.3. Патерн "Дії" (Action Pattern) через `data-*` атрибути

У складних додатках один клік може викликати різні дії. Наприклад, в рядку таблиці є кнопки "Редагувати", "Зберегти" та "Видалити". В цьому випадку дуже зручно використовувати спеціальні HTML5 `data-*` атрибути.

```html
<!-- Зверніть увагу на атрибут data-action -->
<div class="user-card">
  <button data-action="save">Зберегти</button>
  <button data-action="edit">Редагувати</button>
  <button data-action="delete">Видалити</button>
</div>
```

В JS ми обробляємо всі ці кнопки через один слухач:

```javascript
const card = document.querySelector('.user-card');

card.addEventListener('click', (event) => {
  const target = event.target;
  
  // Якщо клікнули не на кнопку з атрибутом data-action, виходимо
  if (!target.dataset.action) return;

  // Отримуємо значення атрибута (наприклад 'save' або 'delete')
  const action = target.dataset.action;
  
  // Викликаємо відповідну логіку
  if (action === 'save') {
    console.log('Зберігаємо дані...');
  } else if (action === 'edit') {
    console.log('Відкриваємо форму редагування...');
  } else if (action === 'delete') {
    console.log('Видаляємо картку!');
  }
});
```
Цей підхід робить код надзвичайно читабельним та масштабованим!

---

## 2. Native HTML5 Drag-and-Drop API

HTML5 надав стандартний механізм перетягування елементів. Щоб зробити будь-який HTML-елемент (окрім посилань та зображень, які перетягуються за замовчуванням) "тягучим", достатньо додати йому атрибут `draggable="true"`.

```html
<style>
  .card { width: 100px; height: 100px; background: tomato; cursor: grab; }
  .card.dragging { opacity: 0.5; }
  .drop-zone { border: 2px dashed gray; padding: 20px; min-height: 150px; }
  .drop-zone.hovered { border-color: green; background: #f0fff0; }
</style>

<div class="card" draggable="true" id="card-1">Тягни мене</div>
<br><br>
<div class="drop-zone" id="zone">Кидай сюди</div>
```

### 2.1. Події перетягуваного елемента

Нам потрібно "захопити" ID картки в момент початку її перетягування. Для цього використовується об'єкт `event.dataTransfer`.

```javascript
const card = document.getElementById('card-1');

card.addEventListener('dragstart', (event) => {
  // Зберігаємо ідентифікатор елемента у "буфер обміну" Drag-and-Drop
  event.dataTransfer.setData('text/plain', event.target.id);
  event.target.classList.add('dragging'); // Робимо картку напівпрозорою
});

card.addEventListener('dragend', (event) => {
  event.target.classList.remove('dragging'); // Повертаємо нормальний вигляд
});
```

### 2.2. Події зони кидання (Drop Zone)

За замовчуванням браузер забороняє "кидати" елементи куди завгодно (наприклад, щоб випадково не відкрити файл замість сторінки). Ми повинні перебити цю поведінку за допомогою `preventDefault()`.

```javascript
const dropZone = document.getElementById('zone');

// ДОЗВОЛЯЄМО кидання (це критично важливо!)
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault(); 
});

// Анімація: коли картка знаходиться над зоною
dropZone.addEventListener('dragenter', (event) => {
  dropZone.classList.add('hovered'); 
});

// Анімація: коли картка покинула зону
dropZone.addEventListener('dragleave', (event) => {
  dropZone.classList.remove('hovered');
});

// Обробляємо момент кидання
dropZone.addEventListener('drop', (event) => {
  event.preventDefault(); // Запобігаємо стандартній поведінці браузера
  dropZone.classList.remove('hovered'); // Прибираємо зелений фон
  
  // Дістаємо ID, який ми поклали в dragstart
  const cardId = event.dataTransfer.getData('text/plain');
  const draggedElement = document.getElementById(cardId);
  
  // Переміщуємо DOM-вузол у нове місце
  dropZone.appendChild(draggedElement);
});
```

---

## 3. Створення кастомного Drag-and-Drop (через події миші)

Незважаючи на наявність Native D&D, він має суттєві недоліки:
- Ми не можемо змінити візуальне відображення "привида" елемента, який тягнеться за курсором.
- Він може працювати нестабільно на мобільних пристроях (сенсорних екранах).

Тому складні та кастомні перетягування пишуть вручну на базі трьох подій:
1. `mousedown` — натискання на елементі.
2. `mousemove` — рух миші по всьому документу.
3. `mouseup` — відпускання кнопки.

Логіка: елементу встановлюється `position: absolute`, і під час `mousemove` ми динамічно змінюємо його `left` і `top`.

### 3.1. Реалізація (Код)

```html
<style>
  #ball { width: 50px; height: 50px; border-radius: 50%; background: blue; cursor: pointer; }
</style>

<div id="ball"></div>
```

```javascript
const ball = document.getElementById('ball');

// Відключаємо стандартний D&D браузера, щоб не було конфліктів!
ball.ondragstart = () => false;

ball.addEventListener('mousedown', function(event) {
  // 1. Відриваємо елемент від звичайного потоку документа
  ball.style.position = 'absolute';
  ball.style.zIndex = 1000;
  
  // Переміщуємо м'яч прямо в body, щоб він міг літати поверх усього
  document.body.append(ball);

  // Функція центрування м'яча прямо під курсором миші
  function moveAt(pageX, pageY) {
    ball.style.left = pageX - ball.offsetWidth / 2 + 'px';
    ball.style.top = pageY - ball.offsetHeight / 2 + 'px';
  }

  // Одразу ставимо м'яч під курсор при натисканні
  moveAt(event.pageX, event.pageY);

  // 2. Обробник руху миші
  function onMouseMove(event) {
    moveAt(event.pageX, event.pageY);
  }

  // Важливо! Ми слухаємо рух миші на рівні ВСЬОГО документа, 
  // бо при швидкому русі курсор може вийти за межі м'яча
  document.addEventListener('mousemove', onMouseMove);

  // 3. Відпускання кнопки миші
  ball.addEventListener('mouseup', function() {
    // Знімаємо обробник руху, м'яч залишається на своєму місці
    document.removeEventListener('mousemove', onMouseMove);
    // Прибираємо сам обробник mouseup, щоб уникнути витоку пам'яті
    ball.onmouseup = null;
  }, { once: true }); // {once: true} гарантує, що подія спрацює лише 1 раз
});
```
Цей код є основою для будь-яких візуально складних ефектів перетягування.

---

## 4. Відстеження змін у DOM: MutationObserver

Часто виникають завдання, коли нам потрібно відреагувати на зміни в HTML, які робимо не ми. Наприклад:
- Сторонній віджет чату асинхронно додав нове повідомлення в `<div>`. Нам треба проскролити вниз.
- Рекламний скрипт змінив клас або `style` елемента на `display: none`.
- Ми розробляємо плагін для браузера (Chrome Extension) і хочемо знати, коли на сторінці з'явиться певний елемент.

Раніше для цього писали `setInterval`, який кожні 100мс перевіряв елемент. Це жахливо впливало на продуктивність (батарею ноутбуків). Тепер є **`MutationObserver`**.

### 4.1. Як це працює?

Ми створюємо "спостерігача", передаємо йому функцію, яка виконається **асинхронно**, коли браузер зафіксує зміни, і вказуємо правила (конфігурацію) того, за чим саме слідкувати.

```javascript
// 1. Знаходимо елемент, за яким будемо шпигувати
const targetNode = document.getElementById('chat-box');

// 2. Створюємо екземпляр Observer з функцією-обробником
const observer = new MutationObserver((mutationsList, observer) => {
  // mutationsList — це масив об'єктів з усіма змінами, що відбулись
  for (let mutation of mutationsList) {
    
    // Якщо змінилася кількість дочірніх тегів (додали нове повідомлення)
    if (mutation.type === 'childList') {
      console.log('У чаті зявилися нові вузли:', mutation.addedNodes);
      
    // Якщо у елемента змінився якийсь атрибут
    } else if (mutation.type === 'attributes') {
      console.log(`Атрибут ${mutation.attributeName} було змінено!`);
    }
  }
});

// 3. Налаштовуємо конфігурацію спостереження
const config = { 
  childList: true, // слідкувати за додаванням/видаленням вузлів
  attributes: true, // слідкувати за змінами атрибутів (id, class, src...)
  subtree: true     // слідкувати не лише за chat-box, але й за всіма його вкладеними тегами
};

// 4. Запускаємо стеження
observer.observe(targetNode, config);

// За необхідності, спостереження можна зупинити:
// observer.disconnect();
```

### 4.2. Фільтрація спостережень
Якщо нам треба знати ТІЛЬКИ про зміну одного конкретного класу (наприклад, коли скрипт додає елементу клас `.active`), ми можемо оптимізувати Observer:

```javascript
const observerOpt = new MutationObserver((mutations) => {
  mutations.forEach(m => console.log('Клас змінився на:', m.target.className));
});

observerOpt.observe(targetNode, {
  attributes: true,
  attributeFilter: ['class'] // Браузер викличе функцію ТІЛЬКИ якщо змінився атрибут "class"
});
```

`MutationObserver` — незамінний інструмент при інтеграції різних ізольованих систем на одній сторінці.

---

## Висновки

1. **Делегування подій** — архітектурний стандарт для роботи зі списками, таблицями та динамічним контентом. Використання методів `closest()` та `data-*` атрибутів дозволяє написати чистий, масштабований код, який обробляє складні дії за допомогою лише одного слухача.
2. **Native HTML5 Drag-and-Drop API** дозволяє швидко інтегрувати перетягування (аж до системних файлів), але завжди пам'ятайте про блокування дефолтної поведінки `dragover` через `preventDefault()`.
3. Для точного, плавного та піксель-перфектного перетягування (з підтримкою кастомних анімацій) розробники створюють логіку власноруч через **події миші** (`mousedown` + `mousemove` + абсолютне позиціювання).
4. **`MutationObserver`** — це сучасний і оптимізований підхід для відстеження змін у DOM-дереві, що прийшов на заміну "брудним" перевіркам через `setInterval`.

## Джерела

1. [MDN: Вступ до подій та делегування](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation)
2. [Javascript.info: Делегування подій та патерн дій](https://uk.javascript.info/event-delegation)
3. [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
4. [Javascript.info: Drag'n'Drop з подіями миші (повний розбір)](https://uk.javascript.info/mouse-drag-and-drop)
5. [Javascript.info: MutationObserver](https://uk.javascript.info/mutation-observer)

## Запитання для самоперевірки

1. Яку проблему вирішує патерн "делегування подій" при роботі з тисячами інтерактивних рядків таблиці?
2. В чому перевага використання `data-*` атрибутів (`dataset`) при делегуванні подій порівняно з перевіркою класів?
3. Чому при написанні обробника кліку ми використовуємо метод `event.target.closest('button')`, а не перевіряємо просто `event.target.tagName === 'BUTTON'`?
4. Без якої обов'язкової дії браузер не дозволить скинути (drop) елемент в зону призначення у Native D&D?
5. Яку роль відіграє об'єкт `event.dataTransfer`? На якому етапі туди записуються дані?
6. З якою метою у кастомному D&D обробник `mousemove` вішається на весь `document`, а не на сам елемент, який ми тягнемо?
7. Що таке `MutationObserver` і в яких реальних задачах фронтенд-розробки він використовується?
8. Що означає налаштування `attributeFilter: ['class']` в конфігурації `MutationObserver`?
