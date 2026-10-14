# Лекція 11 (2 години). Поглиблене ООП та обробка винятків у PHP

## План лекції

1. Наслідування (`extends`) та перевизначення методів.
2. Поліморфізм: один інтерфейс — різна поведінка.
3. Інтерфейси (`interface`): контракти між класами.
4. Абстрактні класи (`abstract`) та трейти (`trait`).
5. Статичні методи та властивості (`static`).
6. Механізм винятків: `try`, `catch`, `finally` та власні класи винятків.

## Перелік умовних скорочень

- **Наслідування (Inheritance)** — механізм, за якого клас-нащадок отримує властивості та методи батьківського класу і може їх розширювати або перевизначати.
- **Поліморфізм (Polymorphism)** — здатність різних класів відповідати на один і той самий виклик методу по-різному.
- **Інтерфейс (Interface)** — контракт (набір сигнатур методів), якому клас зобов'язується відповідати через `implements`.
- **Абстрактний клас (Abstract Class)** — клас, що не може бути instantiated напряму; визначає загальну поведінку для нащадків.
- **Трейт (Trait)** — механізм повторного використання коду, що дозволяє «вмонтувати» набір методів у будь-який клас без наслідування.
- **Виняток (Exception)** — об'єкт, що сигналізує про помилкову ситуацію під час виконання програми.
- **`try...catch...finally`** — конструкція для перехоплення та обробки винятків; `finally` виконується завжди.
- **`Throwable`** — базовий інтерфейс у PHP для всього, що можна кинути (`throw`); охоплює `Exception` та `Error`.

## Вступ

У попередній лекції ми навчилися створювати класи, додавати властивості та методи, захищати стан об'єкта через `private`. Але поки що кожен клас — це самодостатній «острів». У реальних проєктах класи рідко існують ізольовано: вони успадковують поведінку одне від одного, реалізують спільні контракти-інтерфейси, позичають шматки коду через трейти. А коли щось іде не так — кидають винятки, що є сучасною заміною безкінечних `return false` та перевірок `if ($result === null)`.

У цій лекції ми розберемо ці механізми на прикладі нашого «Менеджера завдань»: від абстрактного сховища даних до власних класів помилок.

---

## 1. Наслідування (`extends`) та перевизначення методів

### Базова ідея: клас-батько → клас-нащадок

Наслідування дозволяє новому класу перейняти всі властивості та методи вже існуючого класу і додати щось своє — або змінити деталі поведінки.

```php
<?php
declare(strict_types=1);

// Базовий клас (батько)
class Notification
{
    public function __construct(
        protected string $message,
        protected string $recipient,
    ) {}

    public function send(): void
    {
        echo "Надсилаємо повідомлення '{$this->message}' до {$this->recipient}";
    }

    public function getType(): string
    {
        return 'Базове повідомлення';
    }
}

// Клас-нащадок наслідує все від Notification
class EmailNotification extends Notification
{
    public function __construct(
        string $message,
        string $recipient,
        private string $subject, // Власне поле нащадка
    ) {
        // parent::__construct() — виклик конструктора батька
        parent::__construct($message, $recipient);
    }

    // Перевизначення (Override) методу батька
    public function send(): void
    {
        echo "Email до {$this->recipient}: [{$this->subject}] {$this->message}";
    }

    public function getType(): string
    {
        return 'Email-повідомлення';
    }
}

class SmsNotification extends Notification
{
    public function send(): void
    {
        // Скорочуємо повідомлення для SMS
        $short = mb_substr($this->message, 0, 160);
        echo "SMS до {$this->recipient}: {$short}";
    }

    public function getType(): string
    {
        return 'SMS-повідомлення';
    }
}
```

### Ключове слово `parent::`

`parent::` дозволяє нащадку звернутися до методу або конструктора батьківського класу, не дублюючи код:

```php
<?php
class PriorityTask extends Task
{
    public function __construct(
        int    $id,
        string $title,
        private string $priority = 'normal', // 'low', 'normal', 'high'
        bool   $isCompleted = false,
        ?string $deadline = null,
    ) {
        // Спочатку ініціалізуємо батьківські поля
        parent::__construct($id, $title, $isCompleted, $deadline);
    }

    // Розширення батьківського методу
    public function getStatusLabel(): string
    {
        $base = parent::getStatusLabel(); // Отримуємо рядок від батька
        return "[{$this->priority}] {$base}"; // Додаємо пріоритет
    }
}

$task = new PriorityTask(1, 'Зробити реліз', 'high', false, '2026-11-01');
echo $task->getStatusLabel(); // [high] В процесі
```

### Заборона наслідування: `final`

Якщо клас або метод оголошено `final`, PHP не дозволить його успадковувати або перевизначати:

```php
<?php
final class PaymentGateway
{
    // Цей клас не можна успадкувати — занадто критична логіка
}

// Fatal error: Class MockPaymentGateway cannot extend final class PaymentGateway
class MockPaymentGateway extends PaymentGateway {}
```

---

## 2. Поліморфізм: один виклик — різна поведінка

Поліморфізм означає, що код може працювати з об'єктами різних класів **однаково**, якщо вони мають спільний батьківський клас або реалізують спільний інтерфейс.

```php
<?php
// Функція не знає, який саме тип повідомлення їй передали
// Вона просто викликає send() — і кожен клас реагує по-своєму
function notifyUser(Notification $notification): void
{
    echo $notification->getType() . ': ';
    $notification->send();
    echo PHP_EOL;
}

$notifications = [
    new EmailNotification('Ваш акаунт активовано!', 'user@mail.com', 'Вітаємо'),
    new SmsNotification('Код підтвердження: 4782', '+380991234567'),
    new Notification('Системне повідомлення', 'admin'),
];

foreach ($notifications as $n) {
    notifyUser($n); // Один і той самий виклик — три різних результати
}
```

Вивід:
```
Email-повідомлення: Email до user@mail.com: [Вітаємо] Ваш акаунт активовано!
SMS-повідомлення: SMS до +380991234567: Код підтвердження: 4782
Базове повідомлення: Надсилаємо повідомлення 'Системне повідомлення' до admin
```

Саме поліморфізм дозволяє писати **узагальнений код**, що не залежить від конкретної реалізації.

---

## 3. Інтерфейси (`interface`): контракти між класами

### Проблема без інтерфейсів

Уявімо, що `TaskController` безпосередньо залежить від `TaskRepository`. Тоді в тестах нам **обов'язково** потрібна база даних — без неї контролер не запуститься.

```php
<?php
// Жорстка залежність від конкретного класу
class TaskController
{
    public function __construct(private TaskRepository $repo) {}
}
```

### Інтерфейс як контракт

**Інтерфейс** — це набір сигнатур методів без реалізації. Клас, що реалізує інтерфейс (`implements`), зобов'язаний надати реалізацію **кожного** методу.

```php
<?php
interface TaskStorageInterface
{
    /** @return Task[] */
    public function findAll(): array;

    public function findById(int $id): ?Task;

    public function add(string $title, ?string $deadline = null): Task;

    public function complete(int $id): bool;

    public function delete(int $id): bool;
}
```

Тепер `TaskController` залежить від **інтерфейсу**, а не від конкретного класу:

```php
<?php
class TaskController
{
    // Тепер залежимо від контракту, а не від реалізації
    public function __construct(private TaskStorageInterface $storage) {}
}
```

Реалізацій цього контракту може бути скільки завгодно:

```php
<?php
// Реалізація для MySQL через PDO
class TaskRepository implements TaskStorageInterface
{
    public function __construct(private \PDO $pdo) {}

    public function findAll(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM tasks');
        // ... повертає масив Task-об'єктів
    }

    public function findById(int $id): ?Task { /* ... */ }
    public function add(string $title, ?string $deadline = null): Task { /* ... */ }
    public function complete(int $id): bool { /* ... */ }
    public function delete(int $id): bool { /* ... */ }
}

// Реалізація для тестів (без БД, дані в масиві)
class InMemoryTaskRepository implements TaskStorageInterface
{
    private array $tasks = [];
    private int   $nextId = 1;

    public function findAll(): array { return $this->tasks; }

    public function findById(int $id): ?Task
    {
        foreach ($this->tasks as $task) {
            if ($task->getId() === $id) return $task;
        }
        return null;
    }

    public function add(string $title, ?string $deadline = null): Task
    {
        $task = new Task($this->nextId++, $title, false, $deadline);
        $this->tasks[] = $task;
        return $task;
    }

    public function complete(int $id): bool
    {
        $task = $this->findById($id);
        if (!$task) return false;
        $task->complete();
        return true;
    }

    public function delete(int $id): bool
    {
        foreach ($this->tasks as $key => $task) {
            if ($task->getId() === $id) {
                unset($this->tasks[$key]);
                $this->tasks = array_values($this->tasks);
                return true;
            }
        }
        return false;
    }
}

// Один і той самий контролер — дві різні реалізації
$controller1 = new TaskController(new TaskRepository($pdo));          // Prod
$controller2 = new TaskController(new InMemoryTaskRepository());       // Tests
```

### Клас може реалізовувати кілька інтерфейсів

```php
<?php
interface Countable
{
    public function count(): int;
}

interface Serializable
{
    public function toArray(): array;
}

// TaskRepository реалізує обидва контракти одночасно
class TaskRepository implements TaskStorageInterface, Countable, Serializable
{
    public function count(): int { return count($this->findAll()); }
    public function toArray(): array { /* ... */ }
    // ... решта методів
}
```

---

## 4. Абстрактні класи та трейти

### Абстрактний клас: загальне + обов'язкові деталі

`abstract class` займає проміжну позицію між звичайним класом та інтерфейсом:
- може мати **реалізовані** методи (загальна поведінка для всіх нащадків);
- може мати **абстрактні** методи (нащадок **зобов'язаний** їх реалізувати);
- **неможливо** створити екземпляр абстрактного класу напряму.

```php
<?php
abstract class BaseRepository
{
    // Реалізований метод — загальний для всіх нащадків
    protected function log(string $action, int $id): void
    {
        error_log("[{$action}] entity #{$id} at " . date('Y-m-d H:i:s'));
    }

    // Абстрактний метод — кожен нащадок реалізує по-своєму
    abstract public function findById(int $id): mixed;
    abstract public function delete(int $id): bool;
}

class TaskRepository extends BaseRepository
{
    // Зобов'язані реалізувати абстрактні методи
    public function findById(int $id): ?Task
    {
        // ...
    }

    public function delete(int $id): bool
    {
        $result = true; // ... реальна логіка
        if ($result) {
            $this->log('DELETE', $id); // Використовуємо метод батька
        }
        return $result;
    }
}

// Fatal error: Cannot instantiate abstract class BaseRepository
// $repo = new BaseRepository();
```

### Трейт: горизонтальне повторне використання коду

PHP підтримує **одиночне наслідування** — клас може успадковувати лише **один** батьківський клас. Трейти вирішують проблему повторного використання коду без множинного наслідування.

**Трейт** — це набір методів, що «вмонтовуються» в клас через ключове слово `use`:

```php
<?php
// Трейт для автоматичного запису часу створення та оновлення
trait TimestampableTrait
{
    private ?string $createdAt = null;
    private ?string $updatedAt = null;

    public function setCreatedAt(): void
    {
        $this->createdAt = date('Y-m-d H:i:s');
    }

    public function touch(): void
    {
        $this->updatedAt = date('Y-m-d H:i:s');
    }

    public function getCreatedAt(): ?string { return $this->createdAt; }
    public function getUpdatedAt(): ?string { return $this->updatedAt; }
}

// Трейт для перетворення об'єкта на рядок для логування
trait LoggableTrait
{
    public function toLogString(): string
    {
        return get_class($this) . '#' . ($this->getId() ?? '?');
    }
}

// Клас Task отримує функціональність обох трейтів
class Task
{
    use TimestampableTrait, LoggableTrait; // Підключаємо два трейти

    public function __construct(
        public readonly int $id,
        private string $title,
        private bool $isCompleted = false,
    ) {
        $this->setCreatedAt(); // Метод з TimestampableTrait
    }
}

class User
{
    use TimestampableTrait; // Той самий трейт у іншому класі

    public function __construct(public readonly int $id, private string $email)
    {
        $this->setCreatedAt();
    }
}

$task = new Task(1, 'Написати лекцію');
echo $task->getCreatedAt(); // 2026-10-14 09:30:00
echo $task->toLogString();  // Task#1

$user = new User(42, 'user@example.com');
echo $user->getCreatedAt(); // 2026-10-14 09:30:00
// $user->toLogString(); — недоступно: User не підключив LoggableTrait
```

---

## 5. Статичні методи та властивості (`static`)

`static`-члени належать **класу**, а не конкретному об'єкту. Вони існують в єдиному примірнику незалежно від того, скільки об'єктів цього класу було створено.

### Статична властивість — лічильник об'єктів

```php
<?php
class Task
{
    private static int $count = 0; // Спільна для всіх екземплярів

    public function __construct(
        public readonly int $id,
        private string $title,
    ) {
        self::$count++; // self:: — звернення до поточного класу
    }

    // Статичний метод викликається без створення об'єкта: Task::getCount()
    public static function getCount(): int
    {
        return self::$count;
    }
}

$t1 = new Task(1, 'Завдання А');
$t2 = new Task(2, 'Завдання Б');
$t3 = new Task(3, 'Завдання В');

echo Task::getCount(); // 3 — не через об'єкт, а через клас
```

### Фабричний метод (`static` factory)

Статичні методи часто використовують для альтернативних конструкторів (фабричних методів):

```php
<?php
class Task
{
    public function __construct(
        public readonly int    $id,
        private string         $title,
        private bool           $isCompleted = false,
        private ?string        $deadline    = null,
    ) {}

    // Фабричний метод: створює Task з масиву (наприклад, рядка з БД)
    public static function fromArray(array $data): self
    {
        return new self(
            id:          (int) $data['id'],
            title:       $data['title'],
            isCompleted: (bool) ($data['is_completed'] ?? false),
            deadline:    $data['deadline'] ?? null,
        );
    }

    // Фабричний метод: швидке створення нового порожнього завдання
    public static function create(string $title, ?string $deadline = null): self
    {
        static $nextId = 1; // static всередині функції — стійка змінна
        return new self($nextId++, $title, false, $deadline);
    }
}

// Використання фабричних методів
$fromDb   = Task::fromArray(['id' => 5, 'title' => 'З бази', 'is_completed' => 1]);
$newTask  = Task::create('Нове завдання', '2026-12-01');
```

---

## 6. Механізм винятків: `try`, `catch`, `finally`

### Проблема без винятків: «мовчазні» помилки

```php
<?php
// Процедурний підхід: помилка «ковтається» або повертається false
function findTask(array $tasks, int $id): array|false
{
    foreach ($tasks as $task) {
        if ($task['id'] === $id) return $task;
    }
    return false; // Що означає false? Немає завдання? БД недоступна?
}

$task = findTask($tasks, 999);
if ($task === false) {
    // Ми знаємо, що щось не так, але не знаємо ЩО саме
}
```

### Базова конструкція `try...catch`

```php
<?php
function divide(float $a, float $b): float
{
    if ($b === 0.0) {
        throw new InvalidArgumentException('Ділення на нуль неможливе!');
    }
    return $a / $b;
}

try {
    $result = divide(10, 0);
    echo "Результат: {$result}"; // Цей рядок НЕ виконається
} catch (InvalidArgumentException $e) {
    // Сюди PHP перейде при кидку InvalidArgumentException
    echo "Помилка: " . $e->getMessage();  // Помилка: Ділення на нуль неможливе!
    echo "Рядок: "   . $e->getLine();     // Рядок: 4
    echo "Файл: "    . $e->getFile();     // Файл: /var/www/...
}

echo "Програма продовжує роботу після catch."; // Виконається
```

### Блок `finally`: виконується завжди

```php
<?php
function processFile(string $path): string
{
    $handle = fopen($path, 'r');

    try {
        if (!$handle) {
            throw new RuntimeException("Файл '{$path}' не знайдено.");
        }
        return fread($handle, filesize($path));
    } catch (RuntimeException $e) {
        echo "Помилка читання: " . $e->getMessage();
        return '';
    } finally {
        // Виконається ЗАВЖДИ: і при успіху, і при помилці
        // Ідеально для звільнення ресурсів (закриття файлів, з'єднань)
        if ($handle) {
            fclose($handle);
        }
        echo "Файл закрито.";
    }
}
```

### Ієрархія винятків та кілька `catch`

```php
<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=nonexistent', 'root', '');
} catch (PDOException $e) {
    // Специфічний виняток PDO — ловимо першим
    echo "Помилка БД: " . $e->getMessage();
} catch (RuntimeException $e) {
    // RuntimeException — ширша категорія
    echo "Runtime помилка: " . $e->getMessage();
} catch (Exception $e) {
    // Exception — найширша категорія (зловить будь-який виняток)
    echo "Невідома помилка: " . $e->getMessage();
}
```

> Важливо: `catch`-блоки перевіряються **зверху вниз**. Специфічні типи (`PDOException`) завжди пишіть вище загальних (`Exception`).

### Власні класи винятків

Власні винятки дозволяють точно класифікувати помилки і реагувати на кожен тип по-різному:

```php
<?php
// Базовий виняток для всього домену "Менеджер завдань"
class TaskManagerException extends RuntimeException {}

// Завдання не знайдено
class TaskNotFoundException extends TaskManagerException
{
    public function __construct(int $taskId)
    {
        parent::__construct("Завдання #{$taskId} не існує.", 404);
    }
}

// Помилка валідації вхідних даних
class ValidationException extends TaskManagerException
{
    /** @var string[] */
    private array $errors;

    public function __construct(array $errors)
    {
        $this->errors = $errors;
        parent::__construct('Помилка валідації: ' . implode(', ', $errors), 422);
    }

    /** @return string[] */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
```

### Повний приклад: TaskRepository з винятками

```php
<?php
class TaskRepository implements TaskStorageInterface
{
    // ...

    public function findById(int $id): Task
    {
        $task = $this->search($id);
        if ($task === null) {
            throw new TaskNotFoundException($id); // Чітко сигналізуємо про проблему
        }
        return $task;
    }

    public function add(string $title, ?string $deadline = null): Task
    {
        $errors = [];

        $title = trim($title);
        if (strlen($title) < 3) {
            $errors[] = 'Назва завдання занадто коротка (мінімум 3 символи).';
        }
        if ($deadline !== null && !strtotime($deadline)) {
            $errors[] = 'Невірний формат дедлайну.';
        }

        if (!empty($errors)) {
            throw new ValidationException($errors); // Передаємо всі помилки одразу
        }

        // ... збереження
    }
}

// Використання в контролері
class TaskController
{
    public function store(): void
    {
        try {
            $task = $this->storage->add(
                $_POST['title']    ?? '',
                $_POST['deadline'] ?? null,
            );
            header('Location: /');
            exit;
        } catch (ValidationException $e) {
            // Показуємо форму з конкретними помилками
            $errors = $e->getErrors();
            $this->render('tasks/create', compact('errors'));
        } catch (TaskManagerException $e) {
            // Будь-яка інша помилка домену — загальна сторінка помилки
            $this->render('errors/500', ['message' => $e->getMessage()]);
        }
    }
}
```

---

## Висновки

1. **Наслідування** (`extends`) дозволяє класу-нащадку перейняти поведінку батька і розширити або перевизначити її. `parent::` дає доступ до методів батька без дублювання коду.
2. **Поліморфізм** — здатність різних класів відповідати на однаковий виклик методу по-різному — дозволяє писати узагальнений код, що не прив'язаний до конкретних реалізацій.
3. **Інтерфейси** (`interface`) описують контракт — набір методів, що клас зобов'язується реалізувати. Залежність від інтерфейсу замість конкретного класу робить код гнучким і тестованим.
4. **Абстрактні класи** дозволяють визначити загальну поведінку для групи класів, залишаючи частину методів для обов'язкової реалізації нащадками. Трейти (`trait`) вирішують задачу повторного використання коду між непов'язаними класами без наслідування.
5. **Статичні члени** (`static`) належать класу, а не екземпляру. Найпоширеніше застосування — фабричні методи (`fromArray()`, `create()`) та лічильники/реєстри.
6. **Механізм винятків** (`throw`/`try`/`catch`/`finally`) є сучасним і правильним способом сигналізувати про помилки. Власні класи винятків дозволяють класифікувати помилки і давати контролеру точну інформацію для відповіді на запит.

## Рекомендована література та джерела

- офіційна документація PHP: наслідування — https://www.php.net/manual/uk/language.oop5.inheritance.php;
- офіційна документація PHP: інтерфейси — https://www.php.net/manual/uk/language.oop5.interfaces.php;
- офіційна документація PHP: трейти — https://www.php.net/manual/uk/language.oop5.traits.php;
- офіційна документація PHP: винятки — https://www.php.net/manual/uk/language.exceptions.php;
- стаття «Exceptions best practices in PHP» — https://phptherightway.com/#exceptions.

## Запитання для самоперевірки

1. Поясніть різницю між `interface` та `abstract class`. В якій ситуації ви б обрали інтерфейс, а в якій — абстрактний клас? Чи може клас одночасно `extends` абстрактний клас і `implements` інтерфейс?
2. Навіщо у `TaskController` залежати від `TaskStorageInterface`, а не від конкретного `TaskRepository`? Наведіть конкретний сценарій, де ця гнучкість дає реальну перевагу (підказка: тестування або заміна сховища).
3. Що таке трейт і чим він відрізняється від наслідування? Чому `TimestampableTrait` зручніше реалізувати як трейт, а не як батьківський клас?
4. Розгляньте код: `Task::getCount()`. Як ця конструкція відрізняється від `$task->getCount()`? Чому статична властивість `$count` є спільною для всіх екземплярів класу `Task`?
5. Поясніть порядок виконання блоків `try`, `catch`, `finally` у ситуаціях: (а) виняток не кидається; (б) виняток кидається і `catch` спрацьовує; (в) виняток кидається, але жоден `catch`-блок не підходить. Що відбувається з `finally` у кожному з цих випадків?
