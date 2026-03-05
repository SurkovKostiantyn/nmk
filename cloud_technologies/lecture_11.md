# Лекція №11 (2 години). Хмарні бази даних як сервіс (DBaaS)

## План лекції

1. Концепція DBaaS та переваги над self-managed СУБД
2. Реляційні бази даних у хмарі: RDS, Azure SQL, Cloud SQL
3. NoSQL бази даних: DynamoDB, Cosmos DB, Firestore, Bigtable
4. Аналітичні бази даних та Data Warehouse
5. Вибір типу бази даних: порівняння та критерії

## Перелік умовних скорочень

Списком

- **DBaaS** — Database as a Service — база даних як послуга
- **СУБД** — Система управління базами даних
- **SQL** — Structured Query Language — мова структурованих запитів
- **OLTP** — Online Transaction Processing — транзакційна обробка
- **OLAP** — Online Analytical Processing — аналітична обробка
- **RDS** — Amazon Relational Database Service — керована реляційна СУБД AWS
- **NoSQL** — Not Only SQL — нереляційні бази даних
- **SSD** — Solid State Drive — твердотільний накопичувач
- **IOPS** — Input/Output Operations per Second
- **RPO** — Recovery Point Objective
- **RTO** — Recovery Time Objective
- **CR** — Cross-Region — між регіонами
- **ACID** — Atomicity, Consistency, Isolation, Durability
- **BASE** — Basically Available, Soft state, Eventual consistency
- **TTL** — Time to Live — час існування запису

---

## Вступ

Вибір та управління базою даних є одним із найскладніших архітектурних рішень у хмарних системах. Традиційно бази даних вимагали значних зусиль з налаштування, резервного копіювання, патчингу та масштабування. DBaaS (Database as a Service) передає ці операційні турботи хмарному провайдеру, дозволяючи командам зосередитись на схемі даних та запитах, а не на адмініструванні.

---

## 1. Концепція DBaaS та переваги

### 1.1 Що бере на себе DBaaS

| Завдання                  | Self-managed (EC2) |         DBaaS          |
| ------------------------- | :----------------: | :--------------------: |
| Встановлення СУБД         |       Клієнт       |       Провайдер        |
| Патчинг ОС та СУБД        |       Клієнт       |       Провайдер        |
| Резервне копіювання       |       Клієнт       |      Автоматично       |
| Multi-AZ реплікація       |       Клієнт       |      Автоматично       |
| Моніторинг та алерти      |       Клієнт       |   Частково провайдер   |
| Вертикальне масштабування |       Клієнт       |   Через консоль/CLI    |
| Read Replicas             | Клієнт налаштовує  |     Кілька кліків      |
| Аварійне відновлення      |       Клієнт       | Автоматично (Multi-AZ) |

**Обмеження DBaaS:**

- Обмежений доступ до ОС та низькорівневих налаштувань
- Деякі розширення СУБД можуть бути недоступні
- Вища вартість порівняно з EC2 при великих навантаженнях

---

## 2. Реляційні бази даних у хмарі

### 2.1 Amazon RDS (Relational Database Service)

**Amazon RDS** — керована реляційна СУБД AWS, що підтримує 6 движків:

| Движок            | Ліцензія    | Особливості                                    |
| ----------------- | ----------- | ---------------------------------------------- |
| MySQL             | Open-source | Найпоширеніша веб-СУБД                         |
| PostgreSQL        | Open-source | Розширена відповідність SQL, JSON              |
| MariaDB           | Open-source | Форк MySQL                                     |
| Oracle            | Комерційна  | Ентерпрайз-функції; BYOL або включена ліцензія |
| SQL Server        | Комерційна  | Інтеграція з Microsoft-екосистемою             |
| **Amazon Aurora** | AWS-власна  | До 5× швидше MySQL, до 3× швидше PostgreSQL    |

**Ключові можливості RDS:**

- **Multi-AZ**: синхронна реплікація у standby у другій AZ; автоматичний failover за 1–2 хв
- **Read Replicas**: асинхронна реплікація для масштабування читання; до 15 для Aurora
- **Automated Backups**: щоденний snapshot + Point-in-Time Recovery (до 35 днів)
- **Encryption**: шифрування at-rest (AES-256) та in-transit (TLS)
- **Parameter Groups**: тонке налаштування параметрів СУБД

**Amazon Aurora — революційна архітектура:**

Aurora відокремлює рівень обчислень від рівня зберігання:

```
┌──────────── Compute Layer ────────────────┐
│  Writer Instance (Primary)                │
│  Reader Instance 1  Reader Instance 2     │
└────────────────────┬──────────────────────┘
                     │ Рубликований по 6 копіях
┌────────────────────▼──────────────────────┐
│          Aurora Storage Layer             │
│  AZ-1: [Seg1][Seg2]  AZ-2: [Seg3][Seg4]  │
│  AZ-3: [Seg5][Seg6]                       │
└───────────────────────────────────────────┘
```

- 6 копій даних у 3 AZ (2 в кожній)
- Витримує втрату 2 з 6 копій без втрати даних
- **Aurora Serverless v2**: автоматичне масштабування обчислень до 0 при простої

### 2.2 Azure SQL Database

**Azure SQL Database** — керована версія Microsoft SQL Server у Azure.

**Моделі розгортання:**

- **Single Database**: один ізольований екземпляр БД
- **Elastic Pool**: спільний пул ресурсів для кількох БД (економія при нерівномірному навантаженні)
- **Managed Instance**: майже повна сумісність із SQL Server on-premise; ідеально для lift-and-shift

**Рівні сервісу:**

- **DTU-based**: General Purpose, Business Critical, Hyperscale
- **vCore-based**: Більш передбачувана продуктивність; вибір кількості vCPU

**Hyperscale:**

- До 100 ТБ сховища
- Реплікація сторінок → швидке відновлення (1–2 хвилини)
- До 4 read replicas

### 2.3 Google Cloud SQL та AlloyDB

**Cloud SQL** — підтримує MySQL, PostgreSQL, SQL Server.

**AlloyDB for PostgreSQL:**

- Повністю сумісний із PostgreSQL
- До 4× швидше PostgreSQL для OLTP, до 100× швидше для аналітичних запитів
- Колумнарний движок для аналітики
- Автоматичне масштабування

---

## 3. NoSQL бази даних у хмарі

### 3.1 Типи NoSQL і сценарії застосування

| Тип NoSQL   | Модель даних                  | AWS                 | Azure                   | GCP            | Застосування            |
| ----------- | ----------------------------- | ------------------- | ----------------------- | -------------- | ----------------------- |
| Key-Value   | Ключ → значення               | DynamoDB            | Cosmos DB               | Cloud Bigtable | Сесії, кеш, profile     |
| Document    | JSON-документи                | DynamoDB            | Cosmos DB (MongoDB API) | Firestore      | CMS, каталоги           |
| Wide-Column | Рядки з динамічними стовпцями | DynamoDB            | Cosmos DB               | Bigtable       | IoT, часові ряди        |
| Graph       | Вершини та ребра              | Amazon Neptune      | Cosmos DB (Gremlin)     | —              | Соцмережі, рекомендації |
| In-Memory   | Ключ → значення RAM           | ElastiCache (Redis) | Azure Cache for Redis   | Memorystore    | Кеш, сесії              |

### 3.2 Amazon DynamoDB

**Amazon DynamoDB** — повністю керована NoSQL БД від AWS, що забезпечує:

- Передбачувана затримка: **single-digit milliseconds** при будь-якому масштабі
- Горизонтальне масштабування до будь-якого обсягу даних і трафіку
- Глобальні таблиці (multi-region, active-active реплікація)
- **DynamoDB Accelerator (DAX)**: in-memory cache для DynamoDB, затримка < 1 мс

**Модель даних DynamoDB:**

```
Таблиця: Orders
┌────────────────┬───────────────┬────────────────┬───────────────┐
│ PK (user_id)  │ SK (order_id) │ amount         │ status        │
├────────────────┼───────────────┼────────────────┼───────────────┤
│ user#123       │ order#2024001 │ 149.99         │ delivered     │
│ user#123       │ order#2024002 │ 89.50          │ processing    │
│ user#456       │ order#2024003 │ 299.00         │ shipped       │
└────────────────┴───────────────┴────────────────┴───────────────┘
```

**Partition Key (PK)** — розподіляє дані між серверами (sharding); **Sort Key (SK)** — впорядковує записи всередині партиції.

**DynamoDB Streams + Lambda** — event sourcing: при змінах у DynamoDB → автоматичний виклик Lambda-функції.

**Режими ємності:**

- **Provisioned**: заздалегідь заданий RCU (Reader Capacity Unit) та WCU
- **On-Demand**: оплата за фактичні запити; ідеально для нерівномірного трафіку

### 3.3 Azure Cosmos DB

**Azure Cosmos DB** — глобально розподілена MultiModel NoSQL БД.

**Унікальні особливості Cosmos DB:**

- **Multi-API**: одна БД з доступом через SQL (Core), MongoDB, Cassandra, Gremlin (Graph), Table API
- **Global Distribution**: дані реплікуються в будь-яку кількість регіонів за кілька кліків
- **5 рівнів консистентності**: Strong, Bounded Staleness, Session, Consistent Prefix, Eventual
- **SLA 99.999%** для availability з multi-region writes

**Рівні консистентності Cosmos DB:**

```
Сильніша                                  Слабша
Strong ──► Bounded Staleness ──► Session ──► Consistent Prefix ──► Eventual
(найповільніший)                                        (найшвидший)
```

### 3.4 Google Firestore та Bigtable

**Cloud Firestore:** Document NoSQL БД, повністю кероване, real-time синхронізація з клієнтами (Web/Mobile SDK). Ідеально для мобільних застосунків та real-time features.

**Cloud Bigtable:** Wide-column БД для надвеликих навантажень (petabytes). Тим самим движком Google обслуговує Gmail, Google Analytics, Google Maps. Ідеально для IoT, фінансових даних та часових рядів.

---

## 4. Аналітичні бази даних та Data Warehouse

### 4.1 OLTP vs OLAP

| Характеристика      | OLTP                        | OLAP                        |
| ------------------- | --------------------------- | --------------------------- |
| **Призначення**     | Транзакції (INSERT, UPDATE) | Аналітика (SELECT агрегати) |
| **Запити**          | Прості, короткі             | Складні, тривалі            |
| **Обсяг даних**     | Гігабайти–терабайти         | Терабайти–петабайти         |
| **Паттерн доступу** | Звертання до рядків         | Сканування стовпців         |
| **Приклади**        | RDS, DynamoDB               | Redshift, BigQuery, Synapse |

### 4.2 Amazon Redshift

**Amazon Redshift** — хмарне сховище даних (Data Warehouse) з колумнарним зберіганням:

- SQL-інтерфейс (сумісний із PostgreSQL)
- Масова паралельна обробка (MPP): кластер з тисяч вузлів
- **Redshift Spectrum**: запити прямо до S3 без завантаження даних
- **Serverless Redshift**: автоматичне управління обчислювальним кластером

### 4.3 Google BigQuery

**Google BigQuery** — serverless аналітична платформа першого класу:

- Запити масштабуються автоматично (за секунди обробляє терабайти)
- Оплата за обсяг просканованих даних (або фіксовані слоти)
- **BigQuery ML**: тренування ML-моделей прямо в BigQuery через SQL
- Стандарт індустрії для BI та аналітики великих даних

### 4.4 Azure Synapse Analytics

**Azure Synapse** — уніфікована платформа для аналітики:

- Data Warehouse (Dedicated SQL Pools)
- Serverless SQL Pools (запити до Data Lake без провізіонування)
- Apache Spark integration
- Power BI інтеграція

---

## 5. Вибір типу бази даних

### 5.1 Дерево рішень

```
Чи потрібні JOIN та транзакції (ACID)?
│
├── Так → Реляційна БД (RDS/Aurora, Azure SQL, Cloud SQL)
│          Чи потрібна максимальна продуктивність?
│          ├── Так → Aurora / AlloyDB
│          └── Ні → RDS MySQL/PostgreSQL
│
└── Ні → Який патерн доступу?
          │
          ├── Прості читання/записи за ключем? → DynamoDB / Cosmos DB
          │
          ├── Документи (JSON, нефіксована схема)? → DynamoDB / Firestore / Cosmos DB
          │
          ├── Часові ряди / IoT (мільярди рядків)? → Bigtable / Timestream
          │
          ├── Граф (відносини між сутностями)? → Neptune / Cosmos DB Gremlin
          │
          ├── Кеш (in-memory, low latency)? → ElastiCache Redis / Memorystore
          │
          └── Аналітика великих даних? → BigQuery / Redshift / Synapse
```

### 5.2 Polyglot Persistence

Сучасні архітектури часто використовують **Polyglot Persistence** — різні типи БД для різних частин системи:

_Приклад: E-commerce платформа:_

- **PostgreSQL (RDS)**: замовлення, платежі, інвентар (ACID-транзакції)
- **DynamoDB**: кошик покупок, сесії користувачів (millisecond latency)
- **ElastiCache Redis**: кеш каталогу товарів, rate limiting
- **Elasticsearch (OpenSearch)**: пошук по товарах
- **Redshift**: бізнес-аналітика та звіти

---

## Висновки

1. **DBaaS** знімає операційне навантаження з команди (патчинг, резервне копіювання, реплікація), дозволяючи зосередитись на схемі даних і бізнес-логіці.

2. **Amazon Aurora** є революційним рішенням серед реляційних СУБД у хмарі — відокремлення обчислень від зберігання забезпечує p99 продуктивність і 6-разове реплікування у 3 AZ.

3. **DynamoDB** є стандартом для key-value та document-навантажень, що вимагають мілісекундної затримки та необмеженого горизонтального масштабування.

4. **Azure Cosmos DB** унікальна мультимодельністю та 5 рівнями консистентності — дозволяє обирати точний баланс між узгодженістю та затримкою для кожного застосунку.

5. **Polyglot Persistence** — стандартна практика у великих системах: кожна частина системи використовує оптимальний тип БД для свого патерну доступу.

---

## Джерела

1. AWS Documentation. (2024). _Amazon RDS User Guide_. https://docs.aws.amazon.com/rds/
2. AWS Documentation. (2024). _Amazon DynamoDB Developer Guide_. https://docs.aws.amazon.com/dynamodb/
3. Microsoft. (2024). _Azure Cosmos DB Documentation_. https://learn.microsoft.com/en-us/azure/cosmos-db/
4. Google Cloud. (2024). _BigQuery Documentation_. https://cloud.google.com/bigquery/docs
5. Fowler, M., & Sadalage, P. J. (2012). _NoSQL Distilled_. Addison-Wesley.
6. Bauer, C., & King, G. (2015). _Java Persistence with Hibernate_ (2nd ed.). Manning.

---

## Запитання для самоперевірки

1. Що таке DBaaS? Які операційні завдання бере на себе провайдер?
2. Поясніть архітектурну різницю між Amazon Aurora та звичайним RDS. Чому Aurora є більш надійною?
3. Що таке Multi-AZ в RDS? Як відбувається автоматичний failover?
4. Що таке Read Replicas? Для яких сценаріїв вони використовуються?
5. Поясніть модель даних DynamoDB: що таке Partition Key та Sort Key?
6. Чим Azure Cosmos DB відрізняється від DynamoDB? Поясніть концепцію 5 рівнів консистентності.
7. Чим OLTP відрізняється від OLAP? Чому реляційні СУБД не підходять для аналітики великих даних?
8. Що таке Google BigQuery? Чим його serverless-модель відрізняється від традиційного Data Warehouse?
9. Що таке Polyglot Persistence? Наведіть приклад архітектури, що використовує 3+ типи баз даних.
10. Як обрати між реляційною та NoSQL БД? Назвіть ключові критерії.
