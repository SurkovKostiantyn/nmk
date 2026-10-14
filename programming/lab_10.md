# Лабораторна робота №10 (2 години)

**Тема:** Вступ до ООП у PHP.
Рефакторинг проєкту «Менеджер завдань»: перетворення асоціативних масивів на клас `Task` та впровадження класу `TaskRepository` для керування колекцією завдань.

**Мета:** Освоїти базові концепції об'єктно-орієнтованого програмування у PHP — класи, об'єкти, властивості, методи, модифікатори доступу та конструктор. Навчитися переписувати процедурний код у об'єктно-орієнтованому стилі без зміни зовнішньої поведінки програми.

**Технологічний стек:** PHP 8.1+, ООП (класи, `private`, `readonly`, Constructor Promotion), JSON-файл як сховище даних.

## Завдання

1. Створити клас `Task` з властивостями та бізнес-методами.
2. Реалізувати серіалізацію/десеріалізацію через `toArray()` / `fromArray()`.
3. Створити клас `TaskRepository`, що читає та зберігає колекцію об'єктів `Task` у JSON-файлі.
4. Оновити `index.php`: прибрати роботу із масивами, підключити новий репозиторій.

## Хід виконання роботи

> Еталонний варіант кінцевого результату знаходиться у папці `lab_10/` у репозиторії курсу.
> Якщо ви не виконали лабораторну №9, візьміть файли з папки `lab_10/` як стартову точку.

---

### Крок 1. Створення класу `Task`

Поряд з вашим `index.php` створіть новий файл `Task.php`. У ньому опишіть клас `Task` з такими вимогами:

- властивості: `$id` (int, readonly), `$title` (string, private), `$isCompleted` (bool, private), `$deadline` (?string, private);
- конструктор приймає всі ці значення та перевіряє, що `$title` не порожній;
- геттери: `getId()`, `getTitle()`, `isCompleted()`, `getDeadline()`;
- бізнес-методи: `isOverdue()` (перевіряє, чи минув дедлайн і завдання не виконане), `complete()` (встановлює `$isCompleted = true`), `getStatusLabel()` (повертає рядок `'Виконано'`, `'Прострочено'` або `'В процесі'`).

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
        if (empty(trim($title))) {
            throw new InvalidArgumentException('Назва завдання не може бути порожньою.');
        }
    }

    public function getTitle(): string { return $this->title; }
    public function isCompleted(): bool { return $this->isCompleted; }
    public function getDeadline(): ?string { return $this->deadline; }

    public function isOverdue(): bool
    {
        if ($this->isCompleted || $this->deadline === null) {
            return false;
        }
        return strtotime($this->deadline) < time();
    }

    public function complete(): void { $this->isCompleted = true; }

    public function getStatusLabel(): string
    {
        if ($this->isCompleted) return 'Виконано';
        if ($this->isOverdue())  return 'Прострочено';
        return 'В процесі';
    }
}
```

### Крок 2. Серіалізація: `toArray()` та `fromArray()`

Оскільки PHP-об'єкти не зберігаються у файлі «самі по собі», нам потрібні два конвертаційні методи.

Додайте в клас `Task`:

```php
// Перетворює об'єкт на звичайний масив для JSON-кодування
public function toArray(): array
{
    return [
        'id'          => $this->id,
        'title'       => $this->title,
        'isCompleted' => $this->isCompleted,
        'deadline'    => $this->deadline,
    ];
}

// Статичний метод: з масиву (прочитаного з JSON) створює об'єкт Task
public static function fromArray(array $data): self
{
    return new self(
        id:          $data['id'],
        title:       $data['title'],
        isCompleted: $data['isCompleted'] ?? false,
        deadline:    $data['deadline']    ?? null,
    );
}
```

> Зверніть увагу: `fromArray` є `static`-методом — він не потребує існуючого об'єкта і викликається як `Task::fromArray($data)`.

### Крок 3. Створення класу `TaskRepository`

Створіть файл `TaskRepository.php`. Цей клас відповідатиме за всю роботу з колекцією завдань та їх збереженням у JSON-файлі.

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';

class TaskRepository
{
    /** @var Task[] */
    private array $tasks = [];

    public function __construct(private string $storageFile)
    {
        $this->load();
    }

    public function findAll(): array  { return $this->tasks; }

    public function findById(int $id): ?Task
    {
        foreach ($this->tasks as $task) {
            if ($task->getId() === $id) return $task;
        }
        return null;
    }

    public function add(string $title, ?string $deadline = null): Task
    {
        $task = new Task($this->generateNextId(), $title, false, $deadline);
        $this->tasks[] = $task;
        $this->save();
        return $task;
    }

    public function complete(int $id): bool
    {
        $task = $this->findById($id);
        if (!$task) return false;
        $task->complete();
        $this->save();
        return true;
    }

    public function delete(int $id): bool
    {
        foreach ($this->tasks as $key => $task) {
            if ($task->getId() === $id) {
                unset($this->tasks[$key]);
                $this->tasks = array_values($this->tasks);
                $this->save();
                return true;
            }
        }
        return false;
    }

    public function countCompleted(): int
    {
        return count(array_filter($this->tasks, fn(Task $t) => $t->isCompleted()));
    }

    public function countOverdue(): int
    {
        return count(array_filter($this->tasks, fn(Task $t) => $t->isOverdue()));
    }

    private function generateNextId(): int
    {
        if (empty($this->tasks)) return 1;
        return max(array_map(fn(Task $t) => $t->getId(), $this->tasks)) + 1;
    }

    private function load(): void
    {
        if (!file_exists($this->storageFile)) { $this->tasks = []; return; }
        $data = json_decode(file_get_contents($this->storageFile), true) ?? [];
        $this->tasks = array_map(fn(array $item) => Task::fromArray($item), $data);
    }

    private function save(): void
    {
        $data = array_map(fn(Task $t) => $t->toArray(), $this->tasks);
        file_put_contents(
            $this->storageFile,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }
}
```

### Крок 4. Оновлення `index.php`

Тепер перепишіть `index.php`, замінивши всю роботу з масивами (`$_SESSION['tasks']`, `array_push` тощо) на виклики `TaskRepository`.

У верхній частині файлу підключіть репозиторій і зробіть його єдиним місцем для роботи з даними:

```php
<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskRepository.php';

if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

$repo = new TaskRepository(__DIR__ . '/tasks.json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $title    = trim($_POST['title'] ?? '');
        $deadline = trim($_POST['deadline'] ?? '') ?: null;
        if (!empty($title)) {
            $repo->add($title, $deadline);
        }
    }

    if ($action === 'complete') {
        $repo->complete((int) ($_POST['id'] ?? 0));
    }

    if ($action === 'delete') {
        $repo->delete((int) ($_POST['id'] ?? 0));
    }

    header('Location: index.php');
    exit;
}

$tasks = $repo->findAll();
```

Зверніть увагу: після рефакторингу файл `tasks.json` замінює масив у `$_SESSION`. Перший запуск створить файл автоматично, якщо він ще не існує.

### Крок 5. Оновлення HTML-шаблону в `index.php`

Замініть звернення до масиву на виклики методів об'єкта `$task`:

```php
// Було (процедурний підхід):
foreach ($tasks as $task) {
    echo $task['title'];
}

// Стало (ООП):
foreach ($tasks as $task) {
    echo htmlspecialchars($task->getTitle());
    echo $task->getStatusLabel();
}
```

Додайте блок статистики над списком завдань:

```php
<div class="stats">
    Всього: <?= count($tasks) ?> |
    Виконано: <?= $repo->countCompleted() ?> |
    Прострочено: <?= $repo->countOverdue() ?>
</div>
```

### Крок 6. Перевірка роботи

1. Відкрийте проєкт у браузері. Переконайтеся, що вхід (`login.php`) і перенаправлення на головну сторінку (`index.php`) працюють коректно.
2. Додайте кілька нових завдань (з різними датами дедлайну — деякі з минулою датою).
3. Виконайте одне завдання кнопкою ✓, видаліть інше кнопкою ✕.
4. Відкрийте файл `tasks.json` у текстовому редакторі та переконайтеся, що всі зміни збереглись у правильному форматі.
5. Перезавантажте сторінку — переконайтеся, що дані не зникли після перезавантаження.

## Контрольні запитання

1. Що таке клас і чим він відрізняється від звичайного масиву у PHP? Чому завдання зручніше представити об'єктом класу `Task`, ніж масивом `['id' => 1, 'title' => '...']`?
2. Що таке `private`-властивість і навіщо `$title` у класі `Task` зроблено `private`? Як зовнішній код може прочитати її значення?
3. Поясніть, що відбувається у рядку `public readonly int $id` у конструкторі. Чому `$id` є `readonly`, а `$isCompleted` — ні?
4. Що робить статичний метод `Task::fromArray($data)`? Для чого він оголошений як `static`, а не як звичайний метод?
5. Опишіть «ланцюжок» збереження даних: що відбувається під капотом від моменту виклику `$repo->add('Нове завдання')` до появи нового рядка у файлі `tasks.json`?

## Вимоги до звіту

1. У файлі `lab10.md` навести повний код класів `Task` та `TaskRepository` з поясненням кожного методу (1–2 речення на метод).
2. Додати скриншоти:
   - вміст файлу `tasks.json` у редакторі після додавання принаймні трьох завдань;
   - сторінка `index.php` у браузері зі статусами «Виконано», «Прострочено» та «В процесі» (з різними датами).
3. Зафіксувати код на GitHub і додати посилання на коміт у файлі `lab10.md`.
4. У файлі `lab10.md` відповісти на контрольні запитання.
