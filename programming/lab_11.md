# Лабораторна робота №11 (2 години)

**Тема:** Застосування інтерфейсів, трейтів та обробки винятків у PHP.  
Рефакторинг проєкту «Менеджер завдань»: виділення контракту сховища `TaskStorageInterface`, інтеграція трейта `TimestampableTrait` для аудиту часу створення та зміни завдань, розробка спеціалізованої ієрархії винятків (`TaskNotFoundException`, `ValidationException`) та організація стійкої обробки помилок за допомогою блоків `try...catch...finally`.

**Мета:** Закріпити поглиблені концепції об'єктно-орієнтованого програмування у PHP — проєктування інтерфейсів як абстрактних контрактів, горизонтальне перевикористання коду за допомогою трейтів, створення власних класів винятків та побудову надійної архітектури взаємодії шару представлення з бізнес-логікою без аварійного завершення скриптів.

**Технологічний стек:** PHP 8.1+, `interface`, `implements`, `trait`, `use`, спадкування класів (`extends`), винятки (`throw`, `try...catch...finally`, `Throwable`, `RuntimeException`).

## Завдання

Основні завдання лабораторної роботи:
- контракт сховища - спроєктувати інтерфейс `TaskStorageInterface` для абстрагування операцій отримання, пошуку, додавання, зміни статусу та видалення завдань;
- аудит дат через трейт - створити трейт `TimestampableTrait` із полями дати створення та останнього оновлення об'єкта, інтегрувати його в клас `Task` та оновити логіку серіалізації в JSON;
- доменні винятки - реалізувати базовий клас помилок `TaskManagerException`, виняток валідації `ValidationException` (з підтримкою списку помилок) та виняток відсутності сутності `TaskNotFoundException`;
- надійний репозиторій - адаптувати клас `TaskRepository` під реалізацію `TaskStorageInterface` та замінити повернення статусних прапорців на генерацію доменних винятків при виявленні некоректних даних або неіснуючих ідентифікаторів;
- захищена обробка запитів - переписати блок диспетчеризації дій у `index.php` із застосуванням багаторівневого перехоплення `try...catch...finally`, забезпечивши наочне виведення помилок валідації користувачу.

## Хід виконання роботи

> Базою для виконання цієї лабораторної роботи є код, отриманий у результаті виконання лабораторної роботи №10. Якщо ви починаєте з чистого аркуша або бажаєте використати перевірену заготовку, візьміть вихідні файли з каталогу `lab_10/`.

---

### Крок 1. Проєктування інтерфейсу `TaskStorageInterface`

У реальних комерційних додатках шар представлення (контролер чи головний скрипт) не повинен жорстко залежати від конкретного способу збереження інформації (JSON-файл, сесія, реляційна база даних MySQL або NoSQL-сховище). Для цього створюється інтерфейс-контракт.

Створіть у корені вашого проєкту файл `TaskStorageInterface.php`:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';

interface TaskStorageInterface
{
    /**
     * Повертає список усіх наявних завдань.
     *
     * @return Task[]
     */
    public function findAll(): array;

    /**
     * Знаходить завдання за його ідентифікатором.
     */
    public function findById(int $id): ?Task;

    /**
     * Додає нове завдання до сховища.
     *
     * @throws ValidationException якщо назва або дедлайн не проходять валідацію
     */
    public function add(string $title, ?string $deadline = null): Task;

    /**
     * Позначає завдання як виконане.
     *
     * @throws TaskNotFoundException якщо завдання з таким id не існує
     */
    public function complete(int $id): bool;

    /**
     * Видаляє завдання зі сховища.
     *
     * @throws TaskNotFoundException якщо завдання з таким id не існує
     */
    public function delete(int $id): bool;

    /**
     * Повертає кількість виконаних завдань.
     */
    public function countCompleted(): int;

    /**
     * Повертає кількість прострочених завдань.
     */
    public function countOverdue(): int;
}
```

Вимоги до проєктування контракту:
- сувора типізація - обов'язкове зазначення типів параметрів та типів повернення для всіх методів;
- документування можливих винятків - коментування сигнатур методів за допомогою тегу `@throws` для інформування розробника про потенційні помилкові ситуації;
- незалежність від носія даних - відсутність у сигнатурах методів будь-яких деталей збереження (шляхів до файлів, SQL-запитів тощо).

---

### Крок 2. Реалізація трейта `TimestampableTrait`

Для відстеження життєвого циклу сутностей часто потрібно знати, коли саме об'єкт був створений і коли востаннє редагувався. Оскільки PHP не підтримує множинне наслідування класів, спільну поведінку аудиту часу доцільно винести в горизонтальний компонент — трейт.

Створіть файл `TimestampableTrait.php`:

```php
<?php
declare(strict_types=1);

trait TimestampableTrait
{
    private string $createdAt;
    private ?string $updatedAt = null;

    /**
     * Ініціалізує початкові значення дат створення та оновлення.
     */
    public function initTimestamps(?string $createdAt = null, ?string $updatedAt = null): void
    {
        $this->createdAt = $createdAt ?? date('Y-m-d H:i:s');
        $this->updatedAt = $updatedAt;
    }

    /**
     * Оновлює мітку часу останньої модифікації на поточний момент.
     */
    public function touch(): void
    {
        $this->updatedAt = date('Y-m-d H:i:s');
    }

    public function getCreatedAt(): string
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?string
    {
        return $this->updatedAt;
    }
}
```

---

### Крок 3. Підключення трейта до класу `Task`

Відкрийте файл `Task.php`. Підключіть створений трейт ключовим словом `use TimestampableTrait;` всередині класу та оновіть конструктор і методи серіалізації:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/TimestampableTrait.php';

class Task
{
    use TimestampableTrait;

    public function __construct(
        public readonly int $id,
        private string $title,
        private bool $isCompleted = false,
        private ?string $deadline = null,
        ?string $createdAt = null,
        ?string $updatedAt = null,
    ) {
        $this->initTimestamps($createdAt, $updatedAt);
    }

    // --- Геттери ---

    public function getId(): int
    {
        return $this->id;
    }

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

    public function isOverdue(): bool
    {
        if ($this->isCompleted || $this->deadline === null) {
            return false;
        }
        return strtotime($this->deadline) < time();
    }

    public function complete(): void
    {
        $this->isCompleted = true;
        $this->touch(); // Оновлюємо мітку часу модифікації
    }

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

    // --- Серіалізація / Десеріалізація ---

    public function toArray(): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'isCompleted' => $this->isCompleted,
            'deadline'    => $this->deadline,
            'createdAt'   => $this->getCreatedAt(),
            'updatedAt'   => $this->getUpdatedAt(),
        ];
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id:          (int) $data['id'],
            title:       (string) $data['title'],
            isCompleted: (bool) ($data['isCompleted'] ?? false),
            deadline:    $data['deadline'] ?? null,
            createdAt:   $data['createdAt'] ?? null,
            updatedAt:   $data['updatedAt'] ?? null,
        );
    }
}
```

---

### Крок 4. Створення ієрархії користувацьких винятків

Замість повернення неконкретних булевих значень `false` чи `null` сучасний PHP-код сигналізує про проблеми за допомогою типізованих об'єктів винятків.

Створіть файл `Exceptions.php`:

```php
<?php
declare(strict_types=1);

/**
 * Базовий клас для всіх доменних помилок у системі управління завданнями.
 */
class TaskManagerException extends RuntimeException {}

/**
 * Виняток, що виникає при зверненні до завдання за неіснуючим ID.
 */
class TaskNotFoundException extends TaskManagerException
{
    public function __construct(int $taskId)
    {
        parent::__construct("Завдання з ідентифікатором #{$taskId} не знайдено.", 404);
    }
}

/**
 * Виняток валідації вхідних даних (може містити перелік із кількох помилок).
 */
class ValidationException extends TaskManagerException
{
    /** @var string[] */
    private array $errors;

    public function __construct(array $errors)
    {
        $this->errors = $errors;
        parent::__construct('Помилка валідації даних форми: ' . implode(', ', $errors), 422);
    }

    /**
     * Повертає масив текстових повідомлень про помилки.
     *
     * @return string[]
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
```

Особливості побудови ієрархії:
- спадкування від `RuntimeException` - дозволяє відрізнити помилки часу виконання від системних збоїв компіляції чи фатальних помилок ядра;
- інкапсуляція списку помилок - клас `ValidationException` містить у собі масив рядків, що дозволяє передавати користувачу всі зауваження до заповнення форми одночасно;
- HTTP-коди статусу - передача кодів 404 та 422 у конструктор батьківського класу спрощує подальшу інтеграцію із REST API або HTTP-відповідями.

---

### Крок 5. Рефакторинг класу `TaskRepository`

Відкрийте файл `TaskRepository.php`. Додайте імплементацію інтерфейсу `implements TaskStorageInterface` та налаштуйте генерацію винятків:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskStorageInterface.php';
require_once __DIR__ . '/Exceptions.php';

class TaskRepository implements TaskStorageInterface
{
    /** @var Task[] */
    private array $tasks = [];

    public function __construct(private string $storageFile)
    {
        $this->load();
    }

    public function findAll(): array
    {
        return $this->tasks;
    }

    public function findById(int $id): ?Task
    {
        foreach ($this->tasks as $task) {
            if ($task->getId() === $id) {
                return $task;
            }
        }
        return null;
    }

    public function add(string $title, ?string $deadline = null): Task
    {
        $errors = [];
        $cleanTitle = trim($title);

        if ($cleanTitle === '') {
            $errors[] = 'Назва завдання є обов\'язковою для заповнення.';
        } elseif (mb_strlen($cleanTitle) < 3) {
            $errors[] = 'Назва завдання повинна містити щонайменше 3 символи.';
        }

        if ($deadline !== null && $deadline !== '') {
            $timestamp = strtotime($deadline);
            if ($timestamp === false) {
                $errors[] = 'Вказано некоректну дату дедлайну.';
            }
        } else {
            $deadline = null;
        }

        if (!empty($errors)) {
            throw new ValidationException($errors);
        }

        $task = new Task(
            id:          $this->generateNextId(),
            title:       $cleanTitle,
            isCompleted: false,
            deadline:    $deadline,
        );

        $this->tasks[] = $task;
        $this->save();

        return $task;
    }

    public function complete(int $id): bool
    {
        $task = $this->findById($id);
        if ($task === null) {
            throw new TaskNotFoundException($id);
        }

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

        throw new TaskNotFoundException($id);
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
        if (empty($this->tasks)) {
            return 1;
        }
        return max(array_map(fn(Task $t) => $t->getId(), $this->tasks)) + 1;
    }

    private function load(): void
    {
        if (!file_exists($this->storageFile)) {
            $this->tasks = [];
            return;
        }

        $json = file_get_contents($this->storageFile);
        $data = json_decode($json, true) ?? [];
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

---

### Крок 6. Оновлення контролера та інтерфейсу в `index.php`

Тепер необхідно налаштувати перехоплення можливих винятків у точці входу додатка. Якщо користувач передасть невалідні дані або надішле запит із підробленим ідентифікатором завдання, програма повинна перехопити виняток і вивести зрозуміле повідомлення без збою виконання.

Оновіть файл `index.php`:

```php
<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskStorageInterface.php';
require_once __DIR__ . '/TaskRepository.php';
require_once __DIR__ . '/Exceptions.php';

// Перевірка авторизації
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

// Залежність оголошена через інтерфейс
$repo = new TaskRepository(__DIR__ . '/tasks.json');

$formErrors = [];
$feedbackMessage = $_SESSION['feedback'] ?? null;
unset($_SESSION['feedback']);

// Обробка дій користувача
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add') {
            $title    = $_POST['title'] ?? '';
            $deadline = trim($_POST['deadline'] ?? '') ?: null;

            $repo->add($title, $deadline);
            $_SESSION['feedback'] = 'Завдання успішно додано!';
            header('Location: index.php');
            exit;
        }

        if ($action === 'complete') {
            $id = (int) ($_POST['id'] ?? 0);
            $repo->complete($id);
            $_SESSION['feedback'] = 'Статус завдання оновлено!';
            header('Location: index.php');
            exit;
        }

        if ($action === 'delete') {
            $id = (int) ($_POST['id'] ?? 0);
            $repo->delete($id);
            $_SESSION['feedback'] = 'Завдання видалено!';
            header('Location: index.php');
            exit;
        }
    } catch (ValidationException $e) {
        // Перехоплюємо помилки валідації форми
        $formErrors = $e->getErrors();
    } catch (TaskNotFoundException $e) {
        // Перехоплюємо спробу маніпуляції неіснуючим завданням
        $formErrors = [$e->getMessage()];
    } catch (TaskManagerException $e) {
        // Загальний доменний виняток
        $formErrors = ['Помилка програми: ' . $e->getMessage()];
    } catch (Throwable $e) {
        // Непередбачена системна помилка
        $formErrors = ['Критичний збій обробки запиту. Зверніться до техпідтримки.'];
    } finally {
        // Код у finally виконується незалежно від наявності чи відсутності винятку
        // Наприклад, запис системного аудиту або закриття додаткових ресурсів
    }
}

$tasks = $repo->findAll();
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Менеджер завдань (ООП: Інтерфейси та Винятки)</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #222; }
        .stats { margin-bottom: 20px; padding: 12px; background: #f1f3f5; border-radius: 6px; font-weight: 500; }
        .alert-error { background: #ffe3e3; border: 1px solid #ffa8a8; color: #c92a2a; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
        .alert-error ul { margin: 6px 0 0 20px; padding: 0; }
        .alert-success { background: #d3f9d8; border: 1px solid #8ce99a; color: #2b8a3e; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
        .task { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
        .task-meta { font-size: 0.85em; color: #868e96; margin-top: 4px; }
        .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.8em; color: #fff; font-weight: bold; }
        .badge-success { background: #40c057; }
        .badge-danger  { background: #fa5252; }
        .badge-primary { background: #228be6; }
        .form-add { display: flex; gap: 8px; margin-bottom: 25px; }
        .form-add input[type="text"] { flex-grow: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; }
        .form-add input[type="date"] { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .form-add button { padding: 8px 16px; background: #228be6; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        .actions button { padding: 4px 8px; margin-left: 4px; cursor: pointer; border-radius: 4px; border: 1px solid #ced4da; }
    </style>
</head>
<body>

<h1>Менеджер завдань</h1>
<p>Користувач: <strong><?= htmlspecialchars($_SESSION['user_name'] ?? 'Адміністратор') ?></strong> | <a href="login.php">Вийти</a></p>

<?php if ($feedbackMessage): ?>
    <div class="alert-success"><?= htmlspecialchars($feedbackMessage) ?></div>
<?php endif; ?>

<?php if (!empty($formErrors)): ?>
    <div class="alert-error">
        <strong>Увага! Виявлено помилки під час виконання операції:</strong>
        <ul>
            <?php foreach ($formErrors as $error): ?>
                <li><?= htmlspecialchars($error) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<form method="POST" action="index.php" class="form-add">
    <input type="hidden" name="action" value="add">
    <input type="text" name="title" placeholder="Що потрібно зробити (мінімум 3 символи)?" value="<?= htmlspecialchars($_POST['title'] ?? '') ?>">
    <input type="date" name="deadline" value="<?= htmlspecialchars($_POST['deadline'] ?? '') ?>">
    <button type="submit">Додати</button>
</form>

<div class="stats">
    Всього завдань: <?= count($tasks) ?> |
    Виконано: <?= $repo->countCompleted() ?> |
    Прострочено: <?= $repo->countOverdue() ?>
</div>

<div class="tasks-list">
    <?php if (empty($tasks)): ?>
        <p>Список завдань порожній.</p>
    <?php else: ?>
        <?php foreach ($tasks as $task): ?>
            <div class="task">
                <div>
                    <div>
                        <strong><?= htmlspecialchars($task->getTitle()) ?></strong>
                        <?php if ($task->getDeadline()): ?>
                            <small>(Дедлайн: <?= htmlspecialchars($task->getDeadline()) ?>)</small>
                        <?php endif; ?>
                    </div>
                    <div class="task-meta">
                        Створено: <?= htmlspecialchars($task->getCreatedAt()) ?>
                        <?php if ($task->getUpdatedAt()): ?>
                            | Оновлено: <?= htmlspecialchars($task->getUpdatedAt()) ?>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="actions">
                    <?php
                    $badgeClass = match ($task->getStatusLabel()) {
                        'Виконано'   => 'badge-success',
                        'Прострочено' => 'badge-danger',
                        default       => 'badge-primary',
                    };
                    ?>
                    <span class="badge <?= $badgeClass ?>"><?= $task->getStatusLabel() ?></span>

                    <?php if (!$task->isCompleted()): ?>
                        <form method="POST" action="index.php" style="display:inline;">
                            <input type="hidden" name="action" value="complete">
                            <input type="hidden" name="id" value="<?= $task->getId() ?>">
                            <button type="submit" title="Позначити виконаним">✓</button>
                        </form>
                    <?php endif; ?>

                    <form method="POST" action="index.php" style="display:inline;">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $task->getId() ?>">
                        <button type="submit" title="Видалити">✕</button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

</body>
</html>
```

---

### Крок 7. Практична перевірка роботи застосунку

Для перевірки коректності реалізованих механізмів виконайте такі дії:
- перевірка валідації порожнього поля - спробуйте надіслати порожню форму додавання завдання. Переконайтеся, що виник виняток `ValidationException`, сторінка не впала з Fatal Error, а вгорі з'явилося червоне повідомлення про обов'язковість заповнення;
- перевірка мінімальної довжини - введіть назву із 1 або 2 символів. Переконайтеся, що спрацювало правило мінімальної довжини (3 символи);
- перевірка аудиту дат - створіть валідне завдання. Перевірте, що у картці з'явився рядок `Створено: РРРР-ММ-ДД ГГ:ХХ:СС`;
- перевірка оновлення часу через `touch()` - позначте завдання як виконане. Переконайтеся, що до мітки створення додалася мітка `Оновлено: РРРР-ММ-ДД ГГ:ХХ:СС`;
- перевірка персистентності у `tasks.json` - відкрийте файл `tasks.json` та впевніться, що об'єкти містять нові ключі `createdAt` та `updatedAt`.

---

## Контрольні запитання

Контрольні запитання для самоперевірки та захисту роботи:
- різниця між інтерфейсом та абстрактним класом - у чому полягає відмінність між `interface` та `abstract class`, і чому для сховища `TaskStorageInterface` обрано саме інтерфейс;
- переваги слабого зв'язку (Loose Coupling) - як саме підключення репозиторію через контракт `TaskStorageInterface` полегшить майбутній перехід від JSON-файлів до бази даних MySQL за допомогою PDO;
- горизонтальне перевикористання через трейти - яку проблему розв'язує `TimestampableTrait` в умовах відсутності множинного наслідування класів у PHP;
- черговість перехоплення у блоках `catch` - чому блок `catch (ValidationException $e)` обов'язково повинен розміщуватися перед `catch (TaskManagerException $e)` та `catch (Throwable $e)`;
- призначення секції `finally` - за яких обставин виконується код всередині блоку `finally`, і які завдання з вивільнення системних ресурсів доцільно в ньому розташовувати.

## Вимоги до звіту

Вимоги до оформлення звіту:
- кодова база - навести у звіті тексти створених файлів `TaskStorageInterface.php`, `TimestampableTrait.php`, `Exceptions.php`, а також оновлені фрагменти `Task.php`, `TaskRepository.php` та `index.php`;
- графічне підтвердження результатів - додати скриншоти роботи вебдодатка: відображення повідомлень про помилки валідації при спробі відправлення некоректних даних, успішне створення завдання з міткою часу створення, а також оновлення мітки часу після натискання кнопки виконання;
- аналіз сховища даних - навести фрагмент файлу `tasks.json` із серіалізованими полями `createdAt` та `updatedAt`;
- система контролю версій - зафіксувати стан коду окремим комітом у Git-репозиторії та надати пряме посилання на коміт;
- письмові відповіді - надати повні обґрунтовані відповіді на кожне з контрольних запитань.
