# Лекція 13 (2 години). Програмування повного циклу CRUD та патерн Repository

## План лекції

1. Від процедурного CRUD до патерну Repository: навіщо ізолювати SQL від бізнес-логіки.
2. Проєктування інтерфейсу сховища та реалізація `TaskRepository` на базі PDO.
3. Підготовлені вирази: іменовані та позиційні плейсхолдери, методи `prepare()`, `execute()`, `bindValue()`.
4. Отримання ідентифікатора через `lastInsertId()` та контроль результатів через `rowCount()`.
5. Пагінація вибірок: підрахунок через `COUNT(*)` та обмеження через `LIMIT` і `OFFSET`.
6. Управління транзакціями: `beginTransaction()`, `commit()`, `rollBack()` та гарантії ACID.

## Перелік умовних скорочень

- **CRUD** — Create, Read, Update, Delete; чотири базові операції над даними у будь-якій інформаційній системі.
- **Repository** — архітектурний патерн проєктування; клас, що інкапсулює всю логіку доступу до конкретної таблиці бази даних і надає зовнішнім споживачам набір доменних методів.
- **Prepared Statement** — підготовлений вираз; SQL-шаблон із плейсхолдерами, який СУБД компілює окремо від переданих даних.
- **Плейсхолдер** — маркер-заповнювач у шаблоні SQL-запиту (іменований `:param` або позиційний `?`), що позначає місце підстановки безпечного значення.
- **PDO** — PHP Data Objects; уніфікований об'єктно-орієнтований інтерфейс для роботи з різними СУБД.
- **`lastInsertId()`** — метод PDO, що повертає значення первинного ключа (`AUTO_INCREMENT`) останнього вставленого рядка.
- **`rowCount()`** — метод `PDOStatement`, що повертає кількість рядків, фактично змінених останньою операцією `UPDATE` або `DELETE`.
- **Пагінація** — поділ великого набору результатів на окремі сторінки фіксованого розміру за допомогою SQL-конструкцій `LIMIT` і `OFFSET`.
- **Транзакція** — послідовність SQL-операцій, що виконуються як єдиний неподільний блок і підпорядковуються вимогам ACID.
- **ACID** — Atomicity, Consistency, Isolation, Durability; набір фундаментальних властивостей, що гарантують надійність транзакцій у реляційних СУБД.

## Вступ

У попередній лекції ми розглянули архітектуру мережевої взаємодії бекенду з СУБД, налаштування з'єднання через PDO та написали перші CRUD-функції. Проте всі SQL-запити були реалізовані як окремі процедурні функції, розкидані по різних файлах. У реальному проєкті кількість операцій із базою даних швидко зростає: крім простих вибірок з'являються фільтрація за статусом, пагінація, підрахунок статистики, масові оновлення та видалення.

Якщо продовжувати писати SQL-запити безпосередньо в контролері або в головному скрипті `index.php`, ми отримаємо код, у якому бізнес-логіка, обробка HTTP-запитів та текст SQL-запитів нероздільно переплетені. Будь-яка зміна в назві таблиці або структурі поля зачепить десятки місць у коді.

У цій лекції ми розглянемо **патерн Repository** — архітектурний підхід, що збирає всі SQL-операції для конкретної сутності (наприклад, `Task`) у єдиний спеціалізований клас. Ми побудуємо повноцінний `TaskRepository` із підтримкою фільтрації за користувачем, пагінації та транзакцій, і побачимо, як цей патерн готує нашу кодову базу до подальшого переходу на архітектуру MVC.

---

## 1. Від процедурного CRUD до патерну Repository

### Проблема: SQL-запити розсипані по коду

Розглянемо типовий стан проєкту після попередніх лабораторних. Код додавання завдання, перемикання статусу та видалення написаний прямо в точці входу `index.php`:

```php
<?php
// index.php — всі SQL-запити змішані з обробкою HTTP і логікою представлення
session_start();
$pdo = Database::getConnection();
$userId = (int) $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $title = $_POST['title'] ?? '';
        $stmt = $pdo->prepare('INSERT INTO tasks (user_id, title) VALUES (:uid, :title)');
        $stmt->execute(['uid' => $userId, 'title' => $title]);
        header('Location: index.php');
        exit;
    }

    if ($action === 'complete') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare('UPDATE tasks SET is_completed = 1 WHERE id = :id AND user_id = :uid');
        $stmt->execute(['id' => $id, 'uid' => $userId]);
        header('Location: index.php');
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :uid');
        $stmt->execute(['id' => $id, 'uid' => $userId]);
        header('Location: index.php');
        exit;
    }
}

// Вибірка завдань для відображення
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = :uid ORDER BY id DESC');
$stmt->execute(['uid' => $userId]);
$tasks = $stmt->fetchAll();
?>
<!-- HTML-код сторінки... -->
```

### Чому такий підхід створює проблеми

- дублювання SQL — конструкція `WHERE user_id = :uid` з'являється в кожному запиті; зміна назви стовпця вимагає виправлень у десятках місць;
- неможливість тестування — щоб перевірити, чи коректно додається завдання, необхідно симулювати повний HTTP-запит із `$_POST` і `$_SESSION`;
- порушення принципу єдиної відповідальності (SRP) — один файл одночасно відповідає за маршрутизацію, доступ до бази, валідацію та генерацію HTML;
- складність повторного використання — якщо потрібно отримати завдання користувача з іншого скрипта (наприклад, з API), доведеться копіювати SQL-запит.

### Рішення: патерн Repository

**Repository** — це клас, що інкапсулює всю логіку доступу до конкретної таблиці бази даних. Зовнішній код (контролер, скрипт, тест) взаємодіє з репозиторієм через зрозумілі доменні методи замість того, щоб самостійно писати SQL:

```
Зовнішній код                  Repository                    База даних
─────────────────────────────────────────────────────────────────────────
$repo->findAllByUser(5)  →  SELECT * FROM tasks WHERE...  →  MySQL
$repo->add(5, 'Тест')   →  INSERT INTO tasks (...) ...   →  MySQL
$repo->complete(12, 5)   →  UPDATE tasks SET ...          →  MySQL
$repo->delete(12, 5)     →  DELETE FROM tasks WHERE ...   →  MySQL
```

Переваги патерну Repository:
- ізоляція SQL — весь SQL для таблиці `tasks` зібрано в одному файлі `TaskRepository.php`; при зміні структури таблиці редагується лише цей файл;
- контракт через інтерфейс — зовнішній код залежить від інтерфейсу `TaskStorageInterface`, а не від конкретної реалізації; це дозволяє підмінити PDO-репозиторій на файловий або тестовий без зміни логіки;
- тестування — репозиторій можна протестувати ізольовано, передавши тестову базу або мок-об'єкт PDO;
- перевикористання — будь-який компонент системи може використати метод `$repo->findAllByUser()` без повторного написання SQL.

---

## 2. Проєктування інтерфейсу сховища та реалізація `TaskRepository`

### Інтерфейс `TaskStorageInterface`

Перш ніж писати реалізацію, визначимо **контракт** — набір методів, який зобов'язаний реалізувати будь-який клас сховища завдань. У попередній лабораторній роботі ми вже створили інтерфейс `TaskStorageInterface` для файлового сховища. Тепер оновимо його з урахуванням реляційної бази даних та фільтрації за користувачем:

```php
<?php
declare(strict_types=1);

interface TaskStorageInterface
{
    /**
     * Повертає масив завдань конкретного користувача з пагінацією.
     *
     * @param int $userId  Ідентифікатор користувача
     * @param int $page    Номер поточної сторінки (починаючи з 1)
     * @param int $perPage Кількість записів на одній сторінці
     * @return Task[]
     */
    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array;

    /**
     * Знаходить конкретне завдання за первинним ключем і перевіряє належність користувачу.
     */
    public function findByIdAndUser(int $id, int $userId): ?Task;

    /**
     * Повертає загальну кількість завдань користувача (для обчислення пагінації).
     */
    public function countByUser(int $userId): int;

    /**
     * Створює нове завдання та повертає його як об'єкт Task.
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
     * Видаляє завдання з бази даних.
     *
     * @throws TaskNotFoundException
     */
    public function delete(int $id, int $userId): bool;
}
```

Зверніть увагу: кожен метод, що змінює або шукає конкретне завдання, приймає параметр `$userId`. Це архітектурний захист на рівні бізнес-логіки — репозиторій фізично не дозволить одному користувачу маніпулювати завданнями іншого.

### Повна реалізація класу `TaskRepository`

```php
<?php
declare(strict_types=1);

class TaskRepository implements TaskStorageInterface
{
    /**
     * PDO-з'єднання передається через конструктор (Dependency Injection).
     * Це дозволяє підмінити реальну БД на тестову під час тестування.
     */
    public function __construct(private PDO $pdo) {}

    /**
     * Повертає сторінку завдань конкретного користувача.
     */
    public function findAllByUser(int $userId, int $page = 1, int $perPage = 5): array
    {
        $offset = ($page - 1) * $perPage;

        $sql = '
            SELECT id, user_id, title, is_completed, deadline, created_at, updated_at
            FROM tasks
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit',   $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        return array_map(fn(array $row) => Task::fromArray($row), $rows);
    }

    /**
     * Знаходить одне завдання за ID та перевіряє належність користувачу.
     */
    public function findByIdAndUser(int $id, int $userId): ?Task
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM tasks WHERE id = :id AND user_id = :user_id LIMIT 1'
        );
        $stmt->execute([':id' => $id, ':user_id' => $userId]);

        $row = $stmt->fetch();
        return $row ? Task::fromArray($row) : null;
    }

    /**
     * Підраховує загальну кількість завдань користувача.
     */
    public function countByUser(int $userId): int
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM tasks WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Створює нове завдання в базі даних.
     */
    public function add(int $userId, string $title, ?string $deadline = null): Task
    {
        $trimmedTitle = trim($title);
        if (empty($trimmedTitle)) {
            throw new ValidationException(['title' => 'Назва завдання не може бути порожньою.']);
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

        // Отримання згенерованого AUTO_INCREMENT ідентифікатора
        $newId = (int) $this->pdo->lastInsertId();

        // Повертаємо повноцінний об'єкт Task із бази
        return $this->findByIdAndUser($newId, $userId);
    }

    /**
     * Позначає завдання як виконане.
     */
    public function complete(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare('
            UPDATE tasks SET is_completed = 1, updated_at = NOW()
            WHERE id = :id AND user_id = :user_id
        ');
        $stmt->execute([':id' => $id, ':user_id' => $userId]);

        if ($stmt->rowCount() === 0) {
            throw new TaskNotFoundException("Завдання з ID {$id} не знайдено.");
        }

        return true;
    }

    /**
     * Видаляє завдання з бази даних.
     */
    public function delete(int $id, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'DELETE FROM tasks WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([':id' => $id, ':user_id' => $userId]);

        if ($stmt->rowCount() === 0) {
            throw new TaskNotFoundException("Завдання з ID {$id} не знайдено.");
        }

        return true;
    }
}
```

Тепер будь-який зовнішній код може використовувати репозиторій, не знаючи деталей SQL:

```php
$pdo = Database::getConnection();
$repo = new TaskRepository($pdo);

// Додавання завдання
$task = $repo->add(userId: 1, title: 'Вивчити патерн Repository', deadline: '2026-12-31');
echo "Створено завдання #{$task->id}: {$task->getTitle()}" . PHP_EOL;

// Отримання списку завдань
$tasks = $repo->findAllByUser(userId: 1, page: 1, perPage: 10);

// Позначення виконаним
$repo->complete(id: $task->id, userId: 1);
```

---

## 3. Підготовлені вирази: іменовані та позиційні плейсхолдери

### Два формати плейсхолдерів

PDO підтримує два взаємовиключних формати плейсхолдерів у межах одного запиту:

#### Іменовані плейсхолдери (`:name`)

Кожен параметр має унікальне ім'я, що починається з двокрапки. Це найбільш читабельний варіант для складних запитів:

```php
$sql = 'SELECT * FROM tasks WHERE user_id = :user_id AND is_completed = :status';
$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':user_id' => 5,
    ':status'  => 0,
]);
```

Переваги іменованих плейсхолдерів:
- самодокументований код — назва `:user_id` однозначно вказує на призначення параметра;
- порядок не має значення — масив параметрів можна передавати в довільній послідовності;
- захист від помилок — при опечатці в назві PDO одразу згенерує виняток.

#### Позиційні плейсхолдери (`?`)

Параметри нумеруються неявно зліва направо, починаючи з позиції 1:

```php
$sql = 'SELECT * FROM tasks WHERE user_id = ? AND is_completed = ?';
$stmt = $pdo->prepare($sql);
$stmt->execute([5, 0]);
```

Позиційні плейсхолдери зручні для коротких запитів із 1–2 параметрами, але при 4+ параметрах код стає нечитабельним, і іменовані плейсхолдери є кращим вибором.

### Метод `bindValue()` проти передачі масиву в `execute()`

Існує два способи передати параметри в підготовлений вираз.

#### Спосіб 1: масив у `execute()` (зручний)

```php
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = :user_id');
$stmt->execute([':user_id' => $userId]);
```

Усі значення передаються як рядки (`PDO::PARAM_STR`). Це працює для більшості сценаріїв, оскільки MySQL автоматично перетворює рядкове `'5'` у ціле число при порівнянні з `INT`-стовпцем.

#### Спосіб 2: `bindValue()` (суворий)

```php
$stmt = $pdo->prepare('SELECT * FROM tasks WHERE user_id = :user_id LIMIT :limit OFFSET :offset');
$stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
$stmt->bindValue(':limit',   $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset',  $offset,  PDO::PARAM_INT);
$stmt->execute();
```

Метод `bindValue()` дозволяє явно вказати тип параметра через третій аргумент:
- `PDO::PARAM_INT` — ціле число;
- `PDO::PARAM_STR` — рядок (за замовчуванням);
- `PDO::PARAM_BOOL` — булеве значення;
- `PDO::PARAM_NULL` — значення `NULL`.

Чому `bindValue()` є обов'язковим для `LIMIT` та `OFFSET`: коли емуляція підготовлених виразів вимкнена (`PDO::ATTR_EMULATE_PREPARES => false`), MySQL очікує, що параметри `LIMIT` та `OFFSET` будуть саме цілими числами. Якщо передати їх через масив `execute()`, PDO відправить їх як рядки, і MySQL згенерує помилку синтаксису.

### Порівняння `bindValue()` та `bindParam()`

Важливо розрізняти ці два схожих метода:

```php
// bindValue() — прив'язує ЗНАЧЕННЯ на момент виклику
$value = 10;
$stmt->bindValue(':limit', $value, PDO::PARAM_INT);
$value = 999;
$stmt->execute(); // Використає 10 — значення зафіксовано при bindValue()

// bindParam() — прив'язує ПОСИЛАННЯ на змінну
$value = 10;
$stmt->bindParam(':limit', $value, PDO::PARAM_INT);
$value = 999;
$stmt->execute(); // Використає 999 — значення зчитується при execute()
```

Метод `bindParam()` корисний при багаторазовому виконанні одного запиту з різними значеннями (наприклад, масова вставка у циклі). У всіх інших випадках рекомендується `bindValue()`, оскільки він простіший і менш схильний до помилок.

---

## 4. Отримання ідентифікатора та контроль результатів

### Метод `lastInsertId()`

Після виконання запиту `INSERT` база даних автоматично генерує значення для стовпця з атрибутом `AUTO_INCREMENT`. Метод `lastInsertId()` дозволяє отримати це значення на стороні PHP:

```php
$stmt = $pdo->prepare('INSERT INTO tasks (user_id, title) VALUES (:uid, :title)');
$stmt->execute(['uid' => 1, 'title' => 'Нове завдання']);

$newId = (int) $pdo->lastInsertId();
// Тепер можна перечитати створений запис повністю:
$task = $repo->findByIdAndUser($newId, 1);
```

Ключові правила використання:
- `lastInsertId()` викликається на об'єкті `$pdo`, а не на `$stmt`;
- він повертає рядок (тому необхідне приведення `(int)`);
- викликати його потрібно **одразу після `execute()`**, до виконання будь-якого іншого запиту — інакше значення буде перезаписане;
- якщо таблиця не має `AUTO_INCREMENT`, метод повертає `'0'`.

### Метод `rowCount()`

Метод `rowCount()` об'єкта `PDOStatement` повертає кількість рядків, **фактично змінених** останньою командою `UPDATE` або `DELETE`:

```php
$stmt = $pdo->prepare('UPDATE tasks SET is_completed = 1 WHERE id = :id AND user_id = :uid');
$stmt->execute(['id' => 42, 'uid' => 1]);

$affectedRows = $stmt->rowCount();

if ($affectedRows === 0) {
    // Жоден рядок не було змінено — запис не існує або вже був виконаний
    throw new TaskNotFoundException("Завдання з ID 42 не знайдено.");
}
```

Поведінка `rowCount()` у різних контекстах:
- після `UPDATE` — повертає кількість рядків, де дані **фактично змінились** (якщо `is_completed` вже дорівнював `1`, повернеться `0`);
- після `DELETE` — повертає кількість видалених рядків;
- після `INSERT` — повертає кількість вставлених рядків (зазвичай `1`);
- після `SELECT` — поведінка **не гарантована** стандартом PDO; для підрахунку кількості вибраних рядків слід використовувати `COUNT(*)` у SQL або `count()` над результатом `fetchAll()`.

---

## 5. Пагінація вибірок: `COUNT(*)`, `LIMIT` та `OFFSET`

### Навіщо потрібна пагінація

Коли таблиця містить тисячі або мільйони рядків, завантаження всього набору даних в один HTML-список є неприйнятним:
- браузер не здатен відрендерити десятки тисяч DOM-елементів без суттєвого уповільнення;
- передача великого обсягу HTML по мережі збільшує час відповіді сервера;
- метод `fetchAll()` для десятків тисяч рядків може перевищити ліміт оперативної пам'яті PHP (`memory_limit`).

Замість цього дані розбивають на **сторінки** (pages) фіксованого розміру, відображаючи навігацію для переходу між ними.

### SQL-конструкції `LIMIT` та `OFFSET`

Ці конструкції додаються в кінці SQL-запиту і визначають, які саме рядки повернути:

```sql
-- LIMIT — максимальна кількість рядків у відповіді
-- OFFSET — скільки рядків пропустити від початку вибірки

-- Сторінка 1 (записи 1–5):
SELECT * FROM tasks WHERE user_id = 1 ORDER BY id DESC LIMIT 5 OFFSET 0;

-- Сторінка 2 (записи 6–10):
SELECT * FROM tasks WHERE user_id = 1 ORDER BY id DESC LIMIT 5 OFFSET 5;

-- Сторінка 3 (записи 11–15):
SELECT * FROM tasks WHERE user_id = 1 ORDER BY id DESC LIMIT 5 OFFSET 10;
```

Формула обчислення зміщення:

```
offset = (page - 1) × perPage
```

Приклад для 3-ї сторінки з 5 записами на сторінку: `offset = (3 - 1) × 5 = 10`.

### Підрахунок загальної кількості записів

Щоб визначити, скільки всього сторінок потрібно відобразити в навігації, спершу підраховуємо загальну кількість записів окремим запитом:

```php
public function countByUser(int $userId): int
{
    $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM tasks WHERE user_id = :user_id');
    $stmt->execute([':user_id' => $userId]);
    return (int) $stmt->fetchColumn();
}
```

Метод `fetchColumn()` повертає значення першого стовпця першого рядка результату — тобто саме число `COUNT(*)`.

### Обчислення параметрів пагінації у контролері

```php
<?php
$perPage    = 5;
$page       = max(1, (int) ($_GET['page'] ?? 1));
$totalTasks = $repo->countByUser($currentUserId);
$totalPages = max(1, (int) ceil($totalTasks / $perPage));

// Захист від запиту неіснуючої сторінки
if ($page > $totalPages) {
    $page = $totalPages;
}

// Вибірка завдань для поточної сторінки
$tasks = $repo->findAllByUser($currentUserId, $page, $perPage);
```

Функція `ceil()` (ceiling — стеля) округлює результат ділення вгору: якщо у нас 13 записів по 5 на сторінку, `ceil(13 / 5) = ceil(2.6) = 3` сторінки.

### Генерація HTML-навігації між сторінками

```php
<?php if ($totalPages > 1): ?>
    <nav class="pagination">
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
    </nav>
<?php endif; ?>
```

### Обмеження OFFSET-пагінації

OFFSET-пагінація є простою і достатньою для більшості навчальних та середніх проєктів, проте має відомий недолік продуктивності: при великому значенні `OFFSET` (наприклад, `OFFSET 50000`) MySQL фізично зчитує та пропускає 50 000 рядків, перш ніж повернути потрібні 5. У промислових системах із мільйонами записів використовують **cursor-based** (keyset) пагінацію через `WHERE id > :last_seen_id ORDER BY id ASC LIMIT :limit`, де зміщення визначається значенням первинного ключа останнього побаченого рядка.

---

## 6. Управління транзакціями: `beginTransaction()`, `commit()`, `rollBack()`

### Що таке транзакція та навіщо вона потрібна

Транзакція — це механізм бази даних, що дозволяє виконати групу SQL-операцій як **єдиний неподільний блок**. Якщо будь-яка операція в середині блоку зазнає невдачі, всі попередні зміни автоматично скасовуються, і база повертається до стану, який був до початку транзакції.

Розглянемо практичний сценарій. Уявіть, що користувач видаляє свій обліковий запис. Система повинна:
- видалити всі завдання користувача з таблиці `tasks`;
- видалити сам запис користувача з таблиці `users`;
- записати подію в таблицю аудиту `audit_log`.

Якщо після видалення завдань, але до видалення користувача станеться збій (втрата з'єднання, помилка SQL), база опиниться в неконсистентному стані: завдання видалено, а користувач залишився. Транзакція гарантує, що або всі три операції виконаються разом, або жодна з них.

### Властивості ACID

Кожна транзакція у реляційній СУБД підпорядковується чотирьом фундаментальним вимогам:

- **Atomicity (Атомарність)** — транзакція є неподільною одиницею роботи: або виконуються всі операції, або жодна;
- **Consistency (Узгодженість)** — після завершення транзакції база переходить із одного валідного стану в інший; порушення обмежень (`FOREIGN KEY`, `UNIQUE`, `NOT NULL`) автоматично відкочують транзакцію;
- **Isolation (Ізольованість)** — паралельні транзакції різних користувачів не бачать проміжних результатів одне одної;
- **Durability (Довговічність)** — після підтвердження (`commit`) дані гарантовано збережені на диску навіть у разі раптового відключення живлення сервера.

### Методи управління транзакціями в PDO

PDO надає три методи для роботи з транзакціями:
- `$pdo->beginTransaction()` — відкриває нову транзакцію; з цього моменту всі зміни тимчасові;
- `$pdo->commit()` — фіксує (підтверджує) всі зміни, зроблені від моменту `beginTransaction()`;
- `$pdo->rollBack()` — скасовує (відкочує) всі зміни до стану перед `beginTransaction()`.

### Практична реалізація: видалення облікового запису з усіма даними

```php
<?php
declare(strict_types=1);

function deleteUserAccount(PDO $pdo, int $userId): void
{
    try {
        // 1. Відкриваємо транзакцію — всі зміни стають тимчасовими
        $pdo->beginTransaction();

        // 2. Видаляємо всі завдання користувача
        $stmtTasks = $pdo->prepare('DELETE FROM tasks WHERE user_id = :user_id');
        $stmtTasks->execute([':user_id' => $userId]);
        $deletedTasks = $stmtTasks->rowCount();

        // 3. Видаляємо самого користувача
        $stmtUser = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmtUser->execute([':id' => $userId]);

        if ($stmtUser->rowCount() === 0) {
            // Користувача з таким ID не існує — відкочуємо всі зміни
            throw new RuntimeException("Користувач з ID {$userId} не знайдений.");
        }

        // 4. Записуємо подію в журнал аудиту
        $stmtLog = $pdo->prepare(
            'INSERT INTO audit_log (action, entity, entity_id, details, created_at) 
             VALUES (:action, :entity, :entity_id, :details, NOW())'
        );
        $stmtLog->execute([
            ':action'    => 'account_deleted',
            ':entity'    => 'user',
            ':entity_id' => $userId,
            ':details'   => "Видалено {$deletedTasks} завдань.",
        ]);

        // 5. Підтверджуємо всі зміни — вони стають остаточними
        $pdo->commit();

    } catch (Throwable $e) {
        // У разі будь-якої помилки відкочуємо ВСІ зміни
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e; // Перекидаємо виняток вище для обробки
    }
}
```

### Правила використання транзакцій

- завжди загортати `beginTransaction()` / `commit()` у блок `try...catch` з `rollBack()` у `catch` — інакше виняток залишить транзакцію відкритою, і наступні запити виконуватимуться в контексті незавершеної транзакції;
- перевіряти `$pdo->inTransaction()` перед викликом `rollBack()` — спроба відкотити неіснуючу транзакцію генерує виняток;
- мінімізувати тривалість транзакції — тримати транзакцію відкритою якомога коротше, щоб не блокувати рядки таблиці для інших паралельних з'єднань;
- не вкладати транзакції — PDO не підтримує вкладені транзакції (виклик `beginTransaction()` всередині іншого `beginTransaction()` згенерує `PDOException`).

### Додатковий приклад: масове створення завдань у транзакції

Транзакції корисні не лише для видалення, але й для будь-якої масової операції. Наприклад, імпорт списку завдань із файлу:

```php
<?php
declare(strict_types=1);

function importTasks(PDO $pdo, int $userId, array $titles): int
{
    $sql = 'INSERT INTO tasks (user_id, title, is_completed, created_at) VALUES (:uid, :title, 0, NOW())';
    $stmt = $pdo->prepare($sql);

    $created = 0;

    try {
        $pdo->beginTransaction();

        foreach ($titles as $title) {
            $trimmed = trim($title);
            if (empty($trimmed)) {
                continue;
            }
            $stmt->execute([':uid' => $userId, ':title' => $trimmed]);
            $created++;
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw new RuntimeException("Імпорт перервано на записі #{$created}: " . $e->getMessage());
    }

    return $created;
}

// Використання:
$titles = ['Купити молоко', 'Здати лабораторну', 'Подзвонити Олені', 'Подивитися лекцію'];
$count = importTasks($pdo, userId: 1, titles: $titles);
echo "Успішно імпортовано {$count} завдань." . PHP_EOL;
```

Зверніть увагу, що об'єкт `$stmt` створюється **один раз** перед циклом, а потім багаторазово виконується з різними параметрами. Це ефективно, оскільки MySQL компілює та кешує план виконання підготовленого виразу при першому виклику `prepare()` і повторно використовує його при кожному `execute()`.

---

## Висновки

- патерн Repository ізолює SQL — збираючи всі запити до конкретної таблиці в один спеціалізований клас, репозиторій забезпечує чіткий поділ відповідальностей і дозволяє змінювати деталі збереження даних, не зачіпаючи бізнес-логіку контролера;
- інтерфейс визначає контракт — залежність зовнішнього коду від `TaskStorageInterface` замість конкретного `TaskRepository` дає змогу замінити реалізацію (PDO → файловий → тестовий мок) без редагування жодного рядка у споживачах;
- іменовані плейсхолдери підвищують читабельність — використання `:user_id` замість позиційних `?` робить складні запити з 3+ параметрами самодокументованими та стійкими до помилок зміни порядку аргументів;
- `bindValue()` гарантує типізацію — явна вказівка `PDO::PARAM_INT` для параметрів `LIMIT` та `OFFSET` є обов'язковою за умови вимкненої емуляції підготовлених виразів, інакше MySQL відхилить запит із синтаксичною помилкою;
- `lastInsertId()` і `rowCount()` контролюють результат — перший метод повертає згенерований автоінкрементний ключ після `INSERT`, другий — кількість фактично змінених рядків після `UPDATE` або `DELETE`, що дозволяє реагувати на відсутність запису без додаткового `SELECT`;
- OFFSET-пагінація розбиває набір даних на сторінки — формула `offset = (page - 1) × perPage` у поєднанні з підрахунком `COUNT(*)` та функцією `ceil()` забезпечує коректну навігацію для наборів будь-якого обсягу;
- транзакції забезпечують атомарність — блок `beginTransaction()` / `commit()` / `rollBack()` гарантує, що група пов'язаних SQL-операцій виконається цілком або буде повністю скасована, запобігаючи неконсистентному стану бази даних.

## Джерела

- офіційна документація PHP: клас PDO та підготовлені вирази — https://www.php.net/manual/en/book.pdo.php;
- офіційна документація PHP: метод `PDO::lastInsertId()` — https://www.php.net/manual/en/pdo.lastinsertid.php;
- офіційна документація PHP: управління транзакціями в PDO — https://www.php.net/manual/en/pdo.transactions.php;
- практичне керівництво з безпечного використання PDO (PHP Delusions) — https://phpdelusions.net/pdo;
- опис патерну Repository (Patterns of Enterprise Application Architecture, Martin Fowler) — https://martinfowler.com/eaaCatalog/repository.html;
- документація MySQL: оператори `LIMIT` та `OFFSET` — https://dev.mysql.com/doc/refman/8.0/en/select.html.

## Запитання для самоперевірки

1. У чому полягає головна проблема написання SQL-запитів безпосередньо в точці входу `index.php`, і як патерн Repository усуває цю проблему?
2. Чому метод `findAllByUser()` у репозиторії приймає параметр `$userId`, а не зчитує його з `$_SESSION` самостійно? Яке архітектурне правило за цим стоїть?
3. Поясніть різницю між іменованими (`:param`) та позиційними (`?`) плейсхолдерами. У яких ситуаціях кожен із форматів є кращим вибором?
4. Чому для параметрів `LIMIT` та `OFFSET` неможливо використати масив у `execute()` при вимкненій емуляції `PDO::ATTR_EMULATE_PREPARES => false`? Яким чином `bindValue()` вирішує цю проблему?
5. У який момент та на якому об'єкті потрібно викликати `lastInsertId()` для отримання згенерованого первинного ключа? Що повертає цей метод, якщо таблиця не має `AUTO_INCREMENT`?
6. Поясніть формулу обчислення `OFFSET` для пагінації: `offset = (page - 1) × perPage`. Які значення `LIMIT` та `OFFSET` будуть для 4-ї сторінки з 10 записами на сторінку?
7. Що станеться з базою даних, якщо між `beginTransaction()` та `commit()` виникне необроблений виняток, а `rollBack()` не буде викликано? Чому перевірка `$pdo->inTransaction()` перед `rollBack()` є обов'язковою?
