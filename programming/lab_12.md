# Лабораторна робота №12 (2 години)

**Тема:** Налаштування СКБД MySQL. Встановлення бази через phpMyAdmin, створення БД `task_manager`, проєктування перших таблиць та перевірка з'єднання з PHP через PDO.

**Мета:** Отримати практичні навички роботи з графічним інтерфейсом користувача (GUI) phpMyAdmin для СКБД MySQL/MariaDB, навчитися проєктувати початкову реляційну схему даних, створювати таблиці та первинні ключі. Опанувати базове підключення вебдодатка на PHP до створеної бази даних за допомогою розширення PDO, навчитися виконувати запити для перегляду структури БД (`SHOW TABLES`) та читання тестових даних (`SELECT`), а також організовувати надійну обробку винятків з'єднання (`PDOException`).

**Технологічний стек:** MySQL/MariaDB, phpMyAdmin, PHP 8.1+, PDO (PHP Data Objects), SQL (`SHOW TABLES`, `SELECT`).

---

## Завдання

1. Запустити MySQL-сервер разом із модулем Apache в XAMPP Control Panel.
2. Перейти в інструмент `phpMyAdmin` для адміністративного управління базами даних.
3. Створити нову базу даних (схему) під назвою `task_manager` із кодуванням `utf8mb4_unicode_ci`.
4. Створити дві таблиці: `users` (для зберігання облікових записів) та `tasks` (для списку завдань), наповнити їх початковими тестовими записами через інтерфейс phpMyAdmin.
5. Створити діагностичний PHP-скрипт (`test_db.php`) у корені проєкту «Менеджер завдань» (з лабораторної роботи №11) для перевірки з'єднання з базою даних через розширення PDO.
6. Налаштувати обробку можливих помилок підключення за допомогою блоку `try...catch (PDOException)`.
7. Отримати й візуалізувати засобами PHP список наявних у базі даних таблиць (запит `SHOW TABLES`) і вміст тестових записів із таблиці `tasks` у єдиному стилі інтерфейсу проєкту.

---

## Хід виконання роботи

> Базою для виконання програмної частини лабораторної роботи є проєкт «Менеджер завдань», розроблений у **лабораторній роботі №11**.  
> Повноцінне переведення репозиторію на роботу з базою даних та реалізація повного циклу CRUD заплановані на **лабораторну роботу №13**. У цій лабораторній роботі ми налаштовуємо базу даних, проєктуємо схему та створюємо окремий діагностичний скрипт перевірки з'єднання.

---

### Крок 1. Запуск СКБД та phpMyAdmin

1. Відкрийте контрольну панель вашого локального сервера (XAMPP/MAMP).
2. Натисніть кнопку **"Start"** навпроти модулів **Apache** та **MySQL**. Переконайтеся, що порти (для Apache — 80/443, для MySQL — 3306) підсвітилися зеленим кольором.
3. Перейдіть у веб-браузер за адресою `http://localhost/phpmyadmin`. Це популярний веб-інтерфейс, написаний на PHP, для зручного візуального адміністрування баз даних MySQL та MariaDB.

---

### Крок 2. Створення бази даних

1. У лівій навігаційній панелі phpMyAdmin натисніть кнопку **«Створити базу даних»** (або **«New»**).
2. Введіть назву вашої бази даних (використовуйте латинські літери у нижньому регістрі): `task_manager`.
3. Оберіть кодування: `utf8mb4_unicode_ci` (це забезпечує коректне зберігання всіх символів українського алфавіту, діакритичних знаків та сучасних emoji).
4. Натисніть кнопку **«Створити»**.

---

### Крок 3. Створення таблиці `users`

Після створення база даних `task_manager` з'явиться в лівому меню. Оберіть її. Система автоматично запропонує створити першу таблицю.

Введіть ім'я таблиці `users` та вкажіть **4** стовпці:

1. `id` — тип **INT** (ціле число). Встановіть прапорець **A_I** (Auto Increment — автоматичне збільшення значення при кожному новому записі). Це поле автоматично стане первинним ключем (**PRIMARY KEY**).
2. `username` — тип **VARCHAR**, довжина **50** (ім'я користувача або логін).
3. `email` — тип **VARCHAR**, довжина **100** (електронна пошта).
4. `password` — тип **VARCHAR**, довжина **255** (функції надійного хешування паролів, такі як `password_hash()`, генерують довгі рядки, тому для хешу виділяється достатня довжина).

Натисніть кнопку **«Зберегти»** внизу форми.

> **Порада:** Перейдіть у вкладку «Вставити» (Insert) для таблиці `users` та додайте одного тестового користувача (наприклад: `id` залишіть порожнім для автоінкременту, `username` = `admin`, `email` = `admin@example.com`, `password` = `secret123`). Натисніть «Вперед», щоб зберегти запис.

---

### Крок 4. Створення таблиці `tasks`

Поверніться до бази даних `task_manager` та створіть другу таблицю — `tasks` із наступною структурою:

1. `id` — **INT**, A_I (Auto Increment), **PRIMARY KEY** (унікальний ідентифікатор завдання).
2. `user_id` — **INT** (ідентифікатор користувача, якому належить це завдання).
3. `title` — **VARCHAR**, довжина **255** (коротка назва завдання).
4. `description` — **TEXT** (довільний докладний опис завдання без жорсткого обмеження довжини).
5. `priority` — **ENUM**, у полі значень вкажіть варіанти: `'Low', 'Medium', 'High'` (пріоритет виконання).
6. `is_completed` — **TINYINT**, довжина **1** (або BOOLEAN), значення за замовчуванням встановити як визначено: `0` (False — завдання ще не виконане).

Натисніть кнопку **«Зберегти»**.

Після збереження структури перейдіть у вкладку **«Вставити»** (Insert) таблиці `tasks` та створіть **2–3 тестових записи** з різними заголовками, пріоритетами та описом (значення `user_id` встановіть `1`). Ці тестові записи ми будемо зчитувати через PHP у наступному кроці.

---

### Крок 5. Підключення до бази даних із PHP та перегляд таблиць

У лабораторній роботі №11 проєкт «Менеджер завдань» працював із файловим JSON-сховищем (`tasks.json`). Повноцінну заміну файлового сховища на реалізацію патерну Repository на базі MySQL та виконання CRUD-операцій (`INSERT`, `UPDATE`, `DELETE`) ми реалізуємо в **лабораторній роботі №13**.

Мета поточного кроку — навчитися підключатися до створеної бази даних із PHP за допомогою сучасного об'єктно-орієнтованого інтерфейсу **PDO (PHP Data Objects)**, коректно обробляти помилки з'єднання та отримати список таблиць і початкові дані через SQL-запити `SHOW TABLES` та `SELECT`.

#### 1. Створення діагностичного скрипта `test_db.php`

Створіть у кореневому каталозі проєкту «Менеджер завдань» (поруч із файлами `index.php` та `Task.php`) файл `test_db.php`:

```php
<?php
declare(strict_types=1);

// 1. Параметри підключення до СКБД MySQL (налаштування для XAMPP/MAMP)
$host     = '127.0.0.1';
$port     = '3306';
$dbname   = 'task_manager';
$username = 'root';
$password = ''; // За замовчуванням у XAMPP пароль користувача root порожній
$charset  = 'utf8mb4';

// 2. Формування рядка DSN (Data Source Name)
$dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";

$tables = [];
$tasks = [];
$connectionStatus = false;
$errorMessage = null;
$serverInfo = '';

// 3. Конфігурація критичних атрибутів PDO:
// - ATTR_ERRMODE => викидати PDOException у разі будь-якої помилки SQL
// - ATTR_DEFAULT_FETCH_MODE => повертати асоціативні масиви
// - ATTR_EMULATE_PREPARES => вимикати емуляцію підготовлених виразів
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    // Встановлення з'єднання з базою даних
    $pdo = new PDO($dsn, $username, $password, $options);
    $connectionStatus = true;
    $serverInfo = (string)$pdo->getAttribute(PDO::ATTR_SERVER_VERSION);

    // Крок А: Отримання списку таблиць у базі даних за допомогою SHOW TABLES
    $tablesStmt = $pdo->query('SHOW TABLES');
    $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

    // Крок Б: Отримання тестових записів із таблиці tasks (якщо таблиця вже створена)
    if (in_array('tasks', $tables, true)) {
        $tasksStmt = $pdo->query('SELECT * FROM tasks ORDER BY id ASC');
        $tasks = $tasksStmt->fetchAll();
    }
} catch (PDOException $e) {
    // Перехоплюємо виняток підключення (використовуючи принципи обробки помилок із ЛР №11)
    $connectionStatus = false;
    $errorMessage = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Діагностика підключення до БД (MySQL PDO)</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 820px;
            margin: 40px auto;
            padding: 0 20px;
            color: #222;
            background-color: #f8f9fa;
        }
        .card {
            background: #fff;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            margin-bottom: 20px;
        }
        h1 { margin-top: 0; font-size: 1.6em; color: #1c7ed6; }
        h2 { font-size: 1.2em; color: #343a40; margin-top: 24px; border-bottom: 1px solid #dee2e6; padding-bottom: 8px; }
        .alert-success {
            background: #d3f9d8;
            border: 1px solid #8ce99a;
            color: #2b8a3e;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .alert-error {
            background: #ffe3e3;
            border: 1px solid #ffa8a8;
            color: #c92a2a;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .badge-success { background: #40c057; color: #fff; }
        .badge-danger  { background: #fa5252; color: #fff; }
        .badge-info    { background: #228be6; color: #fff; }
        .badge-warning { background: #f59f00; color: #fff; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        th, td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #dee2e6;
            font-size: 0.95em;
        }
        th { background: #f1f3f5; color: #495057; }
        ul.tables-list { list-style: none; padding: 0; margin: 12px 0; }
        ul.tables-list li {
            padding: 8px 12px;
            background: #e7f5ff;
            color: #1971c2;
            margin-bottom: 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 1.05em;
        }
        .nav-links {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #dee2e6;
        }
        .nav-links a {
            color: #228be6;
            text-decoration: none;
            font-weight: 500;
        }
        .nav-links a:hover { text-decoration: underline; }
    </style>
</head>
<body>

    <div class="card">
        <h1>Діагностика підключення до БД MySQL</h1>
        <p>Перевірка зв'язку вебдодатка на PHP із базою даних <code><?= htmlspecialchars($dbname) ?></code> через інтерфейс PDO.</p>

        <?php if ($connectionStatus): ?>
            <div class="alert-success">
                <strong>✓ Успішне підключення через PDO!</strong><br>
                PHP успішно з'єднався із сервером бази даних (версія MySQL: <code><?= htmlspecialchars($serverInfo) ?></code>).
            </div>

            <h2>1. Таблиці у базі даних (запит <code>SHOW TABLES</code>)</h2>
            <?php if (!empty($tables)): ?>
                <ul class="tables-list">
                    <?php foreach ($tables as $table): ?>
                        <li>📁 <?= htmlspecialchars($table) ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p>У базі даних немає створених таблиць. Перевірте виконання Кроків 3 та 4.</p>
            <?php endif; ?>

            <h2>2. Тестові записи з таблиці <code>tasks</code> (запит <code>SELECT * FROM tasks</code>)</h2>
            <?php if (!empty($tasks)): ?>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Назва завдання</th>
                            <th>User ID</th>
                            <th>Пріоритет</th>
                            <th>Опис</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($tasks as $task): ?>
                            <tr>
                                <td><strong>#<?= htmlspecialchars((string)($task['id'] ?? '')) ?></strong></td>
                                <td><?= htmlspecialchars((string)($task['title'] ?? '')) ?></td>
                                <td><?= htmlspecialchars((string)($task['user_id'] ?? '')) ?></td>
                                <td>
                                    <?php
                                    $p = $task['priority'] ?? 'Medium';
                                    $badgeClass = match ($p) {
                                        'High' => 'badge-danger',
                                        'Low' => 'badge-info',
                                        default => 'badge-warning',
                                    };
                                    ?>
                                    <span class="badge <?= $badgeClass ?>"><?= htmlspecialchars((string)$p) ?></span>
                                </td>
                                <td><?= htmlspecialchars((string)($task['description'] ?? '—')) ?></td>
                                <td>
                                    <?php if (!empty($task['is_completed'])): ?>
                                        <span class="badge badge-success">Виконано</span>
                                    <?php else: ?>
                                        <span class="badge badge-danger">В процесі</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>У таблиці <code>tasks</code> поки немає записів. Додайте 2–3 тестові завдання через вкладку «Вставити» (Insert) у phpMyAdmin.</p>
            <?php endif; ?>

        <?php else: ?>
            <div class="alert-error">
                <strong>✗ Помилка підключення до СКБД!</strong><br>
                Не вдалося встановити зв'язок із сервером MySQL.<br>
                <em>Повідомлення PDO:</em> <?= htmlspecialchars($errorMessage ?? 'Невідома помилка') ?>
            </div>

            <p><strong>Поради для діагностики:</strong></p>
            <ul>
                <li>Переконайтеся, що модуль <strong>MySQL</strong> запущено в XAMPP Control Panel (порт 3306 підсвічений зеленим);</li>
                <li>Перевірте коректність назви бази даних у DSN (має бути <code>task_manager</code>);</li>
                <li>Перевірте параметри облікового запису (за замовчуванням користувач <code>root</code> із порожнім паролем).</li>
            </ul>
        <?php endif; ?>

        <div class="nav-links">
            <a href="index.php">← Повернутися до «Менеджера завдань» (index.php)</a>
        </div>
    </div>

</body>
</html>
```

#### 2. Додавання посилання у `index.php` (опціонально)

Щоб легко переходити між основним інтерфейсом менеджера завдань та сторінкою діагностики бази даних, відкрийте файл `index.php` з лабораторної роботи №11 та додайте посилання біля блоку інформації про користувача:

```html
<p>
    Користувач: <strong><?= htmlspecialchars($_SESSION['user_name'] ?? 'Адміністратор') ?></strong> |
    <a href="test_db.php">🔍 Діагностика БД (MySQL)</a> |
    <a href="login.php">Вийти</a>
</p>
```

#### 3. Тестування сценаріїв з'єднання

1. **Позитивний тест:** Відкрийте в браузері сторінку `http://localhost/test_db.php` (або `http://localhost/<назва_вашої_папки>/test_db.php`). Переконайтеся, що відображається зелений блок з успішним статусом, версією MySQL, переліком таблиць (`tasks`, `users`) та списком тестових записів.
2. **Негативний тест (перевірка перехоплення помилок):** 
   - У панелі керування XAMPP тимчасово зупиніть службу **MySQL** (кнопка «Stop») та оновіть сторінку `test_db.php` у браузері.
   - Переконайтеся, що скрипт не падає з аварійною помилкою (Fatal Error), а конструкція `catch (PDOException $e)` акуратно виводить стилізований червоний блок повідомлення про помилку підключення.
   - Знову натисніть кнопку «Start» для MySQL у XAMPP та оновіть сторінку, переконавшись у відновленні нормальної роботи.

---

## Контрольні запитання

1. Що таке СКБД (DBMS)? У чому полягає різниця між безпосередньо сервером бази даних (MySQL) та веб-інтерфейсом phpMyAdmin?
2. Для чого використовується атрибут `Auto Increment` (A_I), який призначається первинному полю `id`?
3. Що таке `PRIMARY KEY` (Первинний ключ) і для чого він критично потрібен у кожній реляційній таблиці?
4. Назвіть щонайменше 2 текстові типи даних у MySQL (`VARCHAR`, `TEXT`) та поясніть різницю між ними.
5. Чому для збереження паролів виділено стовпець `VARCHAR(255)`, а не поле меншої фіксованої довжини?
6. Що таке інтерфейс PDO (PHP Data Objects) у PHP та які суттєві переваги він надає порівняно із застарілим набором функцій `mysql_*`?
7. Що таке рядок DSN (Data Source Name) та які обов'язкові компоненти входять до його складу під час з'єднання з MySQL?
8. Чому операцію встановлення з'єднання з базою даних через PDO необхідно огортати в блок `try...catch (PDOException)`?

---

## Вимоги до звіту

1. У файл `lab12.md` вашого репозиторію додати скриншот із phpMyAdmin структури створених таблиць `users` та `tasks` (вкладка «Структура»).
2. Додати скриншот вкладки «Огляд» (Browse) таблиці `tasks` у phpMyAdmin із доданими тестовими записами.
3. Експортувати базу даних у файл `database.sql` (використовуючи вкладку «Експорт» у phpMyAdmin) та зберегти цей `.sql` файл у репозиторій проєкту на GitHub.
4. Додати у звіт лістинг створеного діагностичного файлу `test_db.php`.
5. Додати скриншот сторінки `test_db.php` у веб-браузері з успішним підключенням до БД, відображеним списком таблиць (`users`, `tasks`) та виведеними тестовими даними.
6. У файлі `lab12.md` надати стислі, але обґрунтовані письмові відповіді на всі контрольні запитання.
