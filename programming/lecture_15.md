# Лекція 15 (2 години). Шаблонізатори, Composer та сучасні сервісні патерни

## План лекції

1. Проблеми нативних PHP-шаблонів та шаблонізатори (Twig).
2. Composer: менеджер залежностей PHP.
3. Автозавантаження класів та стандарт PSR-4.
4. Простори імен (`namespace`) та `use`.
5. Dependency Injection (DI): чому `new` у конструкторі — це погано.
6. Service Layer: виділення бізнес-логіки в окремий шар.

## Перелік умовних скорочень

- **Composer** — менеджер залежностей для PHP; завантажує та оновлює сторонні бібліотеки.
- **`composer.json`** — маніфест проєкту; описує залежності та правила автозавантаження.
- **`vendor/`** — директорія, куди Composer завантажує всі сторонні пакети.
- **PSR** — PHP Standards Recommendations; рекомендації групи PHP-FIG щодо стандартизації коду.
- **PSR-4** — стандарт автозавантаження класів: простір імен `App\Controllers` → директорія `src/Controllers/`.
- **Namespace** — простір імен; логічна «папка» для класів, що запобігає конфліктам імен.
- **DI** — Dependency Injection (впровадження залежностей); патерн, за якого залежності передаються в клас ззовні, а не створюються всередині.
- **Service Layer** — шар бізнес-логіки між контролером і репозиторієм.
- **Twig** — популярний PHP-шаблонізатор від Symfony; відокремлює логіку від HTML.

## Вступ

У попередній лекції ми організували код за патерном MVC. Але в нашому проєкті досі є кілька «больових точок»: PHP-шаблони дозволяють писати будь-який код у View, контролери самі створюють залежності через `new`, а бізнес-правила розкидані між контролером та репозиторієм. У цій лекції ми розберемо інструменти, якими сучасний PHP-розробник вирішує ці проблеми: **Composer** як стандарт де-факто для управління пакетами, **PSR-4** як правило для автозавантаження класів, **Dependency Injection** як патерн для розв'язування залежностей між класами та **Service Layer** для ізоляції бізнес-логіки.

---

## 1. Проблеми нативних PHP-шаблонів та шаблонізатори

### Що не так зі звичайними PHP-шаблонами?

Нативний PHP-шаблон технічно дозволяє писати будь-який код:

```php
<!-- views/tasks/index.php -->
<?php
// Ніщо не заважає написати запит до бази прямо у View!
$tasks = $pdo->query('SELECT * FROM tasks')->fetchAll();
?>
<h1>Завдання</h1>
<?php foreach ($tasks as $task): ?>
    <p><?= $task['title'] ?></p>
<?php endforeach; ?>
```

Мова PHP сама по собі не забороняє змішувати логіку і шаблони. Потрібна **дисципліна** або **інструмент**, який робить це неможливим.

### Шаблонізатор Twig

**Twig** — це окрема мова шаблонів, яку не можна виконати як PHP. У ній просто **немає** можливості зробити запит до бази або викликати `$_POST`:

```twig
{# views/tasks/index.html.twig #}
{% extends 'layouts/main.html.twig' %}

{% block content %}
<h1>Мої завдання</h1>

{% if tasks is empty %}
    <p>Завдань поки немає.</p>
{% else %}
    {% for task in tasks %}
        <div class="task-card">
            <strong>{{ task.title | e }}</strong>
            <span class="badge">{{ task.statusLabel }}</span>
        </div>
    {% endfor %}
{% endif %}
{% endblock %}
```

Порівняння нативного PHP-шаблону з Twig:

| Можливість              | Нативний PHP | Twig        |
|-------------------------|:------------:|:-----------:|
| Запит до бази у шаблоні | ✅ Можна     | ❌ Неможливо |
| Автоекранування XSS     | ❌ Ручне     | ✅ Увімкнено за замовчуванням |
| Наслідування макетів    | ⚠️ Через require | ✅ `{% extends %}` |
| Читабельність для HTML-верстальника | ⚠️ Середня | ✅ Висока |

У цьому курсі ми не будемо переходити повністю на Twig — у лабораторній роботі залишимо нативні PHP-шаблони. Але розуміти, навіщо існують шаблонізатори, важливо для майбутньої роботи.

---

## 2. Composer: менеджер залежностей PHP

### Що таке Composer і навіщо він потрібен?

До Composer PHP-розробники копіювали чужі бібліотеки руками: завантажували ZIP-архів, розпаковували у проєкт, підключали через `require_once`. Це мало купу проблем:

- важко оновлювати бібліотеки (треба знову завантажувати вручну);
- конфлікти версій (бібліотека A вимагає бібліотеку C версії 1.x, бібліотека B — версії 2.x);
- відсутність стандартного способу підключення (автозавантаження).

**Composer** вирішує всі ці проблеми: він читає файл `composer.json`, завантажує потрібні пакети з репозиторію [packagist.org](https://packagist.org), перевіряє сумісність версій і генерує єдиний файл автозавантаження.

### Встановлення Composer

```bash
# Перевірити, чи встановлений Composer
composer --version

# Якщо не встановлений, завантажити з https://getcomposer.org/
```

### Структура `composer.json`

```json
{
    "name": "student/task-manager",
    "description": "Менеджер завдань — навчальний проєкт",
    "type": "project",
    "require": {
        "php": ">=8.1",
        "vlucas/phpdotenv": "^5.5",
        "twig/twig": "^3.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^10.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "Tests\\": "tests/"
        }
    }
}
```

Ключі:
- `require` — пакети, потрібні для **роботи** застосунку;
- `require-dev` — пакети, потрібні лише для **розробки** (тести, дебаг);
- `autoload.psr-4` — правила автозавантаження класів.

### Основні команди Composer

```bash
# Встановити всі залежності з composer.json (після клонування проєкту)
composer install

# Додати новий пакет до залежностей
composer require vlucas/phpdotenv

# Оновити всі пакети до останніх версій
composer update

# Оновити автозавантажувач (після додавання нових просторів імен)
composer dump-autoload
```

### Файли, які не потрібно комітити в Git

```gitignore
# .gitignore
/vendor/          # Генерується через composer install
.env              # Паролі та конфіг оточення
composer.lock     # Можна комітити — фіксує точні версії пакетів
```

---

## 3. Автозавантаження класів та стандарт PSR-4

### Проблема: ручне підключення файлів

До автозавантаження кожен новий клас треба підключати вручну:

```php
<?php
// Кожен require — це ручна робота і джерело помилок
require_once __DIR__ . '/src/Models/Task.php';
require_once __DIR__ . '/src/Repositories/TaskRepository.php';
require_once __DIR__ . '/src/Controllers/TaskController.php';
require_once __DIR__ . '/src/Controllers/AuthController.php';
require_once __DIR__ . '/src/Router.php';
// ... і так до нескінченності
```

### PSR-4: стандарт автозавантаження

**PSR-4** — це угода, що встановлює відповідність між простором імен класу та шляхом до файлу на диску:

```
Простір імен                  →  Фізичний шлях
────────────────────────────────────────────────────
App\Controllers\TaskController → src/Controllers/TaskController.php
App\Models\Task                → src/Models/Task.php
App\Repositories\TaskRepository→ src/Repositories/TaskRepository.php
```

Правило в `composer.json`:
```json
"autoload": {
    "psr-4": {
        "App\\": "src/"
    }
}
```

Означає: **простір імен `App\`** відповідає **директорії `src/`**.

Після виконання `composer dump-autoload` Composer генерує файл `vendor/autoload.php`. Підключаєте його **один раз** у Front Controller — і більше ніяких `require_once`:

```php
<?php
// public/index.php — єдиний require у всьому проєкті
require_once __DIR__ . '/../vendor/autoload.php';

// Тепер PHP сам знайде потрібний файл, коли зустріне назву класу
use App\Controllers\TaskController;
use App\Router;
```

---

## 4. Простори імен (`namespace` та `use`)

### Навіщо потрібні простори імен?

Уявіть, що у вас є два класи `User` в різних бібліотеках — один ваш, один зі стороннього пакету. PHP не знатиме, який із них використовувати. Простори імен вирішують цю проблему, даючи кожному класу «повну адресу».

### Оголошення простору імен у файлі класу

```php
<?php
// src/Models/Task.php
declare(strict_types=1);

namespace App\Models; // Оголошення простору імен — ПЕРШИЙ рядок після <?php

class Task
{
    public function __construct(
        public readonly int    $id,
        private string         $title,
        private bool           $isCompleted = false,
        private ?string        $deadline    = null,
    ) {}
    // ...
}
```

```php
<?php
// src/Repositories/TaskRepository.php
declare(strict_types=1);

namespace App\Repositories;

use App\Models\Task; // Імпорт класу Task з іншого простору імен

class TaskRepository
{
    /** @var Task[] */
    private array $tasks = [];
    // ...
}
```

### Використання класів через `use`

```php
<?php
// src/Controllers/TaskController.php
declare(strict_types=1);

namespace App\Controllers;

use App\Models\Task;
use App\Repositories\TaskRepository;
use InvalidArgumentException;

class TaskController
{
    // Тепер можна писати просто TaskRepository, а не App\Repositories\TaskRepository
    public function __construct(
        private TaskRepository $repository,
    ) {}

    public function index(): void
    {
        $tasks = $this->repository->findAll();
        // ...
    }
}
```

### Підключення `.env` через phpdotenv

Пакет `vlucas/phpdotenv` зчитує `.env`-файл і поміщає значення у `$_ENV` і `getenv()`:

```bash
# .env — не комітити в Git!
DB_HOST=localhost
DB_NAME=task_manager
DB_USER=root
DB_PASS=secret
```

```php
<?php
// public/index.php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Тепер доступно через $_ENV або getenv()
$dbHost = $_ENV['DB_HOST']; // 'localhost'
```

---

## 5. Dependency Injection: чому `new` у конструкторі — це погано

### Проблема жорстких залежностей

```php
<?php
// Погано: контролер сам створює свої залежності
class TaskController
{
    private TaskRepository $repository;

    public function __construct()
    {
        // Жорстка залежність: TaskController знає, де живе БД
        $pdo = new PDO('mysql:host=localhost;dbname=task_manager', 'root', '');
        $this->repository = new TaskRepository($pdo);
    }
}
```

Проблеми:
- неможливо протестувати `TaskController` без реальної бази даних;
- щоб замінити `TaskRepository` на `JsonTaskRepository` для тестів — треба лізти в код контролера;
- `TaskController` знає занадто багато про інфраструктуру.

### Рішення: Dependency Injection (впровадження залежностей)

DI — це простий принцип: **залежності передаються ззовні, а не створюються всередині**.

```php
<?php
// Добре: контролер отримує готовий репозиторій ззовні
class TaskController
{
    // Залежність TaskRepository "вприскується" через конструктор
    public function __construct(
        private TaskRepository $repository,
    ) {}

    // Тепер TaskController не знає нічого про PDO або JSON
}
```

```php
<?php
// public/index.php — єдине місце, де збирається граф залежностей
$pdo = new PDO(
    "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$taskRepository   = new TaskRepository($pdo);
$taskController   = new TaskController($taskRepository); // Залежність "вприснута"

$authRepository   = new UserRepository($pdo);
$authController   = new AuthController($authRepository);
```

### Переваги DI

```php
<?php
// Для тестів можна підмінити реальний репозиторій на тестовий (без БД!)
$mockRepository = new InMemoryTaskRepository(); // Зберігає дані у масиві
$controller     = new TaskController($mockRepository);
// Тест не потребує MySQL!
```

---

## 6. Service Layer: виділення бізнес-логіки

### Що не так із бізнес-логікою в контролері?

```php
<?php
class TaskController
{
    public function store(): void
    {
        $title = trim($_POST['title'] ?? '');

        // Бізнес-правила в контролері — погана практика:
        if (strlen($title) < 3) {
            // Помилка: занадто короткий заголовок
        }
        if (strlen($title) > 255) {
            // Помилка: занадто довгий заголовок
        }
        // Перевірка дедлайну...
        // Перевірка прав доступу...
        // ... і тільки потім збереження

        $this->repository->add($title);
        header('Location: /');
        exit;
    }
}
```

Контролер перетворюється на «сміттєвий ящик» для бізнес-правил. Якщо таку ж валідацію треба виконати в іншому контролері (наприклад, API) — доведеться дублювати код.

### Service Layer — шар між контролером і репозиторієм

`TaskService` збирає всю бізнес-логіку в одному місці:

```php
<?php
declare(strict_types=1);

namespace App\Services;

use App\Models\Task;
use App\Repositories\TaskRepository;
use InvalidArgumentException;

class TaskService
{
    public function __construct(
        private TaskRepository $repository,
    ) {}

    /**
     * Бізнес-правила створення завдання зосереджені тут.
     * Контролер лише передає сирі дані.
     */
    public function createTask(string $title, ?string $deadline): Task
    {
        $title = trim($title);

        if (strlen($title) < 3) {
            throw new InvalidArgumentException('Назва завдання занадто коротка (мінімум 3 символи).');
        }

        if (strlen($title) > 255) {
            throw new InvalidArgumentException('Назва завдання занадто довга (максимум 255 символів).');
        }

        if ($deadline !== null && strtotime($deadline) < time()) {
            throw new InvalidArgumentException('Дедлайн не може бути в минулому.');
        }

        return $this->repository->add($title, $deadline);
    }

    /**
     * Перевіряє права доступу перед виконанням.
     */
    public function completeTask(int $taskId, int $userId): void
    {
        $task = $this->repository->findById($taskId);

        if ($task === null) {
            throw new \RuntimeException("Завдання #{$taskId} не знайдено.");
        }

        // Бізнес-правило: не можна виконати вже виконане завдання
        if ($task->isCompleted()) {
            throw new \LogicException('Завдання вже виконане.');
        }

        $task->complete();
        $this->repository->save($task);
    }
}
```

### Контролер стає «тонким»

```php
<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Services\TaskService;
use InvalidArgumentException;

class TaskController
{
    public function __construct(
        private TaskService $service,
    ) {}

    public function store(): void
    {
        $errors = [];

        try {
            $this->service->createTask(
                title:    $_POST['title']    ?? '',
                deadline: $_POST['deadline'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            $errors[] = $e->getMessage();
        }

        if (!empty($errors)) {
            // Повертаємо форму з помилками
            $this->render('tasks/create', ['errors' => $errors]);
            return;
        }

        header('Location: /');
        exit;
    }

    private function render(string $view, array $data = []): void
    {
        extract($data);
        require __DIR__ . '/../../views/' . $view . '.php';
    }
}
```

### Збірка залежностей у Front Controller

```php
<?php
// public/index.php — граф залежностей (ручний DI-контейнер)
require_once __DIR__ . '/../vendor/autoload.php';

use App\Controllers\{TaskController, AuthController};
use App\Repositories\{TaskRepository, UserRepository};
use App\Services\TaskService;
use App\Router;

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

session_start();

// Інфраструктура
$pdo = new PDO(
    "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

// Репозиторії
$taskRepo = new TaskRepository($pdo);
$userRepo = new UserRepository($pdo);

// Сервіси
$taskService = new TaskService($taskRepo);

// Контролери
$taskController = new TaskController($taskService);
$authController = new AuthController($userRepo);

// Маршрутизатор
$router = new Router();
$router->get('/',                [$taskController, 'index']);
$router->get('/tasks/create',    [$taskController, 'create']);
$router->post('/tasks',          [$taskController, 'store']);
$router->post('/tasks/complete', [$taskController, 'complete']);
$router->get('/login',           [$authController, 'showLogin']);
$router->post('/login',          [$authController, 'login']);
$router->get('/logout',          [$authController, 'logout']);

$router->dispatch(
    $_SERVER['REQUEST_METHOD'],
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);
```

---

## Висновки

1. Шаблонізатори (Twig) **структурно** унеможливлюють виконання бізнес-логіки у View, автоматично екранують вивід від XSS і забезпечують зручне наслідування макетів. Нативні PHP-шаблони потребують ручної дисципліни для досягнення тих самих цілей.
2. **Composer** — стандарт де-факто для управління залежностями PHP. Він завантажує пакети з [packagist.org](https://packagist.org), генерує `vendor/autoload.php` і вирішує конфлікти версій.
3. **PSR-4** встановлює чіткий зв'язок між простором імен класу (`App\Controllers\TaskController`) та файловою системою (`src/Controllers/TaskController.php`). Один `require_once 'vendor/autoload.php'` замінює десятки ручних підключень.
4. **Простори імен** (`namespace`/`use`) запобігають конфліктам між однойменними класами різних бібліотек і дають змогу організовувати код за логічними групами.
5. **Dependency Injection** — передача залежностей через конструктор замість їхнього створення всередині — робить класи незалежними, тестованими та замінними.
6. **Service Layer** концентрує всі бізнес-правила в одному місці поза контролером і репозиторієм. Контролер стає «тонким» посередником, а бізнес-логіку можна протестувати й повторно використати без HTTP-контексту.

## Рекомендована література та джерела

- офіційна документація Composer — https://getcomposer.org/doc/;
- стандарт автозавантаження PSR-4 — https://www.php-fig.org/psr/psr-4/;
- документація Twig — https://twig.symfony.com/doc/;
- пакет phpdotenv — https://github.com/vlucas/phpdotenv;
- стаття про Dependency Injection на PHP The Right Way — https://phptherightway.com/#dependency_injection.

## Запитання для самоперевірки

1. Чим шаблонізатор (Twig) відрізняється від нативного PHP-шаблону з точки зору безпеки? Що відбувається за замовчуванням у Twig при виведенні змінної `{{ user.name }}`?
2. Що таке `composer.json` і що таке `composer.lock`? Чому рекомендують комітити `composer.lock` у систему контролю версій, але не комітити директорію `vendor/`?
3. Поясніть, що конкретно означає рядок `"App\\": "src/"` у секції `autoload.psr-4`. Як Composer знайде файл для класу `App\Services\TaskService`?
4. У чому різниця між `require` (залежності) та `require-dev` (залежності для розробки) у `composer.json`? Наведіть приклади пакетів, що належать до кожної категорії.
5. Поясніть принцип Dependency Injection на конкретному прикладі класу `TaskController`. Чому передача `TaskService` через конструктор краща, ніж виклик `new TaskService(new TaskRepository($pdo))` всередині `TaskController`?
