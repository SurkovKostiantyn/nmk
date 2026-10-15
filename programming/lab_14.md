# Лабораторна робота №14 (2 години)

**Тема:** Архітектурний рефакторинг застосунку на патерн MVC та маршрутизація.  
Повний перехід від монолітного процедурного скрипта `index.php` до трирівневої архітектури Model-View-Controller (MVC): реорганізація файлової структури з винесенням публічного каталогу `public/`, створення єдиної точки входу (Front Controller), розробка власного класу маршрутизатора (`Router`) та відокремлення HTML-шаблонів представлення (`View`).

**Мета:** Опанувати принципи архітектурного проєктування веб-застосунків на основі патерну MVC. Навчитися ізолювати публічні статичні файли від серверного коду, реалізовувати єдину точку входу (Front Controller), створювати гнучку систему маршрутизації HTTP-запитів (Router), виносити логіку обробки запитів у спеціалізовані контролери (`TaskController`, `AuthController`) та відокремлювати шар представлення через шаблони з базовим макетом (Layout).

**Технологічний стек:** PHP 8.1+, архітектурний патерн MVC (Model-View-Controller), Front Controller, Router, HTTP-методи (GET, POST), URL-диспатчинг, буферизація виводу (`ob_start`, `ob_get_clean`), Apache `mod_rewrite` (`.htaccess`), вбудований веб-сервер PHP CLI.

## Завдання

Основні завдання лабораторної роботи:
- реорганізація структури проєкту - розділити кодову базу на окремі каталоги `public/` (публічна точка входу та статика), `src/` (класи моделей, контролерів та репозиторіїв) і `views/` (шаблони сторінок та макети);
- створення власного маршрутизатора - розробити клас `Router` для реєстрації маршрутів методів GET та POST, очищення URI від GET-параметрів, виклику відповідних методів контролерів та коректної обробки помилки 404;
- базовий контролер та механізм рендерингу - створити клас `BaseController` з методами буферизованого підключення шаблонів `render()` у спільний макет `main.php`, безпечного перенаправлення `redirect()` та контролю доступу `requireAuth()`;
- декомпозиція логіки контролерів - створити `TaskController` для управління життєвим циклом завдань (перегляд списку з пагінацією, форма створення, збереження, зміна статусу, видалення) та `AuthController` для автентифікації користувача;
- відокремлення шару представлення - замінити прямий вивід HTML на модульні шаблони: базовий макет `views/layouts/main.php`, сторінку списку `views/tasks/index.php`, форму створення `views/tasks/create.php` та форму входу `views/auth/login.php`;
- конфігурація веб-сервера - налаштувати файл `public/.htaccess` для перенаправлення запитів на `index.php` та перевірити роботу застосунку через вбудований веб-сервер PHP CLI.

## Хід виконання роботи

> Базою для виконання цієї роботи є реалізовані у лабораторній роботі №13 класи: `Database`, `Task`, `TaskRepository`, `TaskStorageInterface`, `TimestampableTrait` та класи винятків.

---

### Крок 1. Проєктування нової структури каталогів проєкту (MVC)

У лабораторній роботі №13 файл `index.php` містив одночасно обробку маршрутів, сесій, виклики репозиторію та майже двісті рядків змішаної HTML-розмітки. Для переходу на MVC реорганізуємо файлову структуру:

```
task-manager/
├── public/                       ← Корінь веб-сервера (DocumentRoot)
│   ├── .htaccess                 ← Перенаправлення запитів на index.php
│   ├── index.php                 ← Front Controller (єдина точка входу)
│   └── assets/
│       └── css/
│           └── style.css         ← Стилі оформлення
├── src/                          ← Бекенд-код (недоступний через браузер)
│   ├── Controllers/
│   │   ├── BaseController.php
│   │   ├── TaskController.php
│   │   └── AuthController.php
│   ├── Models/
│   │   ├── Task.php
│   │   ├── TimestampableTrait.php
│   │   └── Database.php
│   ├── Repositories/
│   │   ├── TaskStorageInterface.php
│   │   └── TaskRepository.php
│   ├── Exceptions/
│   │   ├── TaskManagerException.php
│   │   ├── ValidationException.php
│   │   └── TaskNotFoundException.php
│   └── Router.php                ← Компонент маршрутизації
└── views/                        ← Шаблони представлення (HTML)
    ├── layouts/
    │   └── main.php              ← Базовий каркас сторінки
    ├── tasks/
    │   ├── index.php             ← Список завдань з пагінацією
    │   └── create.php            ← Форма додавання завдання
    └── auth/
        └── login.php             ← Форма авторизації
```

Створіть відповідні папки у корені вашого проєкту. Перемістіть раніше створені файли:
- класи `Task.php`, `TimestampableTrait.php`, `Database.php` перемістіть у каталог `src/Models/`;
- файли `TaskStorageInterface.php` та `TaskRepository.php` перемістіть у каталог `src/Repositories/`;
- файли винятків перемістіть у каталог `src/Exceptions/`.

---

### Крок 2. Реалізація компонента маршрутизації (`Router`)

Маршрутизатор зіставляє HTTP-метод (`GET`, `POST`) та шлях запиту (`URI`) з відповідним класом контролера та його методом.

Створіть файл `src/Router.php`:

```php
<?php
declare(strict_types=1);

class Router
{
    /**
     * Таблиця зареєстрованих маршрутів: [МЕТОД => [ШЛЯХ => [КласКонтролера, Метод]]]
     * @var array<string, array<string, array{0: string, 1: string}>>
     */
    private array $routes = [];

    /**
     * Реєстрація GET-маршруту
     *
     * @param string $uri
     * @param array{0: string, 1: string} $action
     */
    public function get(string $uri, array $action): void
    {
        $this->routes['GET'][$uri] = $action;
    }

    /**
     * Реєстрація POST-маршруту
     *
     * @param string $uri
     * @param array{0: string, 1: string} $action
     */
    public function post(string $uri, array $action): void
    {
        $this->routes['POST'][$uri] = $action;
    }

    /**
     * Диспетчеризація вхідного HTTP-запиту
     *
     * @param string $method HTTP-метод (GET, POST тощо)
     * @param string $uri Повний URI запиту
     */
    public function dispatch(string $method, string $uri): void
    {
        // Відокремлюємо шлях від GET-параметрів (/tasks?page=2 -> /tasks)
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        // Нормалізуємо шлях: видаляємо зайвий слеш у кінці, крім кореня
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        $method = strtoupper($method);

        // Перевіряємо наявність маршруту в таблиці
        if (!isset($this->routes[$method][$path])) {
            $this->handleNotFound($method, $path);
            return;
        }

        [$controllerClass, $actionMethod] = $this->routes[$method][$path];

        if (!class_exists($controllerClass)) {
            throw new RuntimeException("Клас контролера '{$controllerClass}' не знайдено.");
        }

        $controller = new $controllerClass();

        if (!method_exists($controller, $actionMethod)) {
            throw new RuntimeException("Метод '{$actionMethod}' не знайдено в класі '{$controllerClass}'.");
        }

        // Викликаємо відповідну дію контролера
        $controller->$actionMethod();
    }

    /**
     * Відображення стандартної сторінки помилки 404
     */
    private function handleNotFound(string $method, string $path): void
    {
        http_response_code(404);
        ?>
        <!DOCTYPE html>
        <html lang="uk">
        <head>
            <meta charset="UTF-8">
            <title>404 — Сторінку не знайдено</title>
            <style>
                body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; display: grid; place-content: center; min-height: 100vh; margin: 0; text-align: center; }
                h1 { font-size: 3rem; margin: 0 0 10px; color: #ef4444; }
                p { font-size: 1.1rem; color: #64748b; margin-bottom: 20px; }
                a { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; }
                a:hover { background: #2563eb; }
                code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>404</h1>
            <p>Маршрут <code><?= htmlspecialchars($method) ?> <?= htmlspecialchars($path) ?></code> не зареєстровано в системі.</p>
            <a href="/">Повернутися на головну</a>
        </body>
        </html>
        <?php
    }
}
```

---

### Крок 3. Створення базового контролера (`BaseController`)

Базовий контролер містить спільний функціонал: рендеринг представлень у загальний шаблон через механізм буферизації виводу (`ob_start` / `ob_get_clean`), допоміжний метод безпечного перенаправлення та перевірку авторизації.

Створіть файл `src/Controllers/BaseController.php`:

```php
<?php
declare(strict_types=1);

abstract class BaseController
{
    /**
     * Рендеринг шаблону всередині базового макета (Layout)
     *
     * @param string $view Відносний шлях до файлу шаблону (наприклад, 'tasks/index')
     * @param array<string, mixed> $data Змінні, що передаються у представлення
     */
    protected function render(string $view, array $data = []): void
    {
        // Перетворюємо ключі асоціативного масиву на окремі локальні змінні
        extract($data);

        $viewFile = __DIR__ . '/../../views/' . $view . '.php';

        if (!file_exists($viewFile)) {
            throw new RuntimeException("Файл представлення не знайдено: {$viewFile}");
        }

        // Запускаємо буферизацію виводу для отримання згенерованого HTML сторінки
        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        // Підключаємо загальний макет, куди підставляється змінна $content
        $layoutFile = __DIR__ . '/../../views/layouts/main.php';

        if (!file_exists($layoutFile)) {
            throw new RuntimeException("Файл макета не знайдено: {$layoutFile}");
        }

        require $layoutFile;
    }

    /**
     * Перенаправлення користувача на інший URL
     */
    protected function redirect(string $url): void
    {
        header("Location: {$url}");
        exit;
    }

    /**
     * Перевірка автентифікації користувача
     */
    protected function requireAuth(): void
    {
        if (empty($_SESSION['user_id'])) {
            $this->redirect('/login');
        }
    }
}
```

---

### Крок 4. Створення шаблонів представлення (`View`)

Відокремимо візуальну розмітку від логіки. Створимо базовий макет сторінки та представлення для завдань і авторизації.

#### 1. Базовий макет `views/layouts/main.php`

Створіть файл `views/layouts/main.php`:

```php
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'Менеджер завдань') ?></title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <header class="app-header">
        <div class="header-container">
            <a href="/" class="app-logo">TaskFlow MVC</a>
            <nav class="app-nav">
                <?php if (!empty($_SESSION['user_id'])): ?>
                    <a href="/">Мої завдання</a>
                    <a href="/tasks/create" class="btn-nav">+ Створити завдання</a>
                    <span class="user-greeting">Привіт, <strong><?= htmlspecialchars($_SESSION['user_name'] ?? 'Користувач') ?></strong></span>
                    <a href="/logout" class="nav-logout">Вийти</a>
                <?php else: ?>
                    <a href="/login">Увійти</a>
                <?php endif; ?>
            </nav>
        </div>
    </header>

    <main class="app-content">
        <?= $content ?>
    </main>

    <footer class="app-footer">
        <p>&copy; <?= date('Y') ?> «Менеджер завдань» на базі PHP MVC</p>
    </footer>
</body>
</html>
```

#### 2. Список завдань з пагінацією `views/tasks/index.php`

Створіть файл `views/tasks/index.php`:

```php
<div class="tasks-header">
    <h2>Список моїх завдань</h2>
    <a href="/tasks/create" class="btn btn-primary">+ Нове завдання</a>
</div>

<?php if (empty($tasks)): ?>
    <div class="empty-state">
        <p>У вас ще немає створених завдань.</p>
        <a href="/tasks/create">Створіть своє перше завдання прямо зараз!</a>
    </div>
<?php else: ?>
    <div class="tasks-list">
        <?php foreach ($tasks as $task): ?>
            <div class="task-card <?= $task->isCompleted ? 'is-done' : '' ?>">
                <div class="task-info">
                    <h3 class="task-title"><?= htmlspecialchars($task->title) ?></h3>
                    <div class="task-meta">
                        <?php if ($task->deadline): ?>
                            <span class="deadline">📅 Дедлайн: <?= htmlspecialchars($task->deadline) ?></span>
                        <?php endif; ?>
                        <span class="badge <?= $task->isCompleted ? 'badge-success' : 'badge-pending' ?>">
                            <?= $task->isCompleted ? 'Виконано' : 'В процесі' ?>
                        </span>
                    </div>
                </div>

                <div class="task-actions">
                    <form method="POST" action="/tasks/complete" style="display:inline">
                        <input type="hidden" name="id" value="<?= $task->id ?>">
                        <button type="submit" class="btn btn-icon btn-toggle" title="Змінити статус">
                            <?= $task->isCompleted ? '↩ Відновити' : '✓ Завершити' ?>
                        </button>
                    </form>

                    <form method="POST" action="/tasks/delete" style="display:inline">
                        <input type="hidden" name="id" value="<?= $task->id ?>">
                        <button type="submit" class="btn btn-icon btn-delete" onclick="return confirm('Видалити завдання?')" title="Видалити">
                            ✕
                        </button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

    <?php if ($totalPages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="/?page=<?= $page - 1 ?>" class="page-link">« Попередня</a>
            <?php endif; ?>

            <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                <?php if ($i === $page): ?>
                    <span class="page-link active"><?= $i ?></span>
                <?php else: ?>
                    <a href="/?page=<?= $i ?>" class="page-link"><?= $i ?></a>
                <?php endif; ?>
            <?php endfor; ?>

            <?php if ($page < $totalPages): ?>
                <a href="/?page=<?= $page + 1 ?>" class="page-link">Наступна »</a>
            <?php endif; ?>
        </div>
    <?php endif; ?>
<?php endif; ?>
```

#### 3. Форма додавання завдання `views/tasks/create.php`

Створіть файл `views/tasks/create.php`:

```php
<div class="form-card">
    <h2>Створення нового завдання</h2>

    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="POST" action="/tasks/create" class="task-form">
        <div class="form-group">
            <label for="title">Назва завдання *</label>
            <input 
                type="text" 
                id="title" 
                name="title" 
                value="<?= htmlspecialchars($old['title'] ?? '') ?>" 
                placeholder="Введіть суть завдання..." 
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
                value="<?= htmlspecialchars($old['deadline'] ?? '') ?>"
            >
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn btn-primary">Зберегти завдання</button>
            <a href="/" class="btn btn-secondary">Скасувати</a>
        </div>
    </form>
</div>
```

#### 4. Сторінка авторизації `views/auth/login.php`

Створіть файл `views/auth/login.php`:

```php
<div class="auth-card">
    <h2>Вхід у систему</h2>
    <p class="auth-subtitle">Будь ласка, авторизуйтесь для доступу до завдань</p>

    <?php if (!empty($error)): ?>
        <div class="alert alert-danger">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" action="/login" class="auth-form">
        <div class="form-group">
            <label for="username">Логін або Email</label>
            <input 
                type="text" 
                id="username" 
                name="username" 
                value="<?= htmlspecialchars($oldUsername ?? 'admin') ?>" 
                required 
                autofocus
            >
        </div>

        <div class="form-group">
            <label for="password">Пароль</label>
            <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="Введіть будь-який пароль (тестовий режим)" 
                required
            >
        </div>

        <button type="submit" class="btn btn-primary btn-block">Увійти</button>
    </form>
</div>
```

---

### Крок 5. Реалізація контролерів `TaskController` та `AuthController`

#### 1. Контролер завдань `src/Controllers/TaskController.php`

Створіть файл `src/Controllers/TaskController.php`:

```php
<?php
declare(strict_types=1);

class TaskController extends BaseController
{
    private TaskStorageInterface $repository;

    public function __construct()
    {
        $pdo = Database::getConnection();
        $this->repository = new TaskRepository($pdo);
    }

    /**
     * Головна сторінка: список завдань поточного користувача
     */
    public function index(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = 5;

        $tasks = $this->repository->findAllByUser($userId, $page, $perPage);
        $totalTasks = $this->repository->countByUser($userId);
        $totalPages = (int) ceil($totalTasks / $perPage);

        $this->render('tasks/index', [
            'pageTitle'  => 'Мої завдання — TaskFlow',
            'tasks'      => $tasks,
            'page'       => $page,
            'totalPages' => $totalPages,
            'totalTasks' => $totalTasks,
        ]);
    }

    /**
     * Відображення форми створення нового завдання
     */
    public function create(): void
    {
        $this->requireAuth();

        $this->render('tasks/create', [
            'pageTitle' => 'Нове завдання — TaskFlow',
            'errors'    => [],
            'old'       => [],
        ]);
    }

    /**
     * Обробка відправки форми та збереження завдання
     */
    public function store(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $title = trim($_POST['title'] ?? '');
        $deadlineRaw = trim($_POST['deadline'] ?? '');
        $deadline = !empty($deadlineRaw) ? $deadlineRaw : null;

        $errors = [];

        if (mb_strlen($title) < 3) {
            $errors[] = 'Назва завдання має містити щонайменше 3 символи.';
        }

        if (!empty($errors)) {
            $this->render('tasks/create', [
                'pageTitle' => 'Нове завдання — TaskFlow',
                'errors'    => $errors,
                'old'       => ['title' => $title, 'deadline' => $deadlineRaw],
            ]);
            return;
        }

        $this->repository->add($userId, $title, $deadline);
        $this->redirect('/');
    }

    /**
     * Перемикання статусу виконання завдання
     */
    public function complete(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $taskId = (int) ($_POST['id'] ?? 0);

        if ($taskId > 0) {
            $this->repository->complete($taskId, $userId);
        }

        $this->redirect('/');
    }

    /**
     * Видалення завдання
     */
    public function delete(): void
    {
        $this->requireAuth();

        $userId = (int) $_SESSION['user_id'];
        $taskId = (int) ($_POST['id'] ?? 0);

        if ($taskId > 0) {
            $this->repository->delete($taskId, $userId);
        }

        $this->redirect('/');
    }
}
```

#### 2. Контролер авторизації `src/Controllers/AuthController.php`

Створіть файл `src/Controllers/AuthController.php`:

```php
<?php
declare(strict_types=1);

class AuthController extends BaseController
{
    /**
     * Відображення форми входу
     */
    public function showLogin(): void
    {
        // Якщо користувач уже авторизований — відправляємо на головну
        if (!empty($_SESSION['user_id'])) {
            $this->redirect('/');
        }

        $this->render('auth/login', [
            'pageTitle' => 'Вхід у систему — TaskFlow',
            'error'     => null,
        ]);
    }

    /**
     * Обробка авторизації користувача
     */
    public function login(): void
    {
        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');

        if (empty($username) || empty($password)) {
            $this->render('auth/login', [
                'pageTitle'   => 'Вхід у систему — TaskFlow',
                'error'       => 'Будь ласка, заповніть усі поля форми.',
                'oldUsername' => $username,
            ]);
            return;
        }

        // У навчальних цілях для ЛР №14 встановлюємо сесію користувача id=1
        // Повна верифікація паролів через password_verify() реалізується в ЛР №16
        $_SESSION['user_id'] = 1;
        $_SESSION['user_name'] = htmlspecialchars($username);

        $this->redirect('/');
    }

    /**
     * Завершення сесії користувача (Logout)
     */
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

### Крок 6. Створення стилів CSS (`public/assets/css/style.css`)

Створіть файл `public/assets/css/style.css` для візуального оформлення веб-інтерфейсу:

```css
:root {
    --primary: #3b82f6;
    --primary-hover: #2563eb;
    --bg-body: #f1f5f9;
    --surface: #ffffff;
    --text-main: #0f172a;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --danger: #ef4444;
    --success: #10b981;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg-body);
    color: var(--text-main);
    line-height: 1.5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header */
.app-header { background: var(--surface); border-bottom: 1px solid var(--border); }
.header-container { max-width: 900px; margin: 0 auto; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
.app-logo { font-size: 1.25rem; font-weight: 700; color: var(--primary); text-decoration: none; }
.app-nav { display: flex; gap: 16px; align-items: center; }
.app-nav a { text-decoration: none; color: var(--text-muted); font-size: 0.95rem; }
.app-nav a:hover { color: var(--primary); }
.user-greeting { font-size: 0.9rem; color: var(--text-muted); padding: 0 8px; border-left: 1px solid var(--border); }
.nav-logout { color: var(--danger) !important; }

/* Main Content */
.app-content { max-width: 900px; width: 100%; margin: 30px auto; padding: 0 20px; flex: 1; }

/* Tasks Header */
.tasks-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }

/* Task Card */
.tasks-list { display: flex; flex-direction: column; gap: 12px; }
.task-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.2s, box-shadow 0.2s; }
.task-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
.task-card.is-done { opacity: 0.65; background: #f8fafc; }
.task-card.is-done .task-title { text-decoration: line-through; color: var(--text-muted); }
.task-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 6px; }
.task-meta { display: flex; gap: 12px; align-items: center; font-size: 0.85rem; color: var(--text-muted); }

/* Badges */
.badge { padding: 3px 8px; border-radius: 9999px; font-weight: 500; font-size: 0.75rem; }
.badge-success { background: #dcfce7; color: #15803d; }
.badge-pending { background: #fef3c7; color: #b45309; }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-size: 0.95rem; font-weight: 500; text-decoration: none; border: 1px solid transparent; cursor: pointer; }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: #e2e8f0; color: var(--text-main); }
.btn-secondary:hover { background: #cbd5e1; }
.btn-icon { background: none; border: 1px solid var(--border); padding: 6px 12px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; }
.btn-toggle:hover { background: #f0fdf4; border-color: var(--success); color: var(--success); }
.btn-delete:hover { background: #fef2f2; border-color: var(--danger); color: var(--danger); }
.btn-block { width: 100%; margin-top: 10px; }

/* Pagination */
.pagination { display: flex; justify-content: center; gap: 6px; margin-top: 30px; }
.page-link { padding: 6px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; text-decoration: none; color: var(--text-main); font-size: 0.9rem; }
.page-link:hover { background: #e2e8f0; }
.page-link.active { background: var(--primary); color: white; border-color: var(--primary); }

/* Forms & Cards */
.form-card, .auth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 6px; }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; outline: none; }
.form-group input:focus { border-color: var(--primary); ring: 2px rgba(59,130,246,0.2); }
.form-buttons { display: flex; gap: 12px; margin-top: 24px; }

/* Alerts */
.alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
.alert-danger { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.alert-danger ul { padding-left: 20px; }

/* Empty state */
.empty-state { text-align: center; padding: 50px 20px; background: var(--surface); border-radius: 8px; border: 1px dashed var(--border); color: var(--text-muted); }
.empty-state a { color: var(--primary); text-decoration: none; display: inline-block; margin-top: 10px; }

/* Footer */
.app-footer { text-align: center; padding: 20px; font-size: 0.85rem; color: var(--text-muted); border-top: 1px solid var(--border); background: var(--surface); }
```

---

### Крок 7. Створення єдиної точки входу (`public/index.php`) та налаштування веб-сервера

Створимо файл `public/index.php`, через який проходять усі клієнтські запити:

```php
<?php
declare(strict_types=1);

// Реєструємо простий завантажувач класів (до інтеграції Composer у ЛР №15)
spl_autoload_register(function (string $class): void {
    $paths = [
        __DIR__ . '/../src/',
        __DIR__ . '/../src/Controllers/',
        __DIR__ . '/../src/Models/',
        __DIR__ . '/../src/Repositories/',
        __DIR__ . '/../src/Exceptions/',
    ];

    foreach ($paths as $path) {
        $file = $path . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Старт сесії користувача
session_start();

// Ініціалізація маршрутизатора
$router = new Router();

// Реєстрація маршрутів для завдань
$router->get('/',                 [TaskController::class, 'index']);
$router->get('/tasks/create',     [TaskController::class, 'create']);
$router->post('/tasks/create',    [TaskController::class, 'store']);
$router->post('/tasks/complete',  [TaskController::class, 'complete']);
$router->post('/tasks/delete',    [TaskController::class, 'delete']);

// Реєстрація маршрутів автентифікації
$router->get('/login',            [AuthController::class, 'showLogin']);
$router->post('/login',           [AuthController::class, 'login']);
$router->get('/logout',           [AuthController::class, 'logout']);

// Запуск обробки запиту
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
```

Створіть файл `public/.htaccess` для налаштування сервера Apache:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

Для запуску проєкту без стороннього Apache-сервера скористайтеся вбудованим сервером PHP CLI, вказавши корінь у каталозі `public/`:

```bash
# Виконайте в терміналі з кореня вашого репозиторію task-manager:
php -S localhost:8000 -t public
```

Після виконання цієї команди перейдіть у браузері за адресою: `http://localhost:8000`.

---

### Крок 8. Тестування та верифікація функціоналу

Для перевірки виконаної роботи протестуйте такі сценарії:
- перевірка захисту маршрутів - відкрийте нову вкладку браузера в режимі інкогніто і перейдіть за адресою `http://localhost:8000/`; застосунок має автоматично перенаправити вас на `/login`;
- перевірка входу - введіть ім'я користувача (наприклад, `admin`) та натисніть «Увійти»; система має зберегти сесію та перенаправити вас до списку завдань на `/`;
- створення завдання - натисніть «+ Нове завдання», перевірте роботу валідації (спробуйте надіслати порожню назву), потім введіть коректні дані та збережіть;
- зміна статусу та видалення - натисніть кнопки «✓ Завершити» та «✕», переконавшись, що POST-запити через маршрутизатор коректно змінюють дані в базі;
- пагінація - перевірте коректність перемикання сторінок `/?page=1` та `/?page=2` (за наявності понад 5 завдань);
- обробка неіснуючих сторінок - спробуйте ввести в адресному рядку `http://localhost:8000/unknown/page`; переконайтеся, що відображається стилізована сторінка з HTTP-кодом 404;
- захист конфіденційних директорій - спробуйте відкрити у браузері `http://localhost:8000/../src/Router.php` або `http://localhost:8000/src/`; переконайтеся, що файли за межами каталогу `public/` є недоступними для прямого завантаження.

---

### Контрольні запитання

1. Опишіть призначення трьох складових архітектурного патерну MVC (Model-View-Controller) та їхню взаємодію у процесі обробки HTTP-запиту.
2. Що таке концепція Front Controller? Які ключові переваги вона надає порівняно зі структурою, де кожній веб-сторінці відповідає окремий PHP-файл?
3. Чому конфігурація веб-сервера (`DocumentRoot`) повинна вказувати виключно на каталог `public/`, а директорії `src/` та `views/` мають знаходитися за його межами?
4. Як працює компонент `Router`? Поясніть, навіщо перед пошуком маршруту в таблиці виконувати виклик функції `parse_url($uri, PHP_URL_PATH)`.
5. Поясніть механізм рендерингу представлення за допомогою функцій `extract($data)` та буферизації виводу `ob_start()` / `ob_get_clean()`. Чому цей підхід дозволяє зберегти шаблони «чистими» від бізнес-логіки?

---

### Вимоги до звіту

1. У файл `lab14.md` вашого репозиторію додати фрагменти коду створеного маршрутизатора `Router.php` (метод `dispatch()`) та базового контролера `BaseController.php` (метод `render()`).
2. Додати скриншот структури каталогів проєкту у файловому дереві IDE, де чітко видно поділ на `public/`, `src/` та `views/`.
3. Додати скриншот браузера зі списком завдань за маршрутом `/` після успішної авторизації.
4. Додати скриншот браузера зі сторінкою 404 при спробі переходу за неіснуючим маршрутом.
5. У файлі `lab14.md` надати стислі, але аргументовані письмові відповіді на всі контрольні запитання.
6. Надіслати посилання на GitHub-репозиторій із виконаною лабораторною роботою на перевірку.
