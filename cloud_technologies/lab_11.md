# Лабораторна робота №11 (2 години)

**Тема:** Робота з хмарними базами даних (DBaaS).

Розгортання керованої реляційної бази даних; підключення до БД з хмарного застосунку; виконання базових операцій; налаштування резервного копіювання; знайомство з NoSQL-сервісом.

**Мета:** Набути практичні навички розгортання та адміністрування хмарних керованих баз даних, підключення до них з застосунків, виконання SQL-запитів та ознайомлення з NoSQL-рішеннями.

**Технологічний стек:**

- **Neon** (рекомендовано) — безкоштовний serverless PostgreSQL, без картки
- **PlanetScale** або **Supabase** — альтернативи для MySQL / PostgreSQL
- **AWS RDS** або **Amazon DynamoDB** — хмарні рішення від AWS
- **Node.js / Python** — для роботи з БД з коду

---

## Завдання

1. Розгорнути хмарну PostgreSQL базу даних (Neon або аналог)
2. Підключитись до БД через psql або DBeaver
3. Створити таблиці та виконати базові SQL-операції
4. Підключити БД до веб-застосунку з Лаб. №10
5. Ознайомитись з NoSQL-сервісом (DynamoDB або Firestore)
6. Дослідити автоматичне резервне копіювання БД

---

## Хід виконання роботи

### Крок 1. Розгортання PostgreSQL у Neon

Neon — serverless PostgreSQL з безкоштовним рівнем (0.5 vCPU, 1 GB RAM).

1. Зайдіть на [https://neon.tech](https://neon.tech) та авторизуйтесь через GitHub
2. Натисніть **Create a project**
3. **Project name:** `lab11-db`
4. **PostgreSQL version:** 16
5. **Region:** EU (Frankfurt)
6. Натисніть **Create project**

Після створення скопіюйте **Connection string** (виглядає як: `postgresql://user:password@host/dbname?sslmode=require`)

### Крок 2. Підключення до БД

**Через psql (CLI):**

```bash
# Встановлення psql
sudo apt install -y postgresql-client   # Linux
brew install postgresql                  # macOS
# Windows: з офіційного інсталятора PostgreSQL

# Підключення (вставте рядок підключення з Neon)
psql "postgresql://user:password@host/dbname?sslmode=require"
```

**Через DBeaver (GUI):**

1. Завантажте [DBeaver Community](https://dbeaver.io/download/)
2. Нове з'єднання → PostgreSQL
3. Вставте деталі підключення з Neon
4. SSL Mode: require

### Крок 3. Створення схеми та базові SQL-операції

У підключеній сесії psql або DBeaver виконайте:

```sql
-- Створення таблиці студентів
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    group_name VARCHAR(50),
    enrollment_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Вставка даних
INSERT INTO students (name, email, group_name) VALUES
    ('Іван Петренко', 'ivan.petrenko@example.com', 'КН-41'),
    ('Марія Коваленко', 'maria.kovalenko@example.com', 'КН-41'),
    ('Олег Сидоренко', 'oleg.sydorenko@example.com', 'КН-42'),
    ('Анна Мельник', 'anna.melnyk@example.com', 'КН-42');

-- SELECT-запити
SELECT * FROM students;
SELECT name, email FROM students WHERE group_name = 'КН-41';
SELECT group_name, COUNT(*) AS count FROM students GROUP BY group_name;

-- UPDATE
UPDATE students SET group_name = 'КН-41м' WHERE name = 'Іван Петренко';

-- Перевірка
SELECT * FROM students WHERE name = 'Іван Петренко';
```

Створіть другу таблицю та JOIN:

```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits INTEGER
);

CREATE TABLE enrollments (
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    grade DECIMAL(3,1),
    PRIMARY KEY (student_id, course_id)
);

INSERT INTO courses (name, credits) VALUES
    ('Хмарні технології', 4),
    ('Бази даних', 3),
    ('Веб-розробка', 4);

INSERT INTO enrollments VALUES (1, 1, 90.5), (1, 2, 85.0), (2, 1, 92.0), (2, 3, 88.5);

-- JOIN-запит: студенти та їхні курси
SELECT s.name AS student, c.name AS course, e.grade
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
ORDER BY s.name, c.name;
```

### Крок 4. Підключення БД до веб-застосунку

Додайте в застосунок з Лаб. №10:

```bash
npm install pg
```

```js
// db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
```

```js
// Додайте до server.js
const pool = require("./db");

app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/students", express.json(), async (req, res) => {
  const { name, email, group_name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO students (name, email, group_name) VALUES ($1, $2, $3) RETURNING *",
      [name, email, group_name],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

Встановіть `DATABASE_URL` у змінних оточення Railway/Render (вставте рядок підключення з Neon).

```bash
# Тест через cURL
curl https://<your-app-url>/students
curl -X POST https://<your-app-url>/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Тест Тестенко","email":"test@example.com","group_name":"КН-41"}'
```

### Крок 5. Ознайомлення з NoSQL (DynamoDB)

```bash
# Створення таблиці (через AWS CLI)
aws dynamodb create-table \
  --table-name lab11-students \
  --attribute-definitions AttributeName=student_id,AttributeType=S \
  --key-schema AttributeName=student_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1

# Запис елементу
aws dynamodb put-item \
  --table-name lab11-students \
  --item '{"student_id":{"S":"1"},"name":{"S":"Іван Петренко"},"group":{"S":"КН-41"}}' \
  --region eu-central-1

# Читання елементу
aws dynamodb get-item \
  --table-name lab11-students \
  --key '{"student_id":{"S":"1"}}' \
  --region eu-central-1

# Сканування таблиці
aws dynamodb scan --table-name lab11-students --region eu-central-1

# Видалення таблиці
aws dynamodb delete-table --table-name lab11-students --region eu-central-1
```

### Крок 6. Резервне копіювання

**Neon:** Автоматичні бекапи включені безкоштовно — 7 днів зберігання.

- Project → **Branches** → ви побачите головну гілку `main`
- Neon дозволяє створювати точки відновлення (branching) — кожна гілка є снепшотом

**Ручний бекап (dump):**

```bash
pg_dump "postgresql://user:password@host/dbname?sslmode=require" \
  --format=custom \
  --file=lab11_backup_$(date +%Y%m%d).dump

# Перевірка: список таблиць у дампі
pg_restore --list lab11_backup_*.dump
```

---

## Контрольні запитання

1. Що таке DBaaS (Database as a Service)? Які задачі адміністрування бере на себе провайдер?
2. Поясніть різницю між реляційними (SQL) та нереляційними (NoSQL) базами даних. Наведіть приклади сценаріїв для кожного типу.
3. Що таке serverless база даних (наприклад, Neon, PlanetScale)? Чим вона відрізняється від традиційної керованої БД на виділеному інстансі (RDS)?
4. Що таке Connection String / Connection Pool? Чому важливо використовувати пул з'єднань у веб-застосунках?
5. Що таке SQL-ін'єкція? Як параметризовані запити (`$1, $2`) захищають від цієї атаки?
6. Що таке RPO (Recovery Point Objective) та RTO (Recovery Time Objective) у контексті резервного копіювання БД?

---

## Вимоги до звіту

1. Скриншот підключення до Neon (консоль psql або DBeaver з активним з'єднанням)
2. Вивід SQL-запиту з JOIN (студенти та курси)
3. Скриншот або вивід `curl /students` з даними з БД через веб-застосунок
4. Вивід команд DynamoDB (put-item та get-item)
5. Скриншот розділу Branches / Backup у Neon
6. Відповіді на контрольні запитання у файлі `lab11.md`
7. Посилання на GitHub з кодом надіслати в Classroom
