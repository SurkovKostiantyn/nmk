# Лабораторна робота №13 (2 години)

**Тема:** Реалізація класу TaskRepository та повного циклу CRUD.  
Переведення проєкту «Менеджер завдань» із файлового JSON-сховища на реляційну базу даних MySQL за допомогою PHP Data Objects (PDO), реалізація архітектурного патерну Repository, параметризованих підготовлених виразів та пагінації завдань.

**Мета:** Опанувати практичні навички взаємодії PHP із реляційною СУБД MySQL через об'єктно-орієнтований інтерфейс PDO. Навчитися реалізовувати повний цикл CRUD-операцій у рамках патерну Repository, використовувати підготовлені вирази (Prepared Statements) для надійного захисту від SQL-ін'єкцій, зв'язувати завдання з авторизованим користувачем (`user_id`) та створювати ефективну пагінацію результатів вибірки (`LIMIT` / `OFFSET`).

**Технологічний стек:** PHP 8.1+, MySQL/MariaDB, PDO (PHP Data Objects), Prepared Statements (`prepare`, `execute`, `bindValue`, `fetch`, `fetchAll`), SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `LIMIT`, `OFFSET`), патерн Repository.

## Завдання

Основні завдання лабораторної роботи:
- конфігурація з'єднання з базою даних — створити клас-фабрику `Database` для ініціалізації екземпляра `PDO` з безпечними атрибутами обробки помилок та відключеною емуляцією підготовлених виразів;
- адаптація доменної сутності — оновити клас `Task`, додавши прив'язку до автора завдання (`userId`) та узгодивши методи мапінгу з реляційною структурою таблиці `tasks`;
- розширення інтерфейсу сховища — оновити контракт `TaskStorageInterface`, додавши фільтрацію завдань за користувачем і параметри пагінації;
- реалізація `TaskRepository` на базі PDO — створити повноцінний репозиторій, що виконує операції вибірки, створення з отриманням `lastInsertId()`, перемикання статусу та видалення;
- захист від вразливостей SQLi — реалізувати виконання кожного SQL-запиту виключно через підготовлені вирази з прив'язкою параметрів;
- постранична навігація (пагінація) — реалізувати підрахунок загальної кількості записів через `COUNT(*)` та вибірку потрібної порції рядків через `LIMIT` і `OFFSET`;
- оновлення точки входу `index.php` — замінити файлове сховище на PDO-репозиторій, налаштувати вивід списку завдань поточного користувача та навігацію між сторінками.

## Хід виконання роботи

> Базою для виконання цієї лабораторної роботи є структура класів із лабораторної роботи №11 (`Task`, `TimestampableTrait`, `TaskStorageInterface`, класи винятків) та база даних `task_manager`, створена в лабораторній роботі №12.

---

### Крок 1. Перевірка таблиці `tasks` та створення класу `Database`

Переконайтеся, що у вашій СУБД MySQL існує база даних `task_manager`, а в ній — таблиця `tasks`.

Структура таблиці `tasks` має містити такі поля:
- `id` — INT, AUTO_INCREMENT, PRIMARY KEY;
- `user_id` — INT, зовнішній ключ на користувача;
- `title` — VARCHAR(255), назва завдання;
- `is_completed` — TINYINT(1), значення 0 або 1 (за замовчуванням 0);
- `deadline` — DATETIME або DATE, nullable;
- `created_at` — DATETIME, дата створення;
- `updated_at` — DATETIME, nullable, дата модифікації.

Якщо таблиці ще немає або її потрібно оновити, виконайте SQL-запит у phpMyAdmin:

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    deadline DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tasks_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Створіть файл `Database.php`, який централізовано створює та налаштовує з'єднання через PDO:

```php
<?php
declare(strict_types=1);

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host = '127.0.0.1';
            $db   = 'task_manager';
            $user = 'root';
            $pass = '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Вимикаємо клієнтську емуляцію для максимальної безпеки
            ];

            try {
                self::$connection = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // У навчальних цілях перериваємо виконання, не розкриваючи пароль у стек-трейсі
                throw new RuntimeException('Помилка підключення до бази даних: ' . $e->getMessage());
            }
        }

        return self::$connection;
    }
}
```

---

### Крок 2. Оновлення моделі `Task`

Оскільки завдання тепер належать конкретним користувачам і зберігаються в реляційній базі, оновіть файл `Task.php`:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/TimestampableTrait.php';

class Task
{
    use TimestampableTrait;

    public function __construct(
        public readonly int    $id,
        public readonly int    $userId,
        private string         $title,
        private bool           $isCompleted = false,
        private ?string        $deadline    = null,
    ) {
        if (empty(trim($title))) {
            throw new InvalidArgumentException('Назва завдання не може бути порожньою.');
        }
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
        $this->touch();
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

    public static function fromArray(array $data): self
    {
        $task = new self(
            id:          (int) $data['id'],
            userId:      (int) $data['user_id'],
            title:       $data['title'],
            isCompleted: (bool) $data['is_completed'],
            deadline:    $data['deadline'] ?? null,
        );

        $task->initTimestamps(
            createdAt: $data['created_at'] ?? null,
            updatedAt: $data['updated_at'] ?? null,
        );

        return $task;
    }

    public function toArray(): array
    {
        return [
            'id'           => $this->id,
            'user_id'      => $this->userId,
            'title'        => $this->title,
            'is_completed' => $this->isCompleted,
            'deadline'     => $this->deadline,
            'created_at'   => $this->getCreatedAt(),
            'updated_at'   => $this->getUpdatedAt(),
        ];
    }
}
```

---

### Крок 3. Оновлення контракту `TaskStorageInterface`

Відкрийте файл `TaskStorageInterface.php` та розширте його новими сигнатурами для фільтрації завдань за `userId` та підтримки пагінації:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';

interface TaskStorageInterface
{
    /**
     * Повертає список завдань конкретного користувача з урахуванням пагінації.
     *
     * @return Task[]
     */
    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array;

    /**
     * Повертає загальну кількість завдань користувача.
     */
    public function countByUser(int $userId): int;

    /**
     * Повертає кількість виконаних завдань користувача.
     */
    public function countCompletedByUser(int $userId): int;

    /**
     * Повертає кількість прострочених завдань користувача.
     */
    public function countOverdueByUser(int $userId): int;

    /**
     * Знаходить конкретне завдання за id та перевіряє право власності користувача.
     */
    public function findByIdAndUser(int $id, int $userId): ?Task;

    /**
     * Додає нове завдання до бази даних.
     *
     * @throws ValidationException
     */
    public function add(int $userId, string $title, ?string $deadline = null): Task;

    /**
     * Позначає завдання як виконане.
     *
     * @throws TaskNotFoundException
     */
    public function complete(int $id, int $userId): bool;

    /**
     * Видаляє завдання користувача з бази даних.
     *
     * @throws TaskNotFoundException
     */
    public function delete(int $id, int $userId): bool;
}
```

---

### Крок 4. Реалізація `TaskRepository` на базі PDO

Створіть файл `TaskRepository.php`. Клас отримує об'єкт `PDO` через конструктор і повністю імплементує інтерфейс `TaskStorageInterface` за допомогою підготовлених виразів:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskStorageInterface.php';
require_once __DIR__ . '/Exceptions.php';

class TaskRepository implements TaskStorageInterface
{
    public function __construct(private PDO $pdo) {}

    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array
    {
        $offset = ($page - 1) * $perPage;

        $sql = '
            SELECT id, user_id, title, is_completed, deadline, created_at, updated_at
            FROM tasks
            WHERE user_id = :user_id
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset
        ';

        $stmt = $this->pdo->prepare($sql);

        // При вимкненій емуляції параметри LIMIT та OFFSET мають бути строго цілими числами
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit',   $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);

        $stmt->execute();

        $rows = $stmt->fetchAll();
        return array_map(fn(array $row) => Task::fromArray($row), $rows);
    }

    public function countByUser(int $userId): int
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM tasks WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function countCompletedByUser(int $userId): int
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM tasks WHERE user_id = :user_id AND is_completed = 1');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function countOverdueByUser(int $userId): int
    {
        $sql = '
            SELECT COUNT(*) 
            FROM tasks 
            WHERE user_id = :user_id 
              AND is_completed = 0 
              AND deadline IS NOT NULL 
              AND deadline < NOW()
        ';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function findByIdAndUser(int $id, int $userId): ?Task
    {
        $stmt = $this->pdo->prepare('SELECT * FROM tasks WHERE id = :id AND user_id = :user_id LIMIT 1');
        $stmt->execute([
            ':id'      => $id,
            ':user_id' => $userId,
        ]);

        $row = $stmt->fetch();
        return $row ? Task::fromArray($row) : null;
    }

    public function add(int $userId, string $title, ?string $deadline = null): Task
    {
        $errors = [];
        $trimmedTitle = trim($title);

        if (empty($trimmedTitle)) {
            $errors['title'] = 'Назва завдання є обов\'язковою для заповнення.';
        } elseif (mb_strlen($trimmedTitle) < 3) {
            $errors['title'] = 'Назва завдання має містити щонайменше 3 символи.';
        }

        if (!empty($deadline) && strtotime($deadline) === false) {
            $errors['deadline'] = 'Вказано некоректний формат дати дедлайну.';
        }

        if (!empty($errors)) {
            throw new ValidationException($errors);
        }

        $sql = '
            INSERT INTO tasks (user_id, title, is_completed, deadline, created_at)
            VALUES (:user_id, :title, 0, :deadline, NOW())
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id'  => $userId,
            ':title'    => $trimmedTitle,
            ':deadline' => !empty($deadline) ? $deadline : null,
        ]);

        $newId = (int) $this->pdo->lastInsertId();

        $createdTask = $this->findByIdAndUser($newId, $userId);
        if ($createdTask === null) {
            throw new RuntimeException('Не вдалося отримати створене завдання з бази даних.');
        }

        return $createdTask;
    }

    public function complete(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare('
            UPDATE tasks 
            SET is_completed = 1, updated_at = NOW() 
            WHERE id = :id AND user_id = :user_id
        ');

        $stmt->execute([
            ':id'      => $id,
            ':user_id' => $userId,
        ]);

        if ($stmt->rowCount() === 0) {
            // Перевіряємо, чи взагалі існує завдання
            if ($this->findByIdAndUser($id, $userId) === null) {
                throw new TaskNotFoundException("Завдання з ID {$id} не знайдено або воно належить іншому користувачу.");
            }
        }

        return true;
    }

    public function delete(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :user_id');
        $stmt->execute([
            ':id'      => $id,
            ':user_id' => $userId,
        ]);

        if ($stmt->rowCount() === 0) {
            throw new TaskNotFoundException("Неможливо видалити: завдання з ID {$id} не знайдено.");
        }

        return true;
    }
}
```

---

### Крок 5. Оновлення точки входу `index.php` з пагінацією

Оновіть файл `index.php`. Тепер додаток використовує екземпляр `PDO`, обмежує вибірку поточним користувачем та підтримує постраничну навігацію:

```php
<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskStorageInterface.php';
require_once __DIR__ . '/TaskRepository.php';
require_once __DIR__ . '/Exceptions.php';

// Емуляція сесії користувача (якщо модуль автентифікації ще не налаштовано)
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Студент';
}

$currentUserId = (int) $_SESSION['user_id'];
$pdo = Database::getConnection();
$repo = new TaskRepository($pdo);

$formErrors = [];
$feedbackMessage = $_SESSION['feedback'] ?? null;
unset($_SESSION['feedback']);

// Обробка POST-запитів
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add') {
            $title    = $_POST['title'] ?? '';
            $deadline = trim($_POST['deadline'] ?? '') ?: null;

            $repo->add($currentUserId, $title, $deadline);
            $_SESSION['feedback'] = 'Завдання успішно збережено в базі даних!';
            header('Location: index.php');
            exit;
        }

        if ($action === 'complete') {
            $id = (int) ($_POST['id'] ?? 0);
            $repo->complete($id, $currentUserId);
            $_SESSION['feedback'] = 'Статус завдання змінено на "Виконано"!';
            header('Location: index.php');
            exit;
        }

        if ($action === 'delete') {
            $id = (int) ($_POST['id'] ?? 0);
            $repo->delete($id, $currentUserId);
            $_SESSION['feedback'] = 'Завдання видалено з бази даних!';
            header('Location: index.php');
            exit;
        }
    } catch (ValidationException $e) {
        $formErrors = $e->getErrors();
    } catch (TaskNotFoundException $e) {
        $feedbackMessage = 'Помилка: ' . $e->getMessage();
    } catch (Throwable $e) {
        $feedbackMessage = 'Критична помилка: ' . $e->getMessage();
    }
}

// Розрахунок параметрів пагінації
$perPage = 5;
$page = max(1, (int) ($_GET['page'] ?? 1));
$totalTasks = $repo->countByUser($currentUserId);
$totalPages = max(1, (int) ceil($totalTasks / $perPage));

if ($page > $totalPages && $totalTasks > 0) {
    $page = $totalPages;
}

$tasks = $repo->findAllByUser($currentUserId, $page, $perPage);
$completedCount = $repo->countCompletedByUser($currentUserId);
$overdueCount   = $repo->countOverdueByUser($currentUserId);
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Менеджер завдань — Лабораторна №13</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 30px auto; padding: 0 15px; }
        .alert { padding: 10px 15px; border-radius: 4px; margin-bottom: 20px; }
        .alert-success { background: #d4edda; color: #155724; }
        .alert-error { background: #f8d7da; color: #721c24; }
        .task-card { border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .task-completed { background-color: #f9f9f9; text-decoration: line-through; color: #888; }
        .pagination { display: flex; gap: 8px; margin-top: 20px; align-items: center; }
        .pagination a, .pagination span { padding: 6px 12px; border: 1px solid #ccc; text-decoration: none; border-radius: 4px; color: #333; }
        .pagination .active { background-color: #007bff; color: white; border-color: #007bff; font-weight: bold; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Менеджер завдань (MySQL + PDO)</h1>
    <p>Авторизований користувач: <strong><?= htmlspecialchars($_SESSION['username'] ?? '') ?></strong> (ID: <?= $currentUserId ?>)</p>

    <div class="stats">
        <span>Всього завдань: <?= $totalTasks ?></span>
        <span>Виконано: <?= $completedCount ?></span>
        <span>Прострочено: <?= $overdueCount ?></span>
    </div>

    <?php if ($feedbackMessage): ?>
        <div class="alert alert-success"><?= htmlspecialchars($feedbackMessage) ?></div>
    <?php endif; ?>

    <?php if (!empty($formErrors)): ?>
        <div class="alert alert-error">
            <ul>
                <?php foreach ($formErrors as $error): ?>
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="POST" action="index.php" style="margin-bottom: 30px;">
        <input type="hidden" name="action" value="add">
        <input type="text" name="title" placeholder="Що потрібно зробити?" style="padding: 8px; width: 60%;" required>
        <input type="date" name="deadline" style="padding: 8px;">
        <button type="submit" style="padding: 8px 16px;">Додати</button>
    </form>

    <h2>Список завдань (Сторінка <?= $page ?> з <?= $totalPages ?>)</h2>

    <?php if (empty($tasks)): ?>
        <p>На цій сторінці завдань немає.</p>
    <?php else: ?>
        <?php foreach ($tasks as $task): ?>
            <div class="task-card <?= $task->isCompleted() ? 'task-completed' : '' ?>">
                <div>
                    <strong>#<?= $task->id ?> <?= htmlspecialchars($task->getTitle()) ?></strong>
                    <br>
                    <small>Дедлайн: <?= htmlspecialchars($task->getDeadline() ?? 'Не встановлено') ?> | Статус: <?= $task->getStatusLabel() ?></small>
                </div>
                <div style="display: flex; gap: 6px;">
                    <?php if (!$task->isCompleted()): ?>
                        <form method="POST" action="index.php" style="display:inline;">
                            <input type="hidden" name="action" value="complete">
                            <input type="hidden" name="id" value="<?= $task->id ?>">
                            <button type="submit">✓</button>
                        </form>
                    <?php endif; ?>
                    <form method="POST" action="index.php" style="display:inline;">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $task->id ?>">
                        <button type="submit" onclick="return confirm('Видалити?')">✕</button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>

        <!-- Блок пагінації -->
        <?php if ($totalPages > 1): ?>
            <div class="pagination">
                <?php if ($page > 1): ?>
                    <a href="?page=<?= $page - 1 ?>">« Назад</a>
                <?php endif; ?>

                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <?php if ($i === $page): ?>
                        <span class="active"><?= $i ?></span>
                    <?php else: ?>
                        <a href="?page=<?= $i ?>"><?= $i ?></a>
                    <?php endif; ?>
                <?php endfor; ?>

                <?php if ($page < $totalPages): ?>
                    <a href="?page=<?= $page + 1 ?>">Вперед »</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</body>
</html>
```

---

### Крок 6. Тестування та перевірка результатів

Для підтвердження коректності виконання лабораторної роботи проведіть такі перевірки:
- додавання завдань у базу — додайте через форму щонайменше 7–8 різних завдань із дедлайнами та без;
- перевірка в phpMyAdmin — перейдіть у phpMyAdmin та відкрийте таблицю `tasks`; переконайтеся, що з'явилися нові рядки з відповідними `user_id`, а значення поля `id` збільшується автоматично;
- перевірка пагінації — переконайтеся, що на одній сторінці відображається не більше 5 завдань, а перехід за посиланнями `?page=1` та `?page=2` коректно змінює набір даних;
- перевірка захисту від SQL-ін'єкцій — спробуйте ввести в поле назви завдання рядок `' OR '1'='1' -- `; переконайтеся, що завдання зберігається саме як текст без SQL-помилок та зламу запиту;
- перевірка операцій оновлення та видалення — позначте завдання виконаним і видаліть одне із завдань, перевіривши оновлення статусів у базі даних.

---

### Контрольні запитання

1. Що таке розширення PDO у PHP та які суттєві переваги воно надає у порівнянні з застарілим `mysql_*` та процедурним стилем `mysqli`?
2. Яким чином підготовлені вирази (Prepared Statements) гарантують захист від SQL-ін'єкцій, і чому конкатенація змінних безпосередньо в SQL-рядок вважається критичною вразливістю?
3. Чому для параметрів `LIMIT` та `OFFSET` у методі `TaskRepository::findAllByUser()` використовується метод `bindValue()` з типом `PDO::PARAM_INT`, а не передача масиву значень у `execute()`?
4. Для чого призначений метод `PDO::lastInsertId()`, у який момент його необхідно викликати і що він повертає?
5. Як саме реалізується постранична пагінація в реляційних базах даних? Поясніть формулу розрахунку зміщення: `offset = (page - 1) * perPage`.

---

### Вимоги до звіту

1. У файл `lab13.md` вашого репозиторію додати фрагменти реалізованого класу `TaskRepository.php` (методи `add()`, `findAllByUser()`, `complete()`, `delete()`).
2. Додати скриншот робочого інтерфейсу браузера з працюючим блоком пагінації (перемикання між сторінками 1 та 2).
3. Додати скриншот phpMyAdmin вкладки "Огляд" (Browse) таблиці `tasks` із реальними збереженими записами.
4. У файлі `lab13.md` надати стислі, але обґрунтовані письмові відповіді на всі контрольні запитання.
5. Надіслати посилання на GitHub-репозиторій із виконаною роботою на перевірку.
