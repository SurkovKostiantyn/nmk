# Лекція 12 (2 години). Робота бекенду з базами даних: архітектура підключення, програмування CRUD та порівняльний аналіз у сучасних мовах

## План лекції

- архітектура взаємодії бекенду та СКБД - клієнт-серверна модель, мережеві сокети, двійкові протоколи та рівні абстракції доступу до даних;
- життєвий цикл з'єднань з базою даних - порівняння моделі Per-Request у PHP з концепцією Connection Pooling у довгоживучих серверах;
- підключення та конфігурація через PHP PDO - формування DSN, безпечне керування обліковими даними через змінні оточення та критичні атрибути об'єкта PDO;
- реалізація повного циклу CRUD на бекенді - робота з Prepared Statements, захист від SQL-ін'єкцій, вибірка, вставка, оновлення та керування транзакціями;
- порівняльний аналіз взаємодії з БД у різних мовах програмування - практичні приклади коду на PHP, Node.js, Python, Go та C# (.NET);
- архітектурні патерни та продуктивність бекенду - патерн Repository, розв'язання проблеми N+1 запитів, потокова обробка вибірок та керування ресурсами.

## Перелік умовних скорочень

- **СКБД (RDBMS)** - система керування реляційними базами даних (Relational Database Management System);
- **PDO** - PHP Data Objects (уніфікований об'єктно-орієнтований інтерфейс доступу до баз даних у PHP);
- **DSN** - Data Source Name (рядок визначення джерела даних та параметрів мережевого підключення);
- **ORM** - Object-Relational Mapping (технологія відображення таблиць БД на об'єктні моделі мови програмування);
- **CRUD** - базовий набір операцій з даними (Create, Read, Update, Delete);
- **SQL** - Structured Query Language (мова структурованих запитів);
- **DAO** - Data Access Object (патерн проєктування для ізоляції доступу до джерела даних);
- **ACID** - набір властивостей надійності транзакційної системи (Atomicity, Consistency, Isolation, Durability);
- **I/O** - Input/Output (операції введення-виведення даних);
- **IPC** - Inter-Process Communication (механізми міжпроцесної взаємодії).

## Вступ

У попередніх лекціях розглядалися механізми збереження стану користувача за допомогою сесій і Cookies, а також обробка клієнтських запитів у пам'яті скрипта. Проте оперативна пам'ять процесу веб-сервера є тимчасовою: після завершення обробки HTTP-запиту всі локальні змінні знищуються збірником сміття.

Для створення масштабованих інформаційних систем необхідний надійний механізм довготривалого збереження (Persistence Layer). У сучасній веб-архітектурі сервер бази даних є окремим самостійним сервісом, а бекенд-застосунок виступає в ролі його мережевого клієнта. 

У цій лекції детально розглядається, як бекенд взаємодіє з СКБД на рівні сокетів і протоколів, як реалізується життєвий цикл з'єднання, чому конкатенація рядків у запитах є критичною вразливістю і як працюють механізми підготовлених виразів (Prepared Statements). Окрему увагу приділено практичному написанню надійного коду на базі розширення PHP PDO та порівнянню підходів до роботи з БД у ключових серверних мовах програмування: Node.js, Python, Go та C#.

---

## 1. Архітектура взаємодії бекенду та бази даних: від сокета до коду

Бекенд веб-застосунку та сервер бази даних (наприклад, MySQL, MariaDB або PostgreSQL) здебільшого функціонують як два незалежні процеси операційної системи. Вони можуть працювати на одній фізичній машині (localhost) або на різних серверах у локальній чи хмарній мережі.

```
+------------------+         HTTP (порт 80/443)         +----------------------+
|  Клієнт/Браузер  | ---------------------------------> |   Веб-сервер/PHP     |
+------------------+                                    +----------------------+
                                                                   |
                                                                   | TCP-сокет (порт 3306)
                                                                   | Wire Protocol (двійковий)
                                                                   v
                                                        +----------------------+
                                                        |  Сервер СКБД (MySQL) |
                                                        |  - Парсер SQL        |
                                                        |  - Оптимізатор       |
                                                        |  - InnoDB Engine     |
                                                        +----------------------+
```

### Мережевий та протокольний рівні

Взаємодія між бекендом та СКБД відбувається через механізми IPC або мережевий стек:

- мережевий TCP/IP сокет - стандартний спосіб комунікації (наприклад, `127.0.0.1:3306` для MySQL). Дозволяє легко розносити бекенд і базу на різні сервери або контейнери;
- Unix Domain Socket - локальний файл-сокет у Linux-системах (наприклад, `/var/run/mysqld/mysqld.sock`). Забезпечує на 15–30% вищу швидкість передачі даних за рахунок уникнення опрацювання мережевого стеку TCP/IP;
- двійковий протокол клієнта (Wire Protocol) - специфічний двійковий формат кадрів кожної СКБД. Драйвер мови програмування пакує команди SQL у двійкові пакети, передає їх через сокет, отримує відповідь від СКБД та розпаковує двійкові байти у нативні типи даних (числа, рядки, булеві прапорці).

### Рівні абстракції доступу до даних

У сучасній бекенд-інженерії роботу з базами даних поділяють на кілька рівнів:

- низькорівневий мережевий драйвер - бібліотека на мові C або нативній мові платформи (наприклад, `ext/mysqli`, `node-mysql2`, `psycopg2`), що реалізує Wire Protocol СКБД;
- уніфікований шар абстракції БД - стандартизований інтерфейс доступу незалежно від рушія (PHP PDO, Python DB-API PEP 249, Go `database/sql`, C# ADO.NET);
- конструктор запитів (Query Builder) - об'єктно-орієнтований будівельник SQL без ручного зшивання рядків (Doctrine DBAL, Knex.js, Laravel Query Builder);
- об'єктно-реляційне відображення (ORM) - високорівнева парадигма, що перетворює таблиці на класи, а рядки на об'єкти (Doctrine ORM, Hibernate, Entity Framework Core, SQLAlchemy, Prisma).

---

## 2. Життєвий цикл підключення: Per-Request vs Connection Pooling

Архітектура середовища виконання мови програмування безпосередньо визначає стратегію керування з'єднаннями з базою даних.

### Модель одноразового з'єднання (Per-Request у PHP)

Класичний PHP використовує модель ізольованих процесів («Shared-Nothing Architecture»):

- надходження запиту - веб-сервер запускає або виділяє робочий процес PHP-FPM під конкретний HTTP-запит;
- ініціалізація з'єднання - бекенд відкриває новий TCP-сокет, виконує TCP Handshake, проводить автентифікацію з БД (перевірка пароля та схеми);
- виконання запитів - скрипт надсилає запити `SELECT` чи `INSERT` та генерує відповідь;
- розрив з'єднання - по завершенню генерації HTML/JSON процес PHP закриває сокет та звільняє пам'ять.

Ця модель є абсолютно надійною щодо витоків пам'яті (пам'ять гарантовано очищується після кожного запиту), проте відкриття TCP-з'єднання на кожен запит створює додаткові накладні витрати часу (від 5 до 50 мс).

### Модель пулу з'єднань (Connection Pooling)

У довгоживучих застосунках (Node.js, Go, Python/FastAPI, C#, Java, а також у PHP з використанням серверів FrankenPHP, Swoole або RoadRunner) застосунок не перезапускається між HTTP-запитами.

**Пул з'єднань (Connection Pool)** — це кеш активних, заздалегідь відкритих з'єднань до бази даних:

- ініціалізація пулу - під час запуску сервера відкривається фіксована кількість з'єднань (наприклад, 10–20 активних сокетів);
- оренда з'єднання - коли приходить HTTP-запит, обробник миттєво бере готове з'єднання з пулу без затримок на рукостискання та авторизацію;
- повернення в пул - після виконання SQL-операцій з'єднання не розривається, а повертається назад у пул для обслуговування наступних запитів;
- економія ресурсів - база даних не витрачає процесорний час на створення та знищення тисяч з'єднань за секунду.

---

## 3. Підключення до бази даних у PHP: інтерфейс PDO

Для надійного програмування роботи з базами даних у сучасному PHP стандартом є розширення **PDO (PHP Data Objects)**. Воно замінило застаріле процедурне розширення `mysql_*` (видалене з мови в PHP 7.0) і має переваги над `mysqli`:

- єдиний API для 12+ типів СКБД (MySQL, PostgreSQL, SQLite, MS SQL, Oracle) - зміна СКБД потребує лише зміни рядка DSN;
- обов'язкова підтримка об'єктно-орієнтованої обробки помилок через винятки (`PDOException`);
- гнучкі механізми мапінгу результатів у асоціативні масиви, анонімні структури або конкретні класи бізнес-моделей;
- вбудований захист від ін'єкцій завдяки клієнтським та серверним Prepared Statements.

### Безпечна конфігурація з'єднання та рядок DSN

Хардкодити логіни та паролі від бази даних безпосередньо у вихідному коді категорично заборонено правилами безпеки (ризик витоку в репозиторій Git). Конфігурація повинна зчитуватися зі змінних оточення (файл `.env` або системні параметри):

```php
<?php
declare(strict_types=1);

// Завантаження конфігурації зі змінних середовища з дефолтними значеннями
$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'task_manager';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbCharset = 'utf8mb4';

// Формування рядка DSN (Data Source Name)
$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset={$dbCharset}";
```

### Критичні атрибути конфігурації PDO

При ініціалізації екземпляра класу `PDO` необхідно передавати масив параметрів оптимізації та безпеки:

- `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION` - змушує PDO викидати виняток `PDOException` при виникненні будь-якої SQL-помилки, усуваючи "мовчазні" збої програми;
- `PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC` - автоматично повертає результати у вигляді чистих асоціативних масивів без подвоєння пам'яті через числові індекси;
- `PDO::ATTR_EMULATE_PREPARES => false` - вимикає емуляцію підготовлених виразів у самому PHP, змушуючи MySQL використовувати справжні скомпільовані серверні запити;
- `PDO::ATTR_STRINGIFY_FETCHES => false` - запобігає перетворенню числових та десяткових полів таблиці у рядки PHP, зберігаючи нативну типізацію (`int`, `float`).

### Практична реалізація класу підключення (Database Connection Factory)

```php
<?php
declare(strict_types=1);

final class Database
{
    private static ?PDO $instance = null;

    /**
     * Закритий конструктор для запобігання створенню екземплярів через new.
     */
    private function __construct() {}

    /**
     * Отримання єдиного підключення до БД протягом виконання HTTP-запиту.
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $port = getenv('DB_PORT') ?: '3306';
            $db   = getenv('DB_NAME') ?: 'task_manager';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') ?: '';
            
            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
                PDO::ATTR_TIMEOUT            => 5, // Таймаут підключення в секундах
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // У продакшн-середовищі ніколи не виводьте сирий $e->getMessage() клієнту,
                // оскільки він містить пароль та конфігурацію сервера!
                error_log("Database connection error: " . $e->getMessage());
                throw new RuntimeException("Помилка з'єднання з базою даних. Спробуйте пізніше.");
            }
        }

        return self::$instance;
    }
}
```

---

## 4. Програмування CRUD-операцій на бекенді

### Що таке CRUD

**CRUD** — абревіатура чотирьох базових операцій, що виконуються над будь-якими даними в будь-якій системі:

| Літера | Операція   | SQL-команда | HTTP-метод (REST) | Приклад у «Менеджері завдань»       |
|:------:|------------|:-----------:|:-----------------:|-------------------------------------|
| **C**  | Create     | `INSERT`    | `POST`            | Додати нове завдання                |
| **R**  | Read       | `SELECT`    | `GET`             | Отримати список або одне завдання   |
| **U**  | Update     | `UPDATE`    | `PUT` / `PATCH`   | Змінити назву або позначити виконаним |
| **D**  | Delete     | `DELETE`    | `DELETE`          | Видалити завдання                   |

Кожна операція має чіткий SQL-еквівалент:

```sql
-- CREATE: вставка нового рядка
INSERT INTO tasks (title, deadline, is_completed, user_id)
VALUES ('Вивчити PDO', '2026-12-01', 0, 5);

-- READ: вибірка одного або всіх записів
SELECT id, title, deadline, is_completed
FROM tasks
WHERE user_id = 5
ORDER BY created_at DESC;

-- UPDATE: зміна існуючого рядка
UPDATE tasks
SET is_completed = 1, updated_at = NOW()
WHERE id = 12 AND user_id = 5;

-- DELETE: видалення рядка
DELETE FROM tasks
WHERE id = 12 AND user_id = 5;
```

> Умова `AND user_id = 5` у `UPDATE` та `DELETE` — обов'язкова практика безпеки: користувач повинен мати змогу редагувати або видаляти **лише свої** завдання. Без неї будь-який авторизований користувач міг би знищити чужі дані, просто знаючи `id` запису.

### Проблема SQL-ін'єкцій та механізм Prepared Statements

Уразливість SQL-ін'єкції (SQL Injection) виникає, коли дані, введені користувачем, конкатенуються безпосередньо у текст запиту:

```php
// КАТАСТРОФІЧНО НЕБЕЗПЕЧНИЙ КОД:
$email = $_POST['email']; // Користувач ввів: admin@dev.ua' OR '1'='1
$sql = "SELECT * FROM users WHERE email = '" . $email . "'";
// У результаті на виконання йде запит:
// SELECT * FROM users WHERE email = 'admin@dev.ua' OR '1'='1'
// Умова '1'='1' повертає всі записи, хакер успішно авторизується як адмін!
```

**Як розв'язують проблему підготовлені вирази (Prepared Statements):**
- етап підготовки (Prepare) - бекенд надсилає до сервера бази даних лише SQL-шаблон із маркерами (плейсхолдерами `:email` або `?`). Сервер БД компілює та кешує план виконання цього запиту. Структура запиту фіксується назавжди;
- етап виконання (Execute) - бекенд передає реальні значення змінних окремим мережевим пакетом. СКБД розглядає ці значення виключно як дані (літерали). Навіть якщо рядок містить синтаксичні команди на зразок `OR 1=1` чи `DROP TABLE`, база ніколи не виконає їх як код.

### 4.1. Створення даних (Create / INSERT)

Розглянемо додавання нового завдання до таблиці `tasks` із поверненням згенерованого автоінкрементного первинного ключа:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function createTask(int $userId, string $title, ?string $description): int
{
    $pdo = Database::getConnection();

    // 1. Формуємо шаблон SQL з іменованими плейсхолдерами
    $sql = "INSERT INTO tasks (user_id, title, description, is_completed, created_at) 
            VALUES (:user_id, :title, :description, :is_completed, NOW())";

    // 2. Відправляємо шаблон на компіляцію в СКБД
    $stmt = $pdo->prepare($sql);

    // 3. Передаємо фактичні параметри та виконуємо запит
    $stmt->execute([
        'user_id'      => $userId,
        'title'        => $title,
        'description'  => $description,
        'is_completed' => 0
    ]);

    // 4. Отримуємо згенерований AUTO_INCREMENT ідентифікатор рядка
    return (int) $pdo->lastInsertId();
}

// Виклик функції:
$newTaskId = createTask(1, 'Вивчити PDO та підготовлені запити', 'Розглянути параметризацію');
echo "Створено завдання з ID: " . $newTaskId;
```

### 4.2. Читання даних (Read / SELECT)

Для вибірки даних об'єкт `PDOStatement` надає методи `fetch()` (повертає один рядок) та `fetchAll()` (повертає двовимірний масив усіх рядків).

#### Вибірка одного запису:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function findTaskById(int $taskId): ?array
{
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("SELECT id, user_id, title, description, is_completed, created_at 
                           FROM tasks 
                           WHERE id = :id 
                           LIMIT 1");
    
    $stmt->execute(['id' => $taskId]);
    
    $result = $stmt->fetch(); // Використовує налаштований за замовчуванням PDO::FETCH_ASSOC

    // Якщо запис не знайдено, fetch() повертає false
    return $result ?: null;
}
```

#### Вибірка колекції записів із фільтрацією:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function getUserTasks(int $userId, bool $onlyCompleted = false): array
{
    $pdo = Database::getConnection();

    $sql = "SELECT id, title, is_completed, created_at 
            FROM tasks 
            WHERE user_id = :user_id";

    $params = ['user_id' => $userId];

    if ($onlyCompleted) {
        $sql .= " AND is_completed = :status";
        $params['status'] = 1;
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return $stmt->fetchAll();
}
```

#### Потокова вибірка великих обсягів даних:

Якщо вибірка містить сотні тисяч рядків, використання `fetchAll()` призведе до аварійного завершення скрипта через перевищення ліміту пам'яті (`Allowed memory size exhausted`). У таких випадках використовують ітерацію через `fetch()` у циклі:

```php
// Економічне зчитування по одному рядку без завантаження всієї таблиці в RAM
$stmt = $pdo->prepare("SELECT id, email FROM large_dataset_users");
$stmt->execute();

while ($row = $stmt->fetch()) {
    // Обробляємо один рядок, пам'ять залишається стабільною
    sendNotification($row['email']);
}
```

### 4.3. Оновлення даних (Update / UPDATE)

При оновленні даних обов'язково контролюється кількість фактично змінених записів за допомогою методу `rowCount()`:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function updateTaskStatus(int $taskId, int $userId, bool $isCompleted): bool
{
    $pdo = Database::getConnection();

    $sql = "UPDATE tasks 
            SET is_completed = :status 
            WHERE id = :task_id AND user_id = :user_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'status'  => $isCompleted ? 1 : 0,
        'task_id' => $taskId,
        'user_id' => $userId
    ]);

    // Метод rowCount() повертає кількість змінених рядків
    return $stmt->rowCount() > 0;
}
```

### 4.4. Видалення даних (Delete / DELETE)

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function deleteTask(int $taskId, int $userId): bool
{
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :task_id AND user_id = :user_id");
    $stmt->execute([
        'task_id' => $taskId,
        'user_id' => $userId
    ]);

    return $stmt->rowCount() > 0;
}
```

### 4.5. Управління транзакціями (Transactions)

Транзакція гарантує виконання групи пов'язаних SQL-запитів як єдиного атомарного блоку (принцип Atomicity у вимогах ACID). Якщо хоча б один запит завершується помилкою, всі попередні зміни відкочуються назад:

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

function transferCredits(int $fromUserId, int $toUserId, int $amount): void
{
    $pdo = Database::getConnection();

    try {
        // Початок транзакції
        $pdo->beginTransaction();

        // 1. Списання балансу
        $stmtDeduct = $pdo->prepare("UPDATE accounts SET balance = balance - :amount 
                                     WHERE user_id = :user_id AND balance >= :amount");
        $stmtDeduct->execute(['amount' => $amount, 'user_id' => $fromUserId]);

        if ($stmtDeduct->rowCount() === 0) {
            throw new RuntimeException("Недостатньо коштів на балансі або користувача не існує.");
        }

        // 2. Нарахування балансу
        $stmtAdd = $pdo->prepare("UPDATE accounts SET balance = balance + :amount 
                                  WHERE user_id = :user_id");
        $stmtAdd->execute(['amount' => $amount, 'user_id' => $toUserId]);

        // Фіксація всіх змін
        $pdo->commit();
        echo "Переказ успішно виконано.";

    } catch (Throwable $e) {
        // У разі будь-якого збою відкочуємо всі зміни до початкового стану
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Transaction failed: " . $e->getMessage());
        throw $e;
    }
}
```

---

## 5. Порівняльний аналіз роботи з базами даних у різних мовах програмування

Концепція клієнт-серверної взаємодії з БД є універсальною, проте кожна серверна мова програмування використовує власні парадигми виконання коду (блокуючий I/O, асинхронні цикли подій або легковагі потоки) та синтаксичні конструкції.

Нижче наведено розв'язання ідентичної задачі (створення з'єднання, виконання параметризованого запиту вибірки за `user_id` та повернення типізованого результату) у 5 ключових серверних технологіях.

### 5.1. PHP (Синхронний I/O, нативний інтерфейс PDO)

```php
<?php
// PHP: Синхронна модель виконання, ізольований життєвий цикл
$pdo = new PDO('mysql:host=localhost;dbname=task_manager;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$stmt = $pdo->prepare("SELECT id, title, is_completed FROM tasks WHERE user_id = :user_id");
$stmt->execute(['user_id' => 1]);
$tasks = $stmt->fetchAll();

foreach ($tasks as $task) {
    echo "Завдання: {$task['title']} (Статус: {$task['is_completed']})\n";
}
```

### 5.2. Node.js (Асинхронний неблокуючий I/O, бібліотека `mysql2/promise`)

У Node.js код виконується в одному потоці з циклом подій (Event Loop). Операції введення-виведення ніколи не блокують головний потік, а з'єднання організуються у постійний пул:

```javascript
// Node.js (ES Module / TypeScript)
import mysql from 'mysql2/promise';

// Створення пулу постійних з'єднань
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'task_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function getUserTasks(userId) {
    try {
        // Запит використовує позиційні плейсхолдери (?) і повертає проміс
        const [rows] = await pool.execute(
            'SELECT id, title, is_completed FROM tasks WHERE user_id = ?',
            [userId]
        );

        for (const task of rows) {
            console.log(`Завдання: ${task.title} (Статус: ${task.is_completed})`);
        }
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

await getUserTasks(1);
```

### 5.3. Python (Синхронний стандарт PEP 249 / DB-API 2.0)

У Python робота з реляційними базами регламентується стандартом DB-API 2.0 через курсори (`cursor`) та контекстні менеджери (`with`), що гарантують закриття ресурсів:

```python
# Python 3: Бібліотека mysql-connector-python
import mysql.connector

config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'task_manager',
    'autocommit': True
}

def get_user_tasks(user_id: int):
    # Контекстний менеджер автоматично звільняє ресурси з'єднання
    with mysql.connector.connect(**config) as connection:
        with connection.cursor(dictionary=True) as cursor:
            query = "SELECT id, title, is_completed FROM tasks WHERE user_id = %s"
            # Параметри передаються у вигляді кортежу
            cursor.execute(query, (user_id,))
            tasks = cursor.fetchall()

            for task in tasks:
                print(f"Завдання: {task['title']} (Статус: {task['is_completed']})")
            return tasks

get_user_tasks(1)
```

### 5.4. Go (Компульсивна типізація, вбудований пакет `database/sql`)

У Go стандартна бібліотека містить вбудований потокобезпечний Connection Pool. Отримані результати вимагають явного сканування у заздалегідь оголошені типи:

```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/go-sql-driver/mysql"
)

type Task struct {
	ID          int
	Title       string
	IsCompleted bool
}

func main() {
	// sql.Open не відкриває з'єднання миттєво, а ініціалізує пул
	db, err := sql.Open("mysql", "root:@tcp(localhost:3306)/task_manager")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Налаштування пулу з'єднань
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	rows, err := db.Query("SELECT id, title, is_completed FROM tasks WHERE user_id = ?", 1)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.Title, &t.IsCompleted); err != nil {
			log.Fatal(err)
		}
		tasks = append(tasks, t)
		fmt.Printf("Завдання: %s (Статус: %t)\n", t.Title, t.IsCompleted)
	}
}
```

### 5.5. C# (.NET, високопродуктивний ADO.NET)

Платформа .NET використовує шар ADO.NET з нативною підтримкою пулу з'єднань на рівні операційної системи та конструкцією `using` для гарантованої утилізації сокетів:

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MySqlConnector;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
}

public class Program
{
    private const string ConnectionString = "Server=localhost;Database=task_manager;Uid=root;Pwd=;";

    public static async Task Main()
    {
        var tasks = new List<TaskItem>();

        await using var connection = new MySqlConnection(ConnectionString);
        await connection.OpenAsync();

        var sql = "SELECT id, title, is_completed FROM tasks WHERE user_id = @userId";
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@userId", 1);

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var task = new TaskItem
            {
                Id = reader.GetInt32("id"),
                Title = reader.GetString("title"),
                IsCompleted = reader.GetBoolean("is_completed")
            };
            tasks.Add(task);
            Console.WriteLine($"Завдання: {task.Title} (Статус: {task.IsCompleted})");
        }
    }
}
```

### Зведена таблиця порівняння технологій роботи з БД

| Параметр | PHP (PDO) | Node.js (`mysql2`) | Python (DB-API) | Go (`database/sql`) | C# (ADO.NET) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Модель виконання I/O** | Синхронна блокуюча | Асинхронна (Event Loop) | Синхронна (є `asyncio`) | Конкурентна (горутини) | Асинхронна (`async/await`) |
| **Connection Pooling** | Ні (тільки через сервери застосунків або проксі) | Так (вбудовано в бібліотеку) | Потрібні бібліотеки (SQLAlchemy Pool) | Так (вбудовано в стандартну бібліотеку) | Так (вбудовано на рівні драйвера) |
| **Стиль плейсхолдерів** | Іменовані (`:id`) та позиційні (`?`) | Позиційні (`?`) | Форматні (`%s`) або іменовані (`%(name)s`) | Позиційні (`?` або `$1`) | Іменовані (`@id`) |
| **Гідрація результатів** | Асоціативні масиви або об'єкти | Масиви чистих JS-об'єктів | Словники (`dict`) або кортежі | Сканування у структури (`rows.Scan`) | Типізоване читання (`reader.Get...`) |
| **Популярні ORM / Builders** | Eloquent, Doctrine, Cycle | Prisma, TypeORM, Drizzle, Knex | SQLAlchemy, Django ORM, Tortoise | GORM, Ent, SQLBoiler | Entity Framework Core, Dapper |

---

## 6. Архітектурні патерни та оптимізація продуктивності бекенду

Професійний бекенд-код вимагає не лише коректного синтаксису запитів, а й правильного структурування шарів застосунку та дотримання практик високої продуктивності.

### Патерн Repository (Ізоляція SQL-запитів)

Змішування прямого виклику PDO з логікою HTTP-контролерів чи шаблонами відображення веде до спагеті-коду. Патерн **Repository** інкапсулює роботу з БД у спеціалізованому класі:

```
[HTTP Контролер] ---> [TaskRepositoryInterface] ---> [TaskRepository (PDO)] ---> [MySQL]
```

```php
<?php
declare(strict_types=1);

interface TaskRepositoryInterface
{
    public function findById(int $id): ?array;
    public function getActiveByUserId(int $userId): array;
    public function create(int $userId, string $title, ?string $description): int;
}

final class TaskRepository implements TaskRepositoryInterface
{
    public function __construct(private readonly PDO $pdo) {}

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function getActiveByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE user_id = :uid AND is_completed = 0");
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetchAll();
    }

    public function create(int $userId, string $title, ?string $description): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO tasks (user_id, title, description, is_completed, created_at)
                                     VALUES (:uid, :title, :desc, 0, NOW())");
        $stmt->execute([
            'uid'   => $userId,
            'title' => $title,
            'desc'  => $description
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}
```

### Проблема N+1 запитів та методи її усунення

Проблема N+1 — класична помилка продуктивності, коли для списку з N сутностей бекенд робить один запит на отримання списку і потім у циклі робить ще N запитів для отримання пов'язаних даних.

```php
// НЕЕФЕКТИВНО: 1 + 100 = 101 запит до бази даних!
$users = $pdo->query("SELECT id, username FROM users LIMIT 100")->fetchAll();
foreach ($users as $user) {
    // На кожній ітерації циклу бекенд здійснює окремий мережевий запит до MySQL
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tasks WHERE user_id = :id");
    $stmt->execute(['id' => $user['id']]);
    $taskCount = $stmt->fetchColumn();
}
```

```php
// ЕФЕКТИВНО: 1 єдиний запит із використанням агрегації та об'єднання (JOIN)
$sql = "SELECT u.id, u.username, COUNT(t.id) AS total_tasks 
        FROM users u 
        LEFT JOIN tasks t ON u.id = t.user_id 
        GROUP BY u.id, u.username 
        LIMIT 100";

$usersWithTasks = $pdo->query($sql)->fetchAll();
// Бекенд отримує весь готовий масив за один мережевий пакет!
```

---

## Висновки

- архітектура клієнт-серверної взаємодії - бекенд взаємодіє з СКБД як мережевий клієнт через сокети та двійкові протоколи, що дозволяє масштабувати сервери незалежно;
- різниця моделей керування з'єднаннями - класичний PHP використовує модель Per-Request, тоді як довгоживучі сервіси (Node.js, Go, Python, C#) застосовують Connection Pooling для мінімізації накладних витрат на TCP-рукостискання;
- універсальність інтерфейсу PDO - об'єктно-орієнтований драйвер PHP забезпечує єдиний стандарт доступу, строгу обробку помилок через винятки та безпечну роботу з різними СКБД;
- захист через підготовлені вирази - механізм Prepared Statements фундаментально унеможливлює SQL-ін'єкції завдяки розділенню фази компіляції шаблону запиту від фази передачі даних;
- транзакційна цілісність бізнес-операцій - методи `beginTransaction()`, `commit()` та `rollBack()` гарантують неподільність взаємопов'язаних змін у базі за стандартами ACID;
- міжмовна спільність концепцій - попри відмінності в синтаксисі та моделях вводу-виводу (блокуючий vs асинхронний Event Loop), принципи параметризації, мапінгу типів та пулінгу з'єднань залишаються незмінними в усіх мовах;
- проєктування шару доступу до даних - використання патерну Repository усуває змішування SQL із бізнес-логікою, а оптимізація запитів запобігає виникненню критичної проблеми N+1.

---

## Рекомендована література та джерела

- офіційна документація PHP: розширення PDO та робота з базами даних - https://www.php.net/manual/en/book.pdo.php;
- посібник з безпечного використання PHP PDO на PHP Delusions - https://phpdelusions.net/pdo;
- специфікація стандарту баз даних Python PEP 249 (Python Database API Specification v2.0) - https://peps.python.org/pep-0249/;
- керівництво з пакета `database/sql` у мові програмування Go - https://go.dev/doc/database/;
- офіційна документація з асинхронного драйвера `mysql2` для платформи Node.js - https://sidorares.github.io/node-mysql2/docs;
- керівництво з високоефективної роботи з базами даних у Microsoft .NET - https://learn.microsoft.com/en-us/dotnet/framework/data/adonet/.

---

## Запитання для самоперевірки

- чому взаємодія бекенду з СКБД через Unix Domain Socket відбувається швидше, ніж через мережевий TCP/IP сокет;
- у чому полягає різниця між моделлю з'єднань Per-Request у PHP та пулом з'єднань (Connection Pool) у середовищах Node.js чи Go;
- які критичні атрибути конфігурації PDO слід обов'язково активувати під час ініціалізації об'єкта підключення до бази даних;
- чому звичайна конкатенація рядків при формуванні SQL-запиту є небезпечною, і як саме Prepared Statements захищають застосунок від атак типу SQL Injection;
- який метод об'єкта PDO слід викликати для отримання згенерованого автоінкрементного первинного ключа після виконання команди `INSERT`;
- як реалізувати безпечний відкат змін у базі даних за допомогою блоку `try...catch` та методів керування транзакціями;
- у чому полягає суть проблеми продуктивності N+1 запитів, і як її можна усунути на рівні формулювання SQL-запиту.
