# Лекція 14 (2 години). Архітектурні патерни у бекенді: MVC та маршрутизація

## План лекції

1. Проблема «спагеті-коду» та навіщо потрібні архітектурні патерни.
2. Патерн MVC: Model, View, Controller та їхні зони відповідальності.
3. Типова структура PHP-проєкту: що куди кладемо і чому.
4. Концепція єдиної точки входу (Front Controller).
5. Система маршрутизації (Router): від URI до контролера.
6. Передача даних: від контролера до представлення (View).

## Перелік умовних скорочень

- **MVC** — Model-View-Controller; архітектурний патерн розподілу відповідальностей у застосунку.
- **Front Controller** — єдиний файл (`public/index.php`), через який проходять усі HTTP-запити.
- **Router** — компонент, що зіставляє URI і HTTP-метод запиту з конкретним контролером та дією.
- **Controller** — клас, що приймає запит, взаємодіє з моделлю і передає дані до представлення.
- **Model** — шар, що описує бізнес-логіку та доступ до даних (клас `Task`, `TaskRepository` тощо).
- **View** — PHP-файл-шаблон, що відповідає виключно за виведення HTML.
- **URI** — Uniform Resource Identifier; частина URL після домену та порту (наприклад, `/tasks/create`).

## Вступ

Після кількох лабораторних наш «Менеджер завдань» перетворився з простого скрипта на застосунок із класами, формами, авторизацією та роботою з базою даних. Але структурно він усе ще виглядає приблизно так: в одному `index.php` — і запит до бази, і бізнес-логіка, і HTML-розмітка. Це і є те, що програмісти називають «**спагеті-кодом**» — код, де все переплетено й нерозривно пов'язано, як макарони в каструлі.

Щоб масштабувати й підтримувати такий проєкт, потрібен порядок. У цій лекції ми розглянемо **MVC** — архітектурний патерн, який поділяє застосунок на три чіткі зони відповідальності, та **Router** — механізм, що замінює хаотичні `if/else` на URL-адреси на впорядковану таблицю маршрутів.

---

## 1. Проблема «спагеті-коду»

### Як виглядає типовий процедурний PHP-файл

```php
<?php
// index.php — тут все одразу: БД, логіка, HTML
session_start();
$pdo = new PDO('mysql:host=localhost;dbname=task_manager', 'root', '');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['title'])) {
    $stmt = $pdo->prepare('INSERT INTO tasks (title) VALUES (?)');
    $stmt->execute([$_POST['title']]);
    header('Location: index.php');
    exit;
}

$tasks = $pdo->query('SELECT * FROM tasks')->fetchAll();
?>
<!DOCTYPE html>
<html>
<body>
    <form method="POST">
        <input name="title"> <button>Додати</button>
    </form>
    <?php foreach ($tasks as $task): ?>
        <p><?= $task['title'] ?></p>
    <?php endforeach; ?>
</body>
</html>
```

### Проблеми цього підходу

- **важко тестувати** — щоб перевірити логіку додавання завдання, потрібно симулювати HTTP-запит і мати підключену базу;
- **важко змінювати дизайн** — будь-яка правка HTML зачіпає PHP-код і навпаки;
- **неможливо масштабувати** — при додаванні нових «сторінок» або API-ендпоінтів код перетворюється на гігантський файл з десятками `if/else`;
- **не можна розподілити роботу** — фронтенд і бекенд-розробник змінюють один файл і постійно конфліктують.

**Рішення**: чіткий поділ відповідальностей через патерн MVC.

---

## 2. Патерн MVC: Model, View, Controller

MVC (Model-View-Controller) — це не бібліотека і не фреймворк. Це **угода про те, де живе який тип коду**. Він поділяє застосунок на три незалежних шари.

### Model (Модель) — «що» і «як» зберігається

Модель описує дані та бізнес-правила. Вона не знає нічого про HTTP-запити й HTML-вивід. У нашому проєкті це:
- клас `Task` — описує сутність завдання;
- клас `TaskRepository` — знає, як читати і зберігати `Task` у базі;
- клас `User`, `UserRepository` тощо.

```
Модель відповідає на питання: "Як додати завдання? Як перевірити, чи прострочене воно?"
```

### View (Представлення) — «як» виглядає

Представлення — це чистий HTML-шаблон з мінімумом PHP тільки для виведення даних. Воно не робить запитів до бази, не перевіряє `$_POST`, не перенаправляє. Воно лише виводить те, що йому передали.

```php
<!-- views/tasks/index.php -->
<h1>Список завдань</h1>
<?php foreach ($tasks as $task): ?>
    <p><?= htmlspecialchars($task->getTitle()) ?> — <?= $task->getStatusLabel() ?></p>
<?php endforeach; ?>
```

### Controller (Контролер) — «хто» керує процесом

Контролер — посередник між запитом і відповіддю:
1. приймає HTTP-запит (`$_GET`, `$_POST`);
2. викликає потрібні методи Моделі;
3. передає підготовлені дані у відповідне Представлення.

```php
class TaskController
{
    public function index(): void
    {
        // 1. Отримує дані через Модель
        $tasks = $this->repository->findAll();
        // 2. Передає дані у Представлення
        require 'views/tasks/index.php';
    }
}
```

### Схема взаємодії

```
Браузер
   │  HTTP-запит (GET /tasks)
   ▼
[Router] ──── зіставляє URI ───► [Controller]
                                      │
                               викликає Модель
                                      │
                                  [Model/Repository]
                                      │
                               повертає дані
                                      │
                               [View / Шаблон]
                                      │
   ◄──────── HTML-відповідь ──────────┘
Браузер
```

---

## 3. Типова структура PHP-проєкту

Перш ніж писати код, потрібно домовитися про структуру директорій. Вона є прямим відображенням MVC:

```
project/
│
├── public/                  ← ЄДИНА публічна директорія (веб-сервер вказує сюди)
│   ├── index.php            ← Front Controller — єдина точка входу
│   └── assets/
│       ├── css/
│       └── js/
│
├── src/                     ← Весь PHP-код (недоступний через браузер напряму)
│   ├── Controllers/
│   │   ├── TaskController.php
│   │   └── AuthController.php
│   ├── Models/
│   │   └── Task.php
│   ├── Repositories/
│   │   └── TaskRepository.php
│   └── Router.php
│
├── views/                   ← HTML-шаблони (Представлення)
│   ├── layouts/
│   │   └── main.php         ← Базовий макет (header, footer)
│   └── tasks/
│       ├── index.php        ← Список завдань
│       └── create.php       ← Форма створення
│
├── vendor/                  ← Composer-пакети (генерується автоматично, не редагувати!)
├── .env                     ← Конфігурація (паролі БД, не комітити в Git!)
├── .gitignore
└── composer.json            ← Маніфест залежностей
```

### Чому `public/` — єдина відкрита директорія?

Веб-сервер (Apache/Nginx) **повинен** вказувати корінь (`DocumentRoot`) саме на папку `public/`. Це означає, що якщо хтось спробує відкрити у браузері `http://site.com/src/Controllers/TaskController.php` — він отримає 404. Файли конфігурації, паролі в `.env`, вихідний код — усе залишається поза зоною досяжності браузера.

---

## 4. Концепція єдиної точки входу (Front Controller)

У процедурному PHP кожна «сторінка» — це окремий файл:
- `index.php` → головна;
- `create.php` → форма створення;
- `delete.php` → видалення.

У MVC-застосунку є **один єдиний файл**, через який проходять **всі** запити — `public/index.php`. Веб-сервер перенаправляє туди кожен запит (через `.htaccess` для Apache або `try_files` для Nginx).

```apache
# public/.htaccess (для Apache)
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

Тепер `public/index.php` виглядає так:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php'; // або ручні require

session_start();

$router = new Router();

// Оголошення маршрутів
$router->get('/',             [TaskController::class, 'index']);
$router->get('/tasks/create', [TaskController::class, 'create']);
$router->post('/tasks',       [TaskController::class, 'store']);
$router->post('/tasks/complete', [TaskController::class, 'complete']);
$router->get('/login',        [AuthController::class, 'showLogin']);
$router->post('/login',       [AuthController::class, 'login']);
$router->get('/logout',       [AuthController::class, 'logout']);

// Диспетчеризація: знайти потрібний маршрут і запустити контролер
$router->dispatch(
    $_SERVER['REQUEST_METHOD'],
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);
```

---

## 5. Система маршрутизації (Router)

Router — це клас, що зберігає таблицю маршрутів і знаходить потрібний обробник для поточного запиту.

### Проста реалізація Router

```php
<?php
declare(strict_types=1);

class Router
{
    /** @var array<string, array<string, array{0: string, 1: string}>> */
    private array $routes = [];

    // Реєстрація маршруту для GET-запиту
    public function get(string $uri, array $handler): void
    {
        $this->routes['GET'][$uri] = $handler;
    }

    // Реєстрація маршруту для POST-запиту
    public function post(string $uri, array $handler): void
    {
        $this->routes['POST'][$uri] = $handler;
    }

    // Диспетчеризація: знайти та виконати потрібний обробник
    public function dispatch(string $method, string $uri): void
    {
        // Прибираємо query string (?foo=bar) з URI
        $uri = strtok($uri, '?');

        if (!isset($this->routes[$method][$uri])) {
            http_response_code(404);
            echo '<h1>404 — Сторінку не знайдено</h1>';
            return;
        }

        [$controllerClass, $action] = $this->routes[$method][$uri];

        // Створюємо екземпляр контролера і викликаємо потрібний метод
        $controller = new $controllerClass();
        $controller->$action();
    }
}
```

### Як це працює: покроковий приклад

```
Браузер надсилає: POST /tasks

Router шукає в таблиці:
  $routes['POST']['/tasks'] = [TaskController::class, 'store']

Router створює: new TaskController()
Router викликає: $controller->store()
```

Ніяких `if ($_SERVER['REQUEST_URI'] === '/tasks' && $_SERVER['REQUEST_METHOD'] === 'POST')` у `index.php` — вся логіка маршрутизації в одному місці.

---

## 6. Передача даних: від контролера до представлення

Контролер збирає дані і передає їх у View. Щоб не засмічувати глобальний простір, використовують функцію-хелпер або метод:

```php
<?php
declare(strict_types=1);

class TaskController
{
    public function __construct(
        private TaskRepository $repository = new TaskRepository(/* ... */)
    ) {}

    // GET / — список завдань
    public function index(): void
    {
        $tasks = $this->repository->findAll();

        // Рендеримо шаблон, передаючи змінні через extract()
        $this->render('tasks/index', ['tasks' => $tasks]);
    }

    // GET /tasks/create — форма створення
    public function create(): void
    {
        $this->render('tasks/create', []);
    }

    // POST /tasks — збереження нового завдання
    public function store(): void
    {
        $title    = trim($_POST['title'] ?? '');
        $deadline = trim($_POST['deadline'] ?? '') ?: null;

        if (!empty($title)) {
            $this->repository->add($title, $deadline);
        }

        header('Location: /');
        exit;
    }

    // Допоміжний метод для рендерингу View
    private function render(string $view, array $data = []): void
    {
        // extract() перетворює ключі масиву на змінні:
        // ['tasks' => $arr] → $tasks = $arr
        extract($data);

        $viewPath = __DIR__ . '/../../views/' . $view . '.php';
        require $viewPath;
    }
}
```

### Шаблон представлення (`views/tasks/index.php`)

```php
<?php require __DIR__ . '/../layouts/main.php'; ?>

<h1>Мої завдання</h1>

<a href="/tasks/create">+ Додати завдання</a>

<?php if (empty($tasks)): ?>
    <p>Завдань поки немає.</p>
<?php else: ?>
    <?php foreach ($tasks as $task): ?>
        <div class="task-card">
            <strong><?= htmlspecialchars($task->getTitle()) ?></strong>
            <span class="badge"><?= $task->getStatusLabel() ?></span>

            <?php if (!$task->isCompleted()): ?>
                <form method="POST" action="/tasks/complete" style="display:inline">
                    <input type="hidden" name="id" value="<?= $task->getId() ?>">
                    <button>✓ Виконано</button>
                </form>
            <?php endif; ?>
        </div>
    <?php endforeach; ?>
<?php endif; ?>
```

### Базовий макет (`views/layouts/main.php`)

```php
<?php
// Захист: якщо незалогінений — перенаправити на /login
if (empty($_SESSION['is_logged_in'])) {
    header('Location: /login');
    exit;
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Менеджер завдань</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
<header>
    <nav>
        <a href="/">Завдання</a>
        <span>Привіт, <?= htmlspecialchars($_SESSION['user_name'] ?? '') ?>!</span>
        <a href="/logout">Вийти</a>
    </nav>
</header>
<main>
    <!-- Вміст конкретної сторінки підставляється тут -->
</main>
</body>
</html>
```

> **Зверніть увагу:** у реальних фреймворках (Laravel, Symfony) базовий макет підключається через механізм наслідування шаблонів (`@extends`/`{% extends %}`). У нашому випадку `require` є навчальним спрощенням цього підходу.

---

## Висновки

1. «Спагеті-код» — це наслідок змішування запитів до бази, бізнес-логіки та HTML в одному файлі. MVC вирішує це через чіткий поділ відповідальностей.
2. **Model** відповідає за дані та правила бізнес-логіки, **View** — лише за виведення HTML, **Controller** — за прийняття запитів і координацію між Model та View.
3. Типова структура PHP-проєкту виносить весь вихідний код у `src/`, шаблони у `views/`, а публічним залишається тільки каталог `public/` — це захищає конфіденційні файли від прямого доступу через браузер.
4. **Front Controller** (`public/index.php`) — єдина точка входу; перенаправлення усіх запитів через `.htaccess` дозволяє контролювати кожен HTTP-запит в одному місці.
5. **Router** — клас, що зберігає таблицю маршрутів і на основі HTTP-методу та URI визначає, який контролер і який метод потрібно викликати.
6. Контролер передає дані у View через масив параметрів і `extract()`, зберігаючи шаблони «чистими» — без бізнес-логіки.

## Рекомендована література та джерела

- опис патерну MVC у PHP The Right Way — https://phptherightway.com/#the_mvc_pattern;
- офіційна документація Apache mod_rewrite — https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html;
- вступ до Router у фреймворку Laravel (для розуміння ідеї) — https://laravel.com/docs/routing;
- стаття «Не роби спагеті» — огляд MVC для новачків — https://dev.to/bornfightcompany/what-is-mvc-and-why-should-you-care.

## Запитання для самоперевірки

1. Назвіть три компоненти патерну MVC та опишіть зону відповідальності кожного з них. Яку роботу **заборонено** виконувати у View і чому?
2. Чому в MVC-проєкті веб-сервер має вказувати `DocumentRoot` саме на директорію `public/`, а не на корінь проєкту? Який ризик виникне, якщо налаштувати його на корінь?
3. Що таке Front Controller і яку проблему він вирішує порівняно з підходом «один файл — одна сторінка»? Яку роль відіграє `.htaccess` у цій схемі?
4. Розгляньте рядок `$router->post('/tasks', [TaskController::class, 'store'])`. Поясніть, що відбудеться покроково від надсилання POST-запиту до `/tasks` у браузері до виконання методу `store()`.
5. Метод `render()` у контролері використовує функцію `extract($data)`. Що конкретно вона робить з масивом `['tasks' => $arr, 'title' => 'Мої завдання']`? Чому не можна просто передати масив `$data` напряму в шаблон?
