# Лабораторна робота №16 (2 години)

**Тема:** Комплексний аудит безпеки, дебагінг та фіналізація проєкту.  
Комплексне підвищення надійності та захищеності навчального проєкту «Менеджер завдань»: впровадження криптографічного хешування паролів за алгоритмом Bcrypt (`password_hash` / `password_verify`), захист від атак міжсайтової підробки запитів (CSRF) за допомогою токенів, суворе екранування виведення проти XSS, оптимізація запитів до бази даних для ліквідації проблеми N+1, організація централізованого логування помилок у файл та підготовка проєкту до виробничого розгортання (Production Deployment).

**Мета:** Опанувати практичні методи комплексного захисту веб-застосунків від поширених загроз безпеки з переліку OWASP Top 10 (SQLi, XSS, CSRF, Session Hijacking). Навчитися безпечно хешувати та верифікувати паролі користувачів, впроваджувати токени захисту від підробки запитів, захищати сесії, оптимізувати продуктивність SQL-запитів шляхом об'єднання таблиць (JOIN), налаштовувати централізоване логування помилок без витоку технічних деталей користувачу та проводити фінальний аудит кодової бази перед публікацією.

**Технологічний стек:** PHP 8.1+, Bcrypt (`password_hash`, `password_verify`), Synchronizer Token Pattern (CSRF), `hash_equals()`, `random_bytes()`, XSS-екранування (`htmlspecialchars`), сесійна безпека (`HttpOnly`, `SameSite`, `session_regenerate_id`), SQL `JOIN` (ліквідація проблеми N+1), централізоване логування подій (`Logger`), Composer (`--no-dev`, `--optimize-autoloader`), змінні середовища (`.env`).

## Завдання

Основні завдання лабораторної роботи:
- автентифікація через криптографічні хеші - розширити таблицю `users`, створити клас моделі `User`, репозиторій `UserRepository` та реалізувати безпечну перевірку облікових даних за допомогою функцій `password_hash()` та `password_verify()`;
- захист усіх POST-форм від CSRF-атак - розробити клас безпеки `CsrfHelper`, налаштувати автоматичну генерацію та валідацію одноразових токенів через криптографічно стійке порівняння `hash_equals()`;
- аудит виведення та нейтралізація XSS - створити функцію-хелпер безпечного екранування `e()` з обов'язковими прапорцями `ENT_QUOTES | ENT_SUBSTITUTE` та оновити всі файли представлень (`views/`);
- безпека сесій та захисні HTTP-заголовки - налаштувати директиви безпеки сесійних cookie (`HttpOnly`, `SameSite=Lax`), додати обов'язкову регенерацію ідентифікатора сесії `session_regenerate_id(true)` після авторизації та встановити захисні заголовки `X-Frame-Options` і `X-Content-Type-Options`;
- оптимізація SQL-вибірок (усунення N+1) - оновити метод отримання завдань у `TaskRepository` за допомогою SQL-оператора `LEFT JOIN`, отримавши імена та email авторів завдань за один запит замість викликів у циклі;
- централізоване журналювання помилок - розробити клас `Logger` та зареєструвати глобальні обробники помилок і винятків (`set_exception_handler`), які записують деталі збоїв у файл `storage/logs/app.log` та приховують стек-трейс від кінцевих користувачів;
- виробнича фіналізація проєкту - сформувати конфігурацію продакшен-режиму в `.env`, оптимізувати автозавантажувач Composer та провести підсумкове тестування всіх модулів MVP.

## Хід виконання роботи

> Базою для виконання цієї лабораторної роботи є проєкт «Менеджер завдань» у стані завершення лабораторної роботи №15: налаштований Composer з автозавантаженням PSR-4, сервісний шар (`TaskService`), впровадження залежностей (DI), файл `.env` та структура MVC.

---

### Крок 1. Переведення автентифікації на криптографічні хеші (Bcrypt)

У лабораторних роботах №14 та №15 контролер `AuthController` працював у демонстраційному режимі (встановлював фіксованого користувача `id=1` без перевірки пароля). Реалізуємо повноцінну, захищену систему автентифікації на базі хешування Bcrypt.

#### 1. Структура таблиці `users` та тестовий користувач

Виконайте в phpMyAdmin наступний SQL-запит для створення таблиці користувачів та додавання тестового запису:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Додавання тестового користувача з логіном "admin" та паролем "secret123"
-- Хеш згенеровано за допомогою password_hash('secret123', PASSWORD_BCRYPT)
INSERT INTO users (username, email, password_hash) 
VALUES ('admin', 'admin@example.com', '$2y$10$wK1k6y5D0G6KjH5N8bWpUeN6U4s6Z.k6t.wK1k6y5D0G6KjH5N8bW')
ON DUPLICATE KEY UPDATE id=id;
```

#### 2. Модель користувача `src/Models/User.php`

Створіть файл `src/Models/User.php`:

```php
<?php
declare(strict_types=1);

namespace App\Models;

class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $username,
        public readonly string $email,
        public readonly string $passwordHash,
        public readonly ?string $createdAt = null
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: (int) $data['id'],
            username: $data['username'],
            email: $data['email'],
            passwordHash: $data['password_hash'],
            createdAt: $data['created_at'] ?? null
        );
    }
}
```

#### 3. Репозиторій користувачів `src/Repositories/UserRepository.php`

Створіть файл `src/Repositories/UserRepository.php`:

```php
<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use PDO;

class UserRepository
{
    public function __construct(private PDO $pdo) {}

    public function findByUsernameOrEmail(string $identifier): ?User
    {
        $sql = "SELECT id, username, email, password_hash, created_at 
                FROM users 
                WHERE username = :identifier OR email = :identifier 
                LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':identifier' => $identifier]);
        $data = $stmt->fetch();

        return $data ? User::fromArray($data) : null;
    }

    public function findById(int $id): ?User
    {
        $sql = "SELECT id, username, email, password_hash, created_at 
                FROM users 
                WHERE id = :id 
                LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();

        return $data ? User::fromArray($data) : null;
    }
}
```

#### 4. Сервіс автентифікації `src/Services/AuthService.php`

Створіть файл `src/Services/AuthService.php`, який виконує криптографічну перевірку пароля за допомогою `password_verify()`:

```php
<?php
declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use InvalidArgumentException;

class AuthService
{
    public function __construct(
        private UserRepository $userRepository
    ) {}

    /**
     * Спроба автентифікації користувача
     *
     * @throws InvalidArgumentException Якщо облікові дані невірні
     */
    public function authenticate(string $identifier, string $password): User
    {
        $trimmedIdentifier = trim($identifier);

        if (empty($trimmedIdentifier) || empty($password)) {
            throw new InvalidArgumentException('Будь ласка, вкажіть логін та пароль.');
        }

        $user = $this->userRepository->findByUsernameOrEmail($trimmedIdentifier);

        // Перевіряємо хеш пароля за допомогою надійної функції password_verify
        if (!$user || !password_verify($password, $user->passwordHash)) {
            // Умисно використовуємо однакове нейтральне повідомлення для захисту від перебору логінів
            throw new InvalidArgumentException('Невірне ім\'я користувача або пароль.');
        }

        return $user;
    }
}
```

---

### Крок 2. Реалізація захисту від CSRF (Synchronizer Token Pattern)

Для захисту форм від підробки міжсайтових запитів створимо клас помічника `CsrfHelper`. Він генерує унікальний криптографічно стійкий токен та зберігає його у сесії.

Створіть файл `src/Security/CsrfHelper.php`:

```php
<?php
declare(strict_types=1);

namespace App\Security;

class CsrfHelper
{
    private const SESSION_KEY = '_csrf_token';

    /**
     * Отримання або генерація CSRF-токена для поточної сесії
     */
    public static function getToken(): string
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if (empty($_SESSION[self::SESSION_KEY])) {
            // Генерація 32 криптографічно безпечних псевдовипадкових байтів
            $_SESSION[self::SESSION_KEY] = bin2hex(random_bytes(32));
        }

        return $_SESSION[self::SESSION_KEY];
    }

    /**
     * Валідація надісланого з форми CSRF-токена
     */
    public static function validate(?string $token): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $sessionToken = $_SESSION[self::SESSION_KEY] ?? null;

        if (!$sessionToken || !$token) {
            return false;
        }

        // Порівняння за сталий час для захисту від Timing Attacks
        return hash_equals($sessionToken, $token);
    }
}
```

---

### Крок 3. Аудит представлень та захист від XSS (функція `e()`)

Фундаментальне правило захисту від XSS: **зберігати дані в базі оригінальними, а екранувати — безпосередньо у момент виведення в HTML**.

Створіть файл допоміжних функцій `src/helpers.php`:

```php
<?php
declare(strict_types=1);

if (!function_exists('e')) {
    /**
     * Безпечне контекстне екранування тексту для виведення в HTML
     */
    function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
```

Додайте автозавантаження файлу функцій у `composer.json` у секцію `autoload`:

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        },
        "files": [
            "src/helpers.php"
        ]
    }
}
```

Після оновлення `composer.json` обов'язково виконайте в терміналі:

```bash
composer dump-autoload
```

#### Впровадження CSRF-токенів та функції `e()` у шаблони

Оновіть файли форм, додавши приховані поля з токеном та виклики `e()`:

Файл `views/tasks/create.php`:

```php
<div class="form-card">
    <h2>Створення нового завдання</h2>

    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?= e($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="POST" action="/tasks/create" class="task-form">
        <!-- Захист від CSRF: передача токена у прихованому полі -->
        <input type="hidden" name="_csrf_token" value="<?= e(\App\Security\CsrfHelper::getToken()) ?>">

        <div class="form-group">
            <label for="title">Назва завдання *</label>
            <input 
                type="text" 
                id="title" 
                name="title" 
                value="<?= e($old['title'] ?? '') ?>" 
                placeholder="Введіть назву завдання..." 
                required 
                autofocus
            >
        </div>

        <div class="form-group">
            <label for="deadline">Дедлайн (необов'язково)</label>
            <input 
                type="datetime-local" 
                id="deadline" 
                name="deadline" 
                value="<?= e($old['deadline'] ?? '') ?>"
            >
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn btn-primary">Зберегти завдання</button>
            <a href="/" class="btn btn-secondary">Скасувати</a>
        </div>
    </form>
</div>
```

Оновіть також форми зміни статусу та видалення у файлі `views/tasks/index.php`, додавши до кожної форми:

```php
<input type="hidden" name="_csrf_token" value="<?= e(\App\Security\CsrfHelper::getToken()) ?>">
```

А також у формі входу `views/auth/login.php`:

```php
<input type="hidden" name="_csrf_token" value="<?= e(\App\Security\CsrfHelper::getToken()) ?>">
```

---

### Крок 4. Оптимізація SQL-вибірок (усунення проблеми N+1 через `JOIN`)

У реальних проєктах список завдань часто повинен відображати ім'я або email автора завдання. Якщо для кожного із 50 завдань робити окремий запит `SELECT username FROM users WHERE id = :user_id`, база даних зазнає 51 запит ($1 + 50$).

Ліквідуємо цей антипатерн, оновивши клас `Task` та метод репозиторію за допомогою SQL `LEFT JOIN`.

#### 1. Додавання поля автора до сутності `Task`

Оновіть `src/Models/Task.php`:

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
        ?string $updatedAt = null,
        public ?string $authorName = null // Додане поле для імені автора зі зв'язку JOIN
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

#### 2. Оновлення методу `findAllByUser` в `TaskRepository`

Оновіть метод у `src/Repositories/TaskRepository.php`, використовуючи об'єднання таблиць:

```php
public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array
{
    $offset = ($page - 1) * $perPage;

    // Один ефективний SQL-запит із об'єднанням таблиць замість N+1 окремих звернень
    $sql = "SELECT 
                t.id, 
                t.user_id, 
                t.title, 
                t.is_completed, 
                t.deadline, 
                t.created_at, 
                t.updated_at,
                u.username AS author_name 
            FROM tasks t 
            LEFT JOIN users u ON t.user_id = u.id 
            WHERE t.user_id = :user_id 
            ORDER BY t.created_at DESC 
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
            updatedAt: $row['updated_at'],
            authorName: $row['author_name'] ?? null
        );
    }

    return $tasks;
}
```

У файлі `views/tasks/index.php` додайте відображення автора у блоці метаданих картки завдання:

```php
<span class="author">👤 Автор: <?= e($task->authorName ?? 'Я') ?></span>
```

---

### Крок 5. Централізоване логування помилок (`Logger`)

Створимо компонент логування, який фіксує всі події та помилки у файл журналу на сервері.

Створіть директорію `storage/logs/` у корені вашого проєкту. Додайте у `.gitignore` рядок:

```gitignore
/storage/logs/*.log
```

Створіть клас `src/Core/Logger.php`:

```php
<?php
declare(strict_types=1);

namespace App\Core;

class Logger
{
    public function __construct(private string $logFilePath)
    {
        $dir = dirname($this->logFilePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    public function info(string $message, array $context = []): void
    {
        $this->log('INFO', $message, $context);
    }

    public function warning(string $message, array $context = []): void
    {
        $this->log('WARNING', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('ERROR', $message, $context);
    }

    private function log(string $level, string $message, array $context = []): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $contextString = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        $entry = sprintf("[%s] [%s] %s%s%s", $timestamp, $level, $message, $contextString, PHP_EOL);

        file_put_contents($this->logFilePath, $entry, FILE_APPEND | LOCK_EX);
    }
}
```

---

### Крок 6. Оновлення контролерів з перевіркою CSRF та автентифікацією

#### 1. Оновлення `BaseController`

Додамо в `src/Controllers/BaseController.php` метод автоматичної валідації CSRF-токена:

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Security\CsrfHelper;
use RuntimeException;

abstract class BaseController
{
    protected function validateCsrf(): void
    {
        $token = $_POST['_csrf_token'] ?? null;

        if (!CsrfHelper::validate($token)) {
            http_response_code(403);
            die('403 Forbidden: Помилка безпеки — недійсний або відсутній CSRF-токен.');
        }
    }

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

#### 2. Оновлення методів у `TaskController`

Додайте виклик `$this->validateCsrf()` на початку кожного методу, що змінює стан даних:

```php
public function store(): void
{
    $this->requireAuth();
    $this->validateCsrf(); // Захист від CSRF-атаки

    $userId = (int) $_SESSION['user_id'];
    $title = $_POST['title'] ?? '';
    $deadline = $_POST['deadline'] ?? '';

    try {
        $this->taskService->createTask($userId, $title, !empty($deadline) ? $deadline : null);
        $this->redirect('/');
    } catch (\InvalidArgumentException $e) {
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
    $this->validateCsrf(); // Захист від CSRF-атаки

    $userId = (int) $_SESSION['user_id'];
    $taskId = (int) ($_POST['id'] ?? 0);

    $this->taskService->toggleTask($taskId, $userId);
    $this->redirect('/');
}

public function delete(): void
{
    $this->requireAuth();
    $this->validateCsrf(); // Захист від CSRF-атаки

    $userId = (int) $_SESSION['user_id'];
    $taskId = (int) ($_POST['id'] ?? 0);

    $this->taskService->deleteTask($taskId, $userId);
    $this->redirect('/');
}
```

#### 3. Оновлення `AuthController` з регенерацією сесії

Оновіть `src/Controllers/AuthController.php`, додавши реальну перевірку через `AuthService` та захист від фіксації сесії (`session_regenerate_id`):

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\AuthService;
use InvalidArgumentException;

class AuthController extends BaseController
{
    public function __construct(
        private AuthService $authService
    ) {}

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
        $this->validateCsrf();

        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');

        try {
            $user = $this->authService->authenticate($username, $password);

            // КРИТИЧНО: Регенерація ідентифікатора сесії для захисту від Session Fixation
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user->id;
            $_SESSION['user_name'] = $user->username;

            $this->redirect('/');
        } catch (InvalidArgumentException $e) {
            $this->render('auth/login', [
                'pageTitle'   => 'Вхід у систему — TaskFlow',
                'error'       => $e->getMessage(),
                'oldUsername' => $username,
            ]);
        }
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

### Крок 7. Налаштування точки входу `public/index.php` (Безпека та Логування)

Оновіть файл `public/index.php`, додавши налаштування безпечних cookies сесії, захисні HTTP-заголовки, глобальний обробник винятків з логуванням та створення екземплярів `AuthService` і `UserRepository`:

```php
<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\TaskController;
use App\Core\Logger;
use App\Models\Database;
use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;
use App\Router;
use App\Services\AuthService;
use App\Services\TaskService;
use Dotenv\Dotenv;

// 1. Автозавантажувач класів Composer
require_once __DIR__ . '/../vendor/autoload.php';

// 2. Завантаження змінних середовища
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$isProduction = ($_ENV['APP_ENV'] ?? 'development') === 'production';

// 3. Ініціалізація централізованого логера
$logger = new Logger(__DIR__ . '/../storage/logs/app.log');

// 4. Глобальний обробник неперехоплених винятків
set_exception_handler(function (\Throwable $e) use ($logger, $isProduction) {
    $logger->error($e->getMessage(), [
        'file'  => $e->getFile(),
        'line'  => $e->getLine(),
        'trace' => $e->getTraceAsString(),
    ]);

    http_response_code(500);

    if (!$isProduction) {
        echo '<h1>500 Internal Server Error (Режим розробки)</h1>';
        echo '<p><strong>Помилка:</strong> ' . e($e->getMessage()) . '</p>';
        echo '<pre>' . e($e->getTraceAsString()) . '</pre>';
    } else {
        echo '<h1>500 — Внутрішня помилка сервера</h1>';
        echo '<p>Вибачте, сталася непередбачена технічна помилка. Спробуйте пізніше.</p>';
    }
});

// 5. Захисні HTTP-заголовки
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

// 6. Безпечна конфігурація cookie сесії (ДО session_start)
session_set_cookie_params([
    'lifetime' => 86400,
    'path'     => '/',
    'domain'   => '',
    'secure'   => $isProduction, // Лише через HTTPS у бойовому режимі
    'httponly' => true,          // Захист від викрадення через XSS
    'samesite' => 'Lax',         // Додатковий захист від CSRF
]);

session_start();

// 7. Створення залежностей (Dependency Injection)
$pdo            = Database::getConnection();
$taskRepository = new TaskRepository($pdo);
$userRepository = new UserRepository($pdo);

$taskService    = new TaskService($taskRepository);
$authService    = new AuthService($userRepository);

$taskController = new TaskController($taskService);
$authController = new AuthController($authService);

// 8. Реєстрація маршрутів
$router = new Router();

$router->get('/',                 [$taskController, 'index']);
$router->get('/tasks/create',     [$taskController, 'create']);
$router->post('/tasks/create',    [$taskController, 'store']);
$router->post('/tasks/complete',  [$taskController, 'complete']);
$router->post('/tasks/delete',    [$taskController, 'delete']);

$router->get('/login',            [$authController, 'showLogin']);
$router->post('/login',           [$authController, 'login']);
$router->get('/logout',           [$authController, 'logout']);

// 9. Запуск обробки HTTP-запиту
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
```

---

### Крок 8. Фіналізація та підготовка до виробничого середовища (Production)

Перед розгортанням веб-застосунку на бойовому сервері необхідно виконати оптимізацію автозавантажувача Composer:

```bash
composer install --no-dev --optimize-autoloader
```

Значення прапорців:
- `--no-dev` — не завантажує пакети, потрібні лише для розробки та тестів;
- `--optimize-autoloader` — перетворює правила пошуку PSR-4 у швидку статичну карту класів (classmap), значно прискорюючи час відгуку сервера.

---

### Крок 9. Комплексне тестування безпеки проєкту

Проведіть тестування системи на стійкість до типових атак:

1. **Тестування автентифікації**:
   - Спробуйте увійти з логіном `admin` та неправильним паролем `12345`. Переконайтеся, що система відхиляє запит із повідомленням *«Невірне ім'я користувача або пароль.»*
   - Увійдіть із правильним паролем `secret123`. Переконайтеся в успішному вході та переході до списку завдань.

2. **Тестування захисту від CSRF**:
   - Відкрийте в браузері інструменти розробника (F12) на сторінці створення завдання.
   - Знайдіть приховане поле `<input type="hidden" name="_csrf_token" ...>` та навмисно змініть його значення на довільний текст або видаліть.
   - Спробуйте зберегти форму. Переконайтеся, що сервер негайно блокує запит з HTTP-кодом `403 Forbidden`.

3. **Тестування захисту від XSS**:
   - Створіть завдання із назвою: `<script>alert('XSS Attack!')</script>`.
   - Переконайтеся, що спливаюче вікно `alert` не з'являється, а на сторінці відображається безпечний текст завдяки роботі функції `e()`.

4. **Тестування логування помилок**:
   - Перевірте файл `storage/logs/app.log`. Переконайтеся, що логи записуються у форматі `[ДАТА] [РІВЕНЬ] Повідомлення`.

---

### Контрольні запитання

1. Чому використання алгоритмів MD5 та SHA-256 є неприпустимим для збереження паролів, і завдяки яким властивостям алгоритм Bcrypt (`password_hash`) ефективно протидіє зламу на відеокартах (GPU)?
2. Поясніть механізм атаки Cross-Site Request Forgery (CSRF). Як патерн Synchronizer Token Pattern захищає POST-запити, і чому токени обов'язково перевіряти через `hash_equals()`?
3. У чому полягає різниця між збереженим (Stored) та відображеним (Reflected) XSS? Чому дані слід екранувати безпосередньо у представленні (View), а не перед збереженням у базу?
4. Яку загрозу несе атака Session Fixation (фіксація сесії)? Яка функція PHP і в який конкретний момент часу запобігає цій атаці?
5. Що таке проблема N+1 запитів до бази даних і яким чином використання оператора SQL `LEFT JOIN` у `TaskRepository` дозволяє її усунути?

---

### Вимоги до звіту

1. У файл `lab16.md` вашого репозиторію додати лістинг класу безпеки `src/Security/CsrfHelper.php`.
2. Додати лістинг оновленого методу `findAllByUser()` класу `TaskRepository.php` з демонстрацією використання SQL `JOIN`.
3. Додати скриншот браузера з успішною авторизацією користувача під хешованим паролем Bcrypt.
4. Додати скриншот браузера з помилкою `403 Forbidden` при спробі відправки форми з невалідним CSRF-токеном.
5. Додати фрагмент вмісту файлу логу `storage/logs/app.log`.
6. У файлі `lab16.md` надати стислі, але аргументовані письмові відповіді на всі контрольні запитання.
7. Надіслати посилання на завершений GitHub-репозиторій проєкту «Менеджер завдань» на перевірку.
