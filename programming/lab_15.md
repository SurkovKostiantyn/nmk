# Лабораторна робота №15 (2 години)

**Тема:** Впровадження Composer, автозавантаження PSR-4 та сервісного шару.  
Модернізація архітектури проєкту «Менеджер завдань»: інтеграція пакетного менеджера Composer, переведення кодової бази на стандартизовані простори імен (Namespaces) та автозавантаження за стандартом PSR-4, винесення конфіденційної конфігурації у змінні оточення за допомогою бібліотеки `vlucas/phpdotenv`, а також відокремлення бізнес-логіки від контролерів у спеціалізований сервісний шар (`TaskService`) із застосуванням патерну Dependency Injection.

**Мета:** Опанувати роботу з менеджером залежностей Composer та стандартом автозавантаження класів PSR-4. Навчитися структурувати класи за допомогою просторів імен (`namespace`), організовувати безпечне керування обліковими даними через файл `.env` та бібліотеку `phpdotenv`, виділяти шар бізнес-логіки (Service Layer) та застосовувати патерн впровадження залежностей (Dependency Injection) для створення слабкозв'язаної, масштабованої та тестованої архітектури бекенду.

**Технологічний стек:** PHP 8.1+, Composer, стандарт автозавантаження PSR-4, Namespaces (`namespace`, `use`), Dependency Injection (DI), Service Layer (`TaskService`), бібліотека `vlucas/phpdotenv`, змінні оточення (`.env`, `$_ENV`), Git (`.gitignore`).

## Завдання

Основні завдання лабораторної роботи:
- ініціалізація Composer - створити маніфест `composer.json` та налаштувати відображення простору імен `App\\` на каталог `src/` за стандартом PSR-4;
- стандартизація просторів імен - розподілити класи проєкту за логічними просторами `App\Models`, `App\Repositories`, `App\Controllers`, `App\Services`, `App\Exceptions` та оновити відповідні інструкції `use`;
- перехід на стандартне автозавантаження - видалити саморобний завантажувач класів і підключити стандартний файл `vendor/autoload.php` у точці входу `public/index.php`;
- безпечне керування конфігурацією - підключити пакет `vlucas/phpdotenv`, створити конфігураційний файл `.env`, шаблон `.env.example`, оновити `.gitignore` та адаптувати клас `Database` для читання параметрів з оточення;
- проєктування сервісного шару - розробити клас `TaskService` для концентрації бізнес-правил (валідація даних, перевірка строків дедлайну, обробка пагінації та підготовка даних);
- впровадження Dependency Injection - перевести `TaskController` на ін'єкцію `TaskService` через конструктор, зробивши контролер «тонким» координатором HTTP-запитів;
- перевірка працездатності - переконатися в коректній роботі автозавантаження класів, валідації бізнес-логіки та захисту конфіденційних налаштувань.

## Хід виконання роботи

> Базою для виконання цієї лабораторної роботи є структура проєкту, рефакторинг якої було здійснено в лабораторній роботі №14: каталог `public/` (точка входу `index.php`), каталог класів `src/` та каталог представлень `views/`.

---

### Крок 1. Ініціалізація Composer та конфігурація автозавантаження PSR-4

У лабораторній роботі №14 для підключення класів використовувалася власноруч написана функція `spl_autoload_register`. У професійній PHP-розробці стандартом де-факто є використання менеджера пакетів **Composer** та стандарту **PSR-4**, за яким простір імен класу строго відповідає структурі папок на диску.

Переконайтеся, що у вашій системі встановлено Composer, виконавши команду в терміналі:

```bash
composer --version
```

У кореневій директорії проєкту `task-manager` створіть файл `composer.json`:

```json
{
    "name": "student/task-manager",
    "description": "Task Manager application with MVC, PSR-4 and Service Layer",
    "type": "project",
    "license": "MIT",
    "require": {
        "php": ">=8.1"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

Зверніть увагу на секцію `autoload.psr-4`:
- префікс простору імен `"App\\"` вказує на директорію `"src/"`;
- це означає, що клас `App\Models\Task` інтерпретатор автоматично шукатиме у файлі `src/Models/Task.php`, а клас `App\Controllers\TaskController` — у файлі `src/Controllers/TaskController.php`.

Згенеруйте системний завантажувач класів Composer, виконавши в терміналі команду:

```bash
composer dump-autoload
```

Після виконання команди в корені проєкту з'явиться каталог `vendor/` із файлом `vendor/autoload.php`.

---

### Крок 2. Оновлення класів проєкту просторами імен (`Namespaces`)

Для відповідності стандарту PSR-4 кожен файл у каталозі `src/` повинен починатися з декларації відповідного простору імен (`namespace`). Якщо клас використовує інші класи або вбудовані класи PHP (`PDO`, `RuntimeException`), їх необхідно явно імпортувати через інструкцію `use`.

Оновіть файли вашого проєкту відповідно до наведеної структури:

#### 1. Моделі та допоміжні класи (`src/Models/`)

Файл `src/Models/TimestampableTrait.php`:

```php
<?php
declare(strict_types=1);

namespace App\Models;

trait TimestampableTrait
{
    public ?string $createdAt = null;
    public ?string $updatedAt = null;

    public function initTimestamps(): void
    {
        $now = date('Y-m-d H:i:s');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function touch(): void
    {
        $this->updatedAt = date('Y-m-d H:i:s');
    }
}
```

Файл `src/Models/Task.php`:

```php
<?php
declare(strict_types=1);

namespace App\Models;

class Task
{
    use TimestampableTrait;

    public function __construct(
        public readonly ?int $id,
        public int $userId,
        public string $title,
        public bool $isCompleted = false,
        public ?string $deadline = null,
        ?string $createdAt = null,
        ?string $updatedAt = null
    ) {
        $this->createdAt = $createdAt ?? date('Y-m-d H:i:s');
        $this->updatedAt = $updatedAt;
    }

    public function isOverdue(): bool
    {
        if ($this->isCompleted || empty($this->deadline)) {
            return false;
        }

        return strtotime($this->deadline) < time();
    }
}
```

#### 2. Репозиторії (`src/Repositories/`)

Файл `src/Repositories/TaskStorageInterface.php`:

```php
<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Models\Task;

interface TaskStorageInterface
{
    public function add(int $userId, string $title, ?string $deadline = null): int;
    
    /**
     * @return Task[]
     */
    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array;
    
    public function countByUser(int $userId): int;
    
    public function complete(int $id, int $userId): bool;
    
    public function delete(int $id, int $userId): bool;
}
```

Файл `src/Repositories/TaskRepository.php`:

```php
<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Models\Task;
use PDO;

class TaskRepository implements TaskStorageInterface
{
    public function __construct(private PDO $pdo) {}

    public function add(int $userId, string $title, ?string $deadline = null): int
    {
        $sql = "INSERT INTO tasks (user_id, title, is_completed, deadline, created_at) 
                VALUES (:user_id, :title, 0, :deadline, NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':user_id'  => $userId,
            ':title'    => $title,
            ':deadline' => $deadline,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array
    {
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT id, user_id, title, is_completed, deadline, created_at, updated_at 
                FROM tasks 
                WHERE user_id = :user_id 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $tasks = [];
        while ($row = $stmt->fetch()) {
            $tasks[] = new Task(
                id: (int) $row['id'],
                userId: (int) $row['user_id'],
                title: $row['title'],
                isCompleted: (bool) $row['is_completed'],
                deadline: $row['deadline'],
                createdAt: $row['created_at'],
                updatedAt: $row['updated_at']
            );
        }

        return $tasks;
    }

    public function countByUser(int $userId): int
    {
        $sql = "SELECT COUNT(*) FROM tasks WHERE user_id = :user_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);

        return (int) $stmt->fetchColumn();
    }

    public function complete(int $id, int $userId): bool
    {
        $sql = "UPDATE tasks 
                SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END,
                    updated_at = NOW() 
                WHERE id = :id AND user_id = :user_id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id, ':user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }

    public function delete(int $id, int $userId): bool
    {
        $sql = "DELETE FROM tasks WHERE id = :id AND user_id = :user_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id, ':user_id' => $userId]);

        return $stmt->rowCount() > 0;
    }
}
```

#### 3. Маршрутизатор (`src/Router.php`)

Оновіть файл `src/Router.php`, додавши простір імен:

```php
<?php
declare(strict_types=1);

namespace App;

use RuntimeException;

class Router
{
    private array $routes = [];

    public function get(string $uri, array $action): void
    {
        $this->routes['GET'][$uri] = $action;
    }

    public function post(string $uri, array $action): void
    {
        $this->routes['POST'][$uri] = $action;
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        $method = strtoupper($method);

        if (!isset($this->routes[$method][$path])) {
            $this->handleNotFound($method, $path);
            return;
        }

        $action = $this->routes[$method][$path];

        // Якщо передано вже готовий об'єкт або функцію
        if (is_callable($action)) {
            $action();
            return;
        }

        // Якщо передано масив вигляду [Об'єктАбоКлас, 'метод']
        [$target, $methodName] = $action;

        if (is_object($target)) {
            $target->$methodName();
            return;
        }

        if (is_string($target)) {
            if (!class_exists($target)) {
                throw new RuntimeException("Клас '{$target}' не знайдено.");
            }
            $controller = new $target();
            $controller->$methodName();
        }
    }

    private function handleNotFound(string $method, string $path): void
    {
        http_response_code(404);
        echo "<h1 style='font-family: sans-serif; text-align: center; margin-top: 50px;'>404 — Сторінку не знайдено</h1>";
        echo "<p style='font-family: sans-serif; text-align: center; color: #666;'>Маршрут {$method} {$path} не зареєстровано.</p>";
    }
}
```

---

### Крок 3. Підключення `vlucas/phpdotenv` та безпечне налаштування конфігурації

Зберігати облікові дані до бази даних прямо у вихідному коді (hardcoded credentials) є грубим порушенням безпеки. Згідно з методологією *The Twelve-Factor App*, конфігурація повинна суворо відокремлюватися від коду та зберігатися у змінних середовища.

Встановіть популярну бібліотеку `vlucas/phpdotenv` за допомогою Composer:

```bash
composer require vlucas/phpdotenv
```

Після виконання цієї команди Composer завантажить бібліотеку у папку `vendor/` та автоматично оновить файли `composer.json` і `composer.lock`.

#### 1. Створення файлу `.env`

Створіть у корені вашого проєкту файл `.env`:

```env
# Параметри підключення до MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=task_manager
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# Загальні налаштування застосунку
APP_ENV=development
APP_DEBUG=true
```

#### 2. Захист у Git (`.gitignore`) та файл `.env.example`

Створіть у корені проєкту файл `.gitignore`, щоб запобігти випадковій публікації конфіденційних даних та важкої директорії бібліотек у публічний репозиторій:

```gitignore
/vendor/
.env
```

Для того, щоб інші розробники знали, які змінні необхідні для роботи застосунку, створіть файл-шаблон `.env.example` (він фіксується у Git і містить лише зразок структури без реальних секретів):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=task_manager
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4
APP_ENV=development
APP_DEBUG=true
```

#### 3. Модифікація класу `Database` для читання змінних з `$_ENV`

Оновіть файл `src/Models/Database.php`:

```php
<?php
declare(strict_types=1);

namespace App\Models;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
            $port = $_ENV['DB_PORT'] ?? '3306';
            $db   = $_ENV['DB_NAME'] ?? 'task_manager';
            $user = $_ENV['DB_USER'] ?? 'root';
            $pass = $_ENV['DB_PASS'] ?? '';
            $charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$connection = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                throw new RuntimeException('Помилка з\'єднання з базою даних: ' . $e->getMessage());
            }
        }

        return self::$connection;
    }
}
```

---

### Крок 4. Створення сервісного шару: клас `TaskService`

У попередній лабораторній роботі бізнес-перевірки (наприклад, валідація мінімальної довжини рядка `mb_strlen($title) < 3`) виконувалися безпосередньо у контролері. 

**Service Layer (Сервісний шар)** — це архітектурний патерн, який концентрує бізнес-правила системи в окремому класі. Контролер повинен бути «тонким»: він лише приймає HTTP-запит, передає дані в сервіс та повертає результат у представлення.

Створіть файл `src/Services/TaskService.php`:

```php
<?php
declare(strict_types=1);

namespace App\Services;

use App\Repositories\TaskStorageInterface;
use InvalidArgumentException;

class TaskService
{
    public function __construct(
        private TaskStorageInterface $repository
    ) {}

    /**
     * Отримання списку завдань користувача з розрахунком пагінації
     *
     * @return array{tasks: array, totalTasks: int, totalPages: int, currentPage: int}
     */
    public function getTasksPaginated(int $userId, int $page = 1, int $perPage = 5): array
    {
        $page = max(1, $page);
        $totalTasks = $this->repository->countByUser($userId);
        $totalPages = (int) ceil($totalTasks / $perPage);
        $tasks = $this->repository->findAllByUser($userId, $page, $perPage);

        return [
            'tasks'       => $tasks,
            'totalTasks'  => $totalTasks,
            'totalPages'  => $totalPages,
            'currentPage' => $page,
        ];
    }

    /**
     * Створення нового завдання з валідацією бізнес-правил
     *
     * @throws InvalidArgumentException
     */
    public function createTask(int $userId, string $title, ?string $deadline): int
    {
        $trimmedTitle = trim($title);

        if (mb_strlen($trimmedTitle) < 3) {
            throw new InvalidArgumentException('Назва завдання повинна містити щонайменше 3 символи.');
        }

        if (mb_strlen($trimmedTitle) > 255) {
            throw new InvalidArgumentException('Назва завдання не може перевищувати 255 символів.');
        }

        $formattedDeadline = null;
        if (!empty($deadline)) {
            $timestamp = strtotime($deadline);
            if ($timestamp === false) {
                throw new InvalidArgumentException('Вказано некоректний формат дати дедлайну.');
            }
            $formattedDeadline = date('Y-m-d H:i:s', $timestamp);
        }

        return $this->repository->add($userId, $trimmedTitle, $formattedDeadline);
    }

    /**
     * Перемикання статусу завдання
     */
    public function toggleTask(int $taskId, int $userId): bool
    {
        if ($taskId <= 0) {
            return false;
        }

        return $this->repository->complete($taskId, $userId);
    }

    /**
     * Видалення завдання
     */
    public function deleteTask(int $taskId, int $userId): bool
    {
        if ($taskId <= 0) {
            return false;
        }

        return $this->repository->delete($taskId, $userId);
    }
}
```

---

### Крок 5. Рефакторинг контролерів та впровадження Dependency Injection (DI)

**Dependency Injection (Впровадження залежностей)** — це підхід, за якого клас не створює залежності всередині себе через `new`, а отримує їх ззовні (найчастіше через конструктор). Це робить компоненти незалежними, легко замінюваними та зручними для тестування.

#### 1. Базовий контролер `src/Controllers/BaseController.php`

Оновіть простір імен у файлі `src/Controllers/BaseController.php`:

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

use RuntimeException;

abstract class BaseController
{
    protected function render(string $view, array $data = []): void
    {
        extract($data);

        $viewFile = __DIR__ . '/../../views/' . $view . '.php';

        if (!file_exists($viewFile)) {
            throw new RuntimeException("Файл представлення не знайдено: {$viewFile}");
        }

        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        $layoutFile = __DIR__ . '/../../views/layouts/main.php';

        if (!file_exists($layoutFile)) {
            throw new RuntimeException("Файл макета не знайдено: {$layoutFile}");
        }

        require $layoutFile;
    }

    protected function redirect(string $url): void
    {
        header("Location: {$url}");
        exit;
    }

    protected function requireAuth(): void
    {
        if (empty($_SESSION['user_id'])) {
            $this->redirect('/login');
        }
    }
}
```

#### 2. Оновлений `src/Controllers/TaskController.php`

Тепер `TaskController` не створює `TaskRepository` самостійно, а отримує сервіс `TaskService` через конструктор:

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\TaskService;
use InvalidArgumentException;

class TaskController extends BaseController
{
    public function __construct(
        private TaskService $taskService
    ) {}

    public function index(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $page = max(1, (int) ($_GET['page'] ?? 1));

        $data = $this->taskService->getTasksPaginated($userId, $page, perPage: 5);

        $this->render('tasks/index', [
            'pageTitle'  => 'Мої завдання — TaskFlow',
            'tasks'      => $data['tasks'],
            'page'       => $data['currentPage'],
            'totalPages' => $data['totalPages'],
            'totalTasks' => $data['totalTasks'],
        ]);
    }

    public function create(): void
    {
        $this->requireAuth();

        $this->render('tasks/create', [
            'pageTitle' => 'Нове завдання — TaskFlow',
            'errors'    => [],
            'old'       => [],
        ]);
    }

    public function store(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $title = $_POST['title'] ?? '';
        $deadline = $_POST['deadline'] ?? '';

        try {
            $this->taskService->createTask($userId, $title, !empty($deadline) ? $deadline : null);
            $this->redirect('/');
        } catch (InvalidArgumentException $e) {
            $this->render('tasks/create', [
                'pageTitle' => 'Нове завдання — TaskFlow',
                'errors'    => [$e->getMessage()],
                'old'       => ['title' => $title, 'deadline' => $deadline],
            ]);
        }
    }

    public function complete(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $taskId = (int) ($_POST['id'] ?? 0);

        $this->taskService->toggleTask($taskId, $userId);
        $this->redirect('/');
    }

    public function delete(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $taskId = (int) ($_POST['id'] ?? 0);

        $this->taskService->deleteTask($taskId, $userId);
        $this->redirect('/');
    }
}
```

#### 3. Контролер авторизації `src/Controllers/AuthController.php`

Оновіть простір імен у `src/Controllers/AuthController.php`:

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

class AuthController extends BaseController
{
    public function showLogin(): void
    {
        if (!empty($_SESSION['user_id'])) {
            $this->redirect('/');
        }

        $this->render('auth/login', [
            'pageTitle' => 'Вхід у систему — TaskFlow',
            'error'     => null,
        ]);
    }

    public function login(): void
    {
        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');

        if (empty($username) || empty($password)) {
            $this->render('auth/login', [
                'pageTitle'   => 'Вхід у систему — TaskFlow',
                'error'       => 'Будь ласка, заповніть усі обов\'язкові поля.',
                'oldUsername' => $username,
            ]);
            return;
        }

        $_SESSION['user_id'] = 1;
        $_SESSION['user_name'] = htmlspecialchars($username);

        $this->redirect('/');
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
        $this->redirect('/login');
    }
}
```

---

### Крок 6. Оновлення точки входу `public/index.php`

У точці входу підключається єдиний завантажувач `vendor/autoload.php`, ініціалізуються змінні середовища через Dotenv, збираються об'єкти згідно з деревом залежностей (Dependency Injection Container / Composition Root) та запускається маршрутизатор.

Оновіть файл `public/index.php`:

```php
<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\TaskController;
use App\Models\Database;
use App\Repositories\TaskRepository;
use App\Router;
use App\Services\TaskService;
use Dotenv\Dotenv;

// 1. Стандартний автозавантажувач класів Composer PSR-4
require_once __DIR__ . '/../vendor/autoload.php';

// 2. Безпечне завантаження конфігурації з файлу .env
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// 3. Старт користувацької сесії
session_start();

// 4. Побудова дерева залежностей (Dependency Injection)
$pdo            = Database::getConnection();
$taskRepository = new TaskRepository($pdo);
$taskService    = new TaskService($taskRepository);

// Інстанціюємо контролери, передаючи необхідні сервіси через конструктор
$taskController = new TaskController($taskService);
$authController = new AuthController();

// 5. Ініціалізація та налаштування маршрутизатора
$router = new Router();

// Маршрути задач
$router->get('/',                [$taskController, 'index']);
$router->get('/tasks/create',    [$taskController, 'create']);
$router->post('/tasks/create',   [$taskController, 'store']);
$router->post('/tasks/complete', [$taskController, 'complete']);
$router->post('/tasks/delete',   [$taskController, 'delete']);

// Маршрути авторизації
$router->get('/login',           [$authController, 'showLogin']);
$router->post('/login',          [$authController, 'login']);
$router->get('/logout',          [$authController, 'logout']);

// 6. Обробка вхідного HTTP-запиту
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
```

---

### Крок 7. Тестування, верифікація та перевірка Git

Виконайте комплексне тестування оновленого проєкту:

1. Запустіть веб-сервер у терміналі:
   ```bash
   php -S localhost:8000 -t public
   ```
2. Відкрийте в браузері `http://localhost:8000`. Увійдіть у систему під будь-яким логіном.
3. Спробуйте створити завдання з назвою з 2 символів (наприклад, `Hi`). Переконайтеся, що `TaskService` викидає `InvalidArgumentException`, а контролер коректно відображає повідомлення про помилку: *«Назва завдання повинна містити щонайменше 3 символи.»*
4. Створіть коректне завдання та перевірте його відображення у списку, роботу пагінації, перемикання статусу та видалення.
5. Змініть значення в файлі `.env` (наприклад, тимчасово вкажіть хибний пароль `DB_PASS=wrong`) та переконайтеся, що система зчитує нові налаштування й реагує зрозумілим повідомленням про помилку з'єднання.
6. Перевірте статус Git у терміналі:
   ```bash
   git status
   ```
   Переконайтеся, що каталог `vendor/` та файл `.env` **відсутні** у списку змін для коміту (ігноруються завдяки `.gitignore`), а файл `.env.example` присутній.

---

### Контрольні запитання

1. Що таке Composer і яку роль він відіграє в екосистемі PHP? Чим файл `composer.json` відрізняється від `composer.lock`?
2. Поясніть принципи стандарту автозавантаження PSR-4. Що означає запис `"App\\": "src/"` у блоці `autoload`?
3. Що таке простори імен (`namespace`) та інструкція `use`? Яку проблему вони вирішують при підключенні сторонніх бібліотек?
4. Чому конфігураційні дані (паролі БД, API-ключі) неприпустимо зберігати у файлах вихідного коду, і яку роль відіграє бібліотека `phpdotenv` разом із файлами `.env` та `.env.example`?
5. У чому полягає суть архітектурного патерну Service Layer та принципу Dependency Injection? Чому створення залежностей через `new` всередині контролера вважається поганою практикою?

---

### Вимоги до звіту

1. У файл `lab15.md` вашого репозиторію додати лістинг файлу `composer.json` та фрагмент класу `TaskService.php` (методи `getTasksPaginated()` та `createTask()`).
2. Додати лістинг файлу точки входу `public/index.php`, де наочно продемонстровано побудову дерева залежностей (DI).
3. Додати скриншот консолі з результатом виконання команди `git status`, що підтверджує ігнорування папки `vendor/` та файлу `.env`.
4. Додати скриншот браузера з повідомленням про помилку валідації назви завдання, сформованим сервісом `TaskService`.
5. У файлі `lab15.md` надати стислі, але обґрунтовані письмові відповіді на всі контрольні запитання.
6. Надіслати посилання на GitHub-репозиторій із виконаною роботою на перевірку.
