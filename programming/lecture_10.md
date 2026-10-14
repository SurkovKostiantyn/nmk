# Лекція 10 (2 години). Вступ до об'єктно-орієнтованого програмування (ООП) у PHP

## План лекції

1. Навіщо потрібне ООП: проблеми процедурного підходу та що таке парадигма.
2. Клас і об'єкт: оголошення, властивості та методи.
3. Модифікатори доступу: `public`, `private`, `protected`.
4. Конструктор `__construct` та псевдозмінна `$this`.
5. Сучасний синтаксис: Constructor Promotion та типізація властивостей.
6. Бізнес-методи: інкапсуляція поведінки всередині класу.
7. Приклади коду.

## Перелік умовних скорочень

- **ООП** — об'єктно-орієнтоване програмування (Object-Oriented Programming, OOP).
- **Клас (Class)** — шаблон (blueprint) для створення об'єктів; описує їхні властивості та поведінку.
- **Об'єкт (Object / Instance)** — конкретний екземпляр класу, створений у пам'яті за допомогою оператора `new`.
- **Властивість (Property)** — змінна, що належить об'єкту та описує його стан.
- **Метод (Method)** — функція, що належить класу та описує його поведінку.
- **Інкапсуляція (Encapsulation)** — принцип приховування внутрішньої реалізації об'єкта від зовнішнього коду.
- **Конструктор (Constructor)** — магічний метод `__construct`, що автоматично викликається під час створення об'єкта.
- **`$this`** — псевдозмінна, що всередині методу вказує на поточний конкретний об'єкт.

## Вступ

На цьому етапі курсу наш проєкт «Менеджер завдань» написано у процедурному стилі: дані про завдання зберігаються у звичайних асоціативних масивах, функції описуються глобально і жодним чином не прив'язані до даних, якими вони маніпулюють. Поки файлів три-чотири — це терпимо. Але в реальному застосунку з десятками файлів такий підхід швидко перетворюється на хаос.

Об'єктно-орієнтоване програмування (ООП) — це спосіб організувати код інакше: згрупувати дані та функції, що ними керують, в єдину логічну одиницю — **клас**. У цій лекції ми розглянемо фундаментальні концепції ООП у PHP: як оголошувати класи, створювати об'єкти, контролювати доступ до їхніх даних та описувати поведінку через методи.

---

## 1. Навіщо потрібне ООП: проблеми процедурного підходу

### Типова процедурна структура

Уявімо, що в нашому проєкті «Менеджер завдань» завдання представлено масивом:

```php
<?php
$task = [
    'id'           => 1,
    'title'        => 'Вивчити PHP',
    'is_completed' => false,
    'deadline'     => '2026-12-31',
];

// Функції для роботи з завданням — десь в іншому файлі, глобально
function isTaskOverdue(array $task): bool {
    return !$task['is_completed'] && strtotime($task['deadline']) < time();
}

function completeTask(array &$task): void {
    $task['is_completed'] = true;
}
```

Що не так із цим кодом при масштабуванні?

- дані (`$task`) та функції (`isTaskOverdue`, `completeTask`) повністю роз'єднані. Нічого не заважає викликати `completeTask()` з масивом `$user` — PHP не попередить про помилку;
- глобальний простір імен засмічується: після додавання ще 50 сутностей стають наявними сотні функцій з подібними назвами;
- відсутній захист даних — будь-який рядок коду може напряму змінити `$task['id'] = 999` без жодних перевірок.

### Підхід ООП

В ООП дані та методи, що ними керують, живуть разом всередині **класу**:

```php
<?php
class Task {
    public int    $id;
    public string $title;
    public bool   $isCompleted;
    public string $deadline;

    public function isOverdue(): bool {
        return !$this->isCompleted && strtotime($this->deadline) < time();
    }

    public function complete(): void {
        $this->isCompleted = true;
    }
}
```

Тепер об'єкт `Task` несе в собі і власні дані, і логіку роботи з ними. Викликати `$task->complete()` на об'єкті `$user` вже неможливо.

---

## 2. Клас і об'єкт: оголошення та створення

### Оголошення класу

Клас оголошується ключовим словом `class`. Усередині нього описуються **властивості** (змінні) та **методи** (функції):

```php
<?php
// Файл: Task.php

class Task
{
    // Властивості — описують стан об'єкта
    public int    $id;
    public string $title;
    public bool   $isCompleted = false; // Значення за замовчуванням
}
```

### Створення об'єкта (екземпляра класу)

Об'єкт (екземпляр) класу створюється оператором `new`. Кожен новий виклик `new Task()` породжує незалежний об'єкт у пам'яті:

```php
<?php
require_once 'Task.php';

// Створення двох окремих об'єктів одного класу
$task1 = new Task();
$task1->id    = 1;
$task1->title = 'Вивчити PHP';

$task2 = new Task();
$task2->id    = 2;
$task2->title = 'Написати лабораторну';

// Зміна $task1 НЕ впливає на $task2 — це різні об'єкти
$task1->isCompleted = true;

var_dump($task1->isCompleted); // bool(true)
var_dump($task2->isCompleted); // bool(false)
```

---

## 3. Модифікатори доступу: `public`, `private`, `protected`

Модифікатори доступу визначають, звідки можна читати або змінювати властивість чи викликати метод.

- `public` — доступно звідусіль: з будь-якого місця поза класом, із підкласів (нащадків) і всередині самого класу;
- `private` — доступно **лише всередині** самого класу, де воно оголошене. Підкласи та зовнішній код не мають до нього доступу;
- `protected` — доступно всередині класу **та у його підкласах** (нащадках через наслідування), але не з зовнішнього коду.

### Навіщо це потрібно?

Розглянемо приклад класу `User` із незахищеним паролем:

```php
<?php
class User
{
    public string $email;
    public string $password; // Небезпечно!
}

$user = new User();
$user->password = 'abc'; // Будь-хто ззовні може підставити будь-яке значення
```

Якщо зробити `$password` приватним і дозволити його зміну лише через спеціальний метод, що перевіряє складність:

```php
<?php
class User
{
    public  string $email;
    private string $password; // Тепер захищено

    public function setPassword(string $rawPassword): void
    {
        // Лише тут можна перевірити, що пароль не порожній
        if (strlen($rawPassword) < 8) {
            throw new InvalidArgumentException('Пароль надто короткий!');
        }
        // Зберігаємо хеш, а не сирий пароль
        $this->password = password_hash($rawPassword, PASSWORD_BCRYPT);
    }

    public function checkPassword(string $rawPassword): bool
    {
        return password_verify($rawPassword, $this->password);
    }
}

$user = new User();
$user->setPassword('secure_pass_123'); // Працює
// $user->password = 'hack'; // Fatal error: Cannot access private property
```

Це і є **інкапсуляція**: зовнішній код взаємодіє з об'єктом лише через публічний інтерфейс (методи), а внутрішній стан захищений від некоректних змін.

---

## 4. Конструктор `__construct` та псевдозмінна `$this`

### Проблема: заповнення властивостей після створення

Без конструктора кожен новий об'єкт виходить «порожнім» і потребує ручного заповнення властивостей по одній:

```php
<?php
$task = new Task();
$task->id    = 1;           // Рядок 1
$task->title = 'Вивчити PHP'; // Рядок 2
$task->deadline = '2026-12-31'; // Рядок 3
// Легко забути заповнити одне з полів...
```

### Конструктор `__construct`

**Конструктор** — це спеціальний магічний метод з іменем `__construct`, який PHP автоматично викликає в момент виконання оператора `new`. Він дозволяє ініціалізувати об'єкт одразу з потрібними даними:

```php
<?php
class Task
{
    public int    $id;
    public string $title;
    public bool   $isCompleted;
    public string $deadline;

    public function __construct(
        int    $id,
        string $title,
        string $deadline,
        bool   $isCompleted = false
    ) {
        // $this -> посилання на ПОТОЧНИЙ об'єкт, що створюється
        $this->id          = $id;
        $this->title       = $title;
        $this->deadline    = $deadline;
        $this->isCompleted = $isCompleted;
    }
}

// Тепер об'єкт одразу повністю ініціалізований
$task = new Task(1, 'Вивчити PHP', '2026-12-31');
```

### Псевдозмінна `$this`

`$this` — це не звичайна змінна, а спеціальний вказівник (reference), що всередині будь-якого методу вказує на той конкретний об'єкт, через який метод було викликано. Завдяки `$this` кожен об'єкт «знає» свої власні дані:

```php
<?php
$task1 = new Task(1, 'Вивчити PHP', '2026-12-31');
$task2 = new Task(2, 'Написати лабораторну', '2026-11-01');

// Коли викликається $task1->getTitle(),
// всередині методу $this вказує саме на $task1
// Коли викликається $task2->getTitle(),
// $this вказує на $task2
echo $task1->getTitle(); // 'Вивчити PHP'
echo $task2->getTitle(); // 'Написати лабораторну'
```

---

## 5. Сучасний синтаксис: Constructor Promotion та типізація

### Constructor Promotion (PHP 8.0+)

Починаючи з PHP 8.0, замість оголошення властивостей окремо та їхнього присвоювання в конструкторі через `$this->...`, можна зробити це одночасно, додавши модифікатор доступу прямо до параметрів конструктора:

```php
<?php
// Класичний підхід (до PHP 8.0):
class Task
{
    public int    $id;
    public string $title;
    public bool   $isCompleted;

    public function __construct(int $id, string $title, bool $isCompleted = false)
    {
        $this->id          = $id;
        $this->title       = $title;
        $this->isCompleted = $isCompleted;
    }
}
```

```php
<?php
// Сучасний підхід — Constructor Promotion (PHP 8.0+):
// Результат ідентичний, але коду набагато менше
class Task
{
    public function __construct(
        public readonly int    $id,
        public string          $title,
        public bool            $isCompleted = false,
        public ?string         $deadline    = null,
    ) {}
    // Властивості $id, $title, $isCompleted та $deadline
    // оголошуються та ініціалізуються автоматично
}
```

### Модифікатор `readonly` (PHP 8.1+)

`readonly` забороняє зміну властивості після ініціалізації в конструкторі. Ідеально підходить для незмінних ідентифікаторів:

```php
<?php
class Task
{
    public function __construct(
        public readonly int $id, // Після присвоєння в __construct змінити неможливо
        public string       $title,
    ) {}
}

$task = new Task(1, 'Вивчити PHP');
echo $task->id; // 1

// $task->id = 99; // Fatal error: Cannot modify readonly property Task::$id
$task->title = 'Змінена назва'; // OK, readonly не застосовано до title
```

---

## 6. Бізнес-методи: інкапсуляція поведінки

Справжня цінність ООП полягає не лише в групуванні даних, а й у тому, що об'єкт несе в собі всю логіку роботи з цими даними — **бізнес-методи**.

### Геттери та сеттери

Якщо властивість оголошена як `private`, для читання та запису її значення використовуються публічні методи-геттери та сеттери:

```php
<?php
class Task
{
    private string $title;

    public function __construct(string $title)
    {
        $this->setTitle($title); // Відразу використовуємо сеттер з валідацією
    }

    // Геттер — повертає значення
    public function getTitle(): string
    {
        return $this->title;
    }

    // Сеттер — встановлює значення з перевіркою
    public function setTitle(string $title): void
    {
        $trimmed = trim($title);
        if (empty($trimmed)) {
            throw new InvalidArgumentException('Назва завдання не може бути порожньою.');
        }
        $this->title = $trimmed;
    }
}

$task = new Task('  Вивчити PHP  ');
echo $task->getTitle(); // 'Вивчити PHP' (зайві пробіли прибрані)
```

### Повноцінний клас `Task` із бізнес-методами

Зібравши все докупи, отримаємо клас, що є самодостатньою моделлю сутності «Завдання»:

```php
<?php
declare(strict_types=1);

class Task
{
    public function __construct(
        public readonly int    $id,
        private string         $title,
        private bool           $isCompleted = false,
        private ?string        $deadline    = null,
    ) {
        // Валідація прямо в конструкторі
        if (empty(trim($title))) {
            throw new InvalidArgumentException('Назва завдання не може бути порожньою.');
        }
    }

    // --- Геттери ---

    public function getTitle(): string
    {
        return $this->title;
    }

    public function isCompleted(): bool
    {
        return $this->isCompleted;
    }

    public function getDeadline(): ?string
    {
        return $this->deadline;
    }

    // --- Бізнес-методи ---

    /**
     * Перевіряє, чи завдання прострочене:
     * воно не виконане і дедлайн вже минув.
     */
    public function isOverdue(): bool
    {
        if ($this->isCompleted || $this->deadline === null) {
            return false;
        }
        return strtotime($this->deadline) < time();
    }

    /**
     * Позначає завдання як виконане.
     * Повторний виклик на вже виконаному завданні нічого не робить.
     */
    public function complete(): void
    {
        $this->isCompleted = true;
    }

    /**
     * Повертає зрозумілий текстовий статус завдання.
     */
    public function getStatusLabel(): string
    {
        if ($this->isCompleted) {
            return 'Виконано';
        }
        if ($this->isOverdue()) {
            return 'Прострочено';
        }
        return 'В процесі';
    }
}
```

### Використання класу в контексті застосунку

```php
<?php
require_once 'Task.php';

// Створення кількох завдань
$tasks = [
    new Task(1, 'Вивчити PHP ООП',     false, '2026-09-01'), // вже прострочено
    new Task(2, 'Написати лабораторну', false, '2026-12-31'),
    new Task(3, 'Здати залік',          false, '2027-01-20'),
];

// Виконуємо перше завдання
$tasks[0]->complete();

// Виводимо список завдань у HTML-шаблоні
foreach ($tasks as $task) {
    $statusClass = match($task->getStatusLabel()) {
        'Виконано'   => 'badge-success',
        'Прострочено'=> 'badge-danger',
        default      => 'badge-primary',
    };

    echo "<div class=\"task\">";
    echo "  <span>{$task->getTitle()}</span>";
    echo "  <span class=\"badge {$statusClass}\">{$task->getStatusLabel()}</span>";
    echo "</div>";
}
```

## 7. Приклади коду

### Приклад 1. Клас `Rectangle` — площа та периметр

Найпростіший клас, що приймає дані через конструктор і надає методи для обчислень:

```php
<?php
declare(strict_types=1);

class Rectangle
{
    public function __construct(
        private float $width,
        private float $height,
    ) {}

    public function area(): float
    {
        return $this->width * $this->height;
    }

    public function perimeter(): float
    {
        return 2 * ($this->width + $this->height);
    }

    public function isSquare(): bool
    {
        return $this->width === $this->height;
    }
}

$rect = new Rectangle(5.0, 3.0);
echo $rect->area();      // 15
echo $rect->perimeter(); // 16
echo $rect->isSquare() ? 'Квадрат' : 'Не квадрат'; // Не квадрат

$square = new Rectangle(4.0, 4.0);
echo $square->isSquare() ? 'Квадрат' : 'Не квадрат'; // Квадрат
```

### Приклад 2. Клас `BankAccount` — інкапсуляція та захист балансу

Демонструє `private`-властивість та захист від некоректних операцій через методи:

```php
<?php
declare(strict_types=1);

class BankAccount
{
    private float $balance;

    public function __construct(float $initialBalance = 0.0)
    {
        if ($initialBalance < 0) {
            throw new InvalidArgumentException('Початковий баланс не може бути від\'ємним.');
        }
        $this->balance = $initialBalance;
    }

    public function deposit(float $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Сума поповнення має бути більше нуля.');
        }
        $this->balance += $amount;
    }

    public function withdraw(float $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Сума зняття має бути більше нуля.');
        }
        if ($amount > $this->balance) {
            throw new RuntimeException('Недостатньо коштів на рахунку.');
        }
        $this->balance -= $amount;
    }

    public function getBalance(): float
    {
        return $this->balance;
    }
}

$account = new BankAccount(1000.0);
$account->deposit(500.0);
echo $account->getBalance(); // 1500

$account->withdraw(200.0);
echo $account->getBalance(); // 1300

// $account->balance = 99999; // Fatal error: Cannot access private property
```

### Приклад 3. Клас `Counter` — `readonly`, кілька методів та ланцюжок об'єктів

Показує різницю між незмінним ідентифікатором (`readonly`) та змінним станом:

```php
<?php
declare(strict_types=1);

class Counter
{
    private int $value;

    public function __construct(
        public readonly string $name,
        int $startValue = 0,
    ) {
        $this->value = $startValue;
    }

    public function increment(int $by = 1): void
    {
        $this->value += $by;
    }

    public function decrement(int $by = 1): void
    {
        $this->value = max(0, $this->value - $by); // Не опускаємось нижче нуля
    }

    public function reset(): void
    {
        $this->value = 0;
    }

    public function getValue(): int
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return "{$this->name}: {$this->value}";
    }
}

$visits  = new Counter('Відвідувань', 100);
$errors  = new Counter('Помилок');

$visits->increment();
$visits->increment(5);
echo $visits->getValue(); // 106
echo $visits;             // Відвідувань: 106  (завдяки __toString)

$errors->increment(3);
$errors->decrement(1);
echo $errors->getValue(); // 2

// $errors->name = 'Хак'; // Fatal error: Cannot modify readonly property
```

### Приклад 4. Кілька об'єктів одного класу: незалежність стану

Підтверджує, що кожен об'єкт має свій власний стан, незалежний від інших:

```php
<?php
declare(strict_types=1);

class Lamp
{
    private bool $isOn = false;

    public function __construct(public readonly string $color) {}

    public function turnOn(): void  { $this->isOn = true; }
    public function turnOff(): void { $this->isOn = false; }

    public function getStatus(): string
    {
        $state = $this->isOn ? 'увімкнена' : 'вимкнена';
        return "Лампа [{$this->color}]: {$state}";
    }
}

$red   = new Lamp('червона');
$blue  = new Lamp('синя');
$green = new Lamp('зелена');

$red->turnOn();
$green->turnOn();
// $blue залишається вимкненою

echo $red->getStatus();   // Лампа [червона]: увімкнена
echo $blue->getStatus();  // Лампа [синя]: вимкнена
echo $green->getStatus(); // Лампа [зелена]: увімкнена
```


---

## Висновки

1. ООП дозволяє групувати дані та пов'язану з ними логіку в єдину сутність — **клас**, усуваючи безлад глобальних масивів і розрізнених функцій процедурного коду.
2. Оператор `new` створює незалежний **об'єкт** (екземпляр) класу в пам'яті; зміни в одному об'єкті не впливають на інші.
3. Модифікатори доступу `public`, `private` та `protected` реалізують **інкапсуляцію** — захист внутрішнього стану від некоректних зовнішніх змін.
4. **Конструктор** `__construct` ініціалізує об'єкт у момент його створення; **`$this`** — це вказівник на поточний конкретний об'єкт всередині методу.
5. Синтаксис **Constructor Promotion** (PHP 8.0+) скорочує оголошення властивостей і їхнє присвоювання до одного рядка; модифікатор `readonly` (PHP 8.1+) гарантує незмінність поля після ініціалізації.
6. **Бізнес-методи** (`isOverdue()`, `complete()`, `getStatusLabel()`) інкапсулюють поведінку всередині класу: зовнішній код не знає деталей реалізації і не потребує їх знати.

## Рекомендована література та джерела

- офіційна документація PHP: основи ООП — https://www.php.net/manual/uk/language.oop5.php;
- офіційна документація PHP: Constructor Promotion — https://www.php.net/manual/en/language.oop5.decon.php#language.oop5.decon.constructor.promotion;
- офіційна документація PHP: readonly properties — https://www.php.net/manual/en/language.oop5.properties.php#language.oop5.properties.readonly-properties;
- довідник з концепцій ООП для початківців на PHP The Right Way — https://phptherightway.com/#object-oriented-programming.

## Запитання для самоперевірки

1. Поясніть метафору «Клас — це креслення, об'єкт — це реальний виріб за цим кресленням». Скільки різних об'єктів класу `Task` можна створити одночасно, і чи впливатиме зміна одного з них на інші?
2. У чому полягає різниця між модифікаторами доступу `public` та `private`? Наведіть конкретний приклад: яку властивість класу `User` доцільно оголосити як `private` і чому?
3. Поясніть призначення псевдозмінної `$this`. Що відбудеться під час виконання рядка `$this->title = $title` у конструкторі, якщо в пам'яті одночасно існують два об'єкти `$task1` і `$task2`?
4. Чим синтаксис Constructor Promotion (PHP 8.0+) відрізняється від класичного оголошення властивостей? Запишіть клас `User` з полями `$id`, `$email` та `$username` у обох варіантах.
5. Що таке бізнес-метод і чим він відрізняється від простого геттера? Наведіть приклад бізнес-методу для класу `Task`, що перевіряє, чи не прострочене завдання.
