# Лекція №16 (2 години). Хмарна аналітика та Big Data сервіси

## План лекції

1. Концепція Big Data та характеристики 5V
2. Архітектура Data Lake та Data Warehouse у хмарі
3. Інструменти обробки великих даних: EMR, Dataproc, Databricks
4. Стрімінгова обробка даних: Kinesis, Kafka, Pub/Sub
5. BI та візуалізація: QuickSight, Power BI, Looker

## Перелік умовних скорочень

Списком

- **ETL** — Extract, Transform, Load — видобування, трансформація, завантаження
- **ELT** — Extract, Load, Transform — новий порядок обробки
- **HDFS** — Hadoop Distributed File System — розподілена файлова система Hadoop
- **EMR** — Amazon Elastic MapReduce — керований Apache Hadoop/Spark
- **S3** — Amazon Simple Storage Service
- **ML** — Machine Learning — машинне навчання
- **SLA** — Service Level Agreement
- **JSON** — JavaScript Object Notation
- **Parquet** — колонковий формат зберігання даних
- **BI** — Business Intelligence — бізнес-аналітика
- **KPI** — Key Performance Indicator — ключовий показник ефективності
- **CDC** — Change Data Capture — захоплення змін у даних
- **IoT** — Internet of Things — Інтернет речей
- **API** — Application Programming Interface

---

## Вступ

Обсяг даних, що генеруються людством, подвоюється приблизно кожні два роки. До 2025 року очікується, що щороку генеруватиметься понад 175 зетабайт (175×10²¹ байт). Ці масиви даних містять безцінні знання для прийняття рішень, але традиційні реляційні СУБД не здатні їх обробити. Хмарні Big Data платформи демократизували доступ до аналітики надвеликих масивів даних, надавши інструменти, що раніше були доступні лише технологічним гігантам.

---

## 1. Концепція Big Data та характеристики 5V

### 1.1 Характеристики Big Data (5V)

**Volume (Обсяг):** терабайти, петабайти, зетабайти даних.

- Локи веб-сервера: 100 ГБ/день
- IoT-сенсори: мільярди записів/день
- Соціальні мережі: мільярди постів/день

**Velocity (Швидкість):** дані генеруються та надходять із високою швидкістю.

- Транзакції Visa: 24 000 транзакцій/сек
- Twitter: 6 000 твітів/сек
- Датчики автомобіля Tesla: 1 ГБ+ даних/хвилину

**Variety (Різноманітність):** структуровані (таблиці), напівструктуровані (JSON/XML), неструктуровані (відео, аудіо, текст).

**Veracity (Достовірність):** якість та надійність даних. Не всі «big data» є точними — пропущені значення, дублікати, протиріччя.

**Value (Цінність):** здатність витягти бізнес-інсайти з великих масивів даних.

### 1.2 Lambda-архітектура для Big Data

**Lambda-архітектура (Nathan Marz)** — класична архітектура для обробки великих даних із двома шляхами:

```
Дані → ┌──────────── Batch Layer (Швидко, великий обсяг) ──────────────┐ → Batch View
       │                  Hadoop / Spark / EMR                          │
       │                                                                 │
       └──────────── Speed Layer (Реалтайм, малий обсяг) ──────────────┘ → Speed View
                         Kinesis / Kafka / Flink                            │
                                                                             ▼
                                                                       Query (Serving) Layer
                                                                       Redshift / BigQuery
```

---

## 2. Архітектура Data Lake та Data Warehouse

### 2.1 Data Lake vs Data Warehouse

| Характеристика  | Data Lake                             | Data Warehouse               |
| --------------- | ------------------------------------- | ---------------------------- |
| **Дані**        | Сирі, нетрансформовані                | Очищені, структуровані       |
| **Схема**       | Schema-on-read                        | Schema-on-write              |
| **Формат**      | Будь-який (CSV, JSON, Parquet, відео) | Таблиці (рядки/стовпці)      |
| **Вартість**    | Дешевше (S3: $0.023/ГБ)               | Дорожче (Redshift: $0.25/ГБ) |
| **Гнучкість**   | Висока (зберігаємо все)               | Менша                        |
| **Запити**      | Складніші (потребують ETL)            | Простіші (SQL)               |
| **Користувачі** | Data scientists                       | Business analysts            |
| **AWS**         | S3 Data Lake                          | Redshift                     |
| **Azure**       | Azure Data Lake Storage Gen2          | Azure Synapse Analytics      |
| **GCP**         | Google Cloud Storage                  | BigQuery                     |

### 2.2 Data Lakehouse (нова парадигма)

**Data Lakehouse** = Data Lake + Data Warehouse можливості на одному сховищі:

- **Delta Lake** (Databricks): ACID-транзакції на Parquet-файлах у S3
- **Apache Hudi**: Incremental data processing + уточнена схема
- **Apache Iceberg**: відкритий формат таблиці для великих аналітичних датасетів

**Переваги Lakehouse:**

- Дешеве зберігання Data Lake + SQL-запити Data Warehouse
- Time travel: перегляд стану даних у будь-який момент у минулому
- ACID-транзакції: надійність оновлень великих датасетів

### 2.3 AWS Glue — ETL та Data Catalog

**AWS Glue** — повністю кероване ETL-сервіс та Metadata Catalog:

- **Glue Crawler**: автоматично сканує S3 та інші джерела, виявляє схему та наповнює Data Catalog
- **Glue Data Catalog**: центральний реєстр метаданих (таблиці, схеми, партиції)
- **Glue ETL Jobs**: PySpark-задачі для трансформації даних (serverless Spark)
- **Glue Studio**: візуальний ETL-конструктор

**AWS Lake Formation:**
Спрощене створення та управління Data Lake: доступ, шифрування, Row/Column-level security.

---

## 3. Інструменти обробки великих даних

### 3.1 Apache Spark та Amazon EMR

**Apache Spark** — розподілена обчислювальна система для обробки великих даних, що стала стандартом галузі:

- **In-memory обчислення**: до 100× швидше Hadoop MapReduce
- **Unified API**: Batch, Streaming, ML, Graph в одному фреймворку
- **PySpark**: Python API для Spark — найпопулярніший варіант

```python
# PySpark приклад: підрахунок продажів за категоріями
from pyspark.sql import SparkSession
from pyspark.sql.functions import sum, avg

spark = SparkSession.builder.appName("SalesAnalysis").getOrCreate()

# Зчитати Parquet з S3
df = spark.read.parquet("s3://my-data-lake/sales/2024/")

# Агрегація
result = df.groupBy("category") \
           .agg(
               sum("amount").alias("total_sales"),
               avg("amount").alias("avg_order")
           ) \
           .orderBy("total_sales", ascending=False)

# Записати результат
result.write.mode("overwrite").parquet("s3://my-data-lake/processed/sales_by_category/")
```

**Amazon EMR (Elastic MapReduce):**
Керований кластер для Apache Spark, Hadoop, Hive, Presto тощо:

- Autoscaling: кластер масштабується під розмір задачі
- Spot Instances: до 90% знижки (Spot Instances у Worker Nodes)
- **EMR Serverless**: запуск Spark-задач без управління кластером

**Google Dataproc:**
Аналог EMR від GCP — керований Spark/Hadoop. Відрізняється швидким створенням кластера (90 секунд) та глибокою інтеграцією з BigQuery та GCS.

### 3.2 Databricks — уніфікована платформа даних

**Databricks** — комерційна платформа на базі Apache Spark + Delta Lake, доступна як Marketplace SaaS на AWS, Azure та GCP:

- **Databricks SQL**: SQL-інтерфейс для бізнес-аналітиків
- **MLflow**: платформа управління ML-моделями (вбудована)
- **Delta Live Tables**: декларативний ETL-пайплайн

---

## 4. Стрімінгова обробка даних

### 4.1 Batch vs Streaming обробка

| Характеристика | Batch                | Streaming                   |
| -------------- | -------------------- | --------------------------- |
| Дані           | Накопичені за період | Безперервний потік          |
| Затримка       | Хвилини–години       | Мілісекунди–секунди         |
| Складність     | Простіша             | Складніша                   |
| Застосування   | ETL, звіти           | Fraud detection, IoT alerts |

### 4.2 Amazon Kinesis

**Amazon Kinesis** — сімейство сервісів стрімінгу AWS:

**Kinesis Data Streams:**

- Впорядкований потік записів (аналог Kafka)
- Шарди (Shards): одиниця паралелізму; кожен шард: 1 МБ/с запис, 2 МБ/с читання
- Retention: від 24 годин до 365 днів

**Kinesis Data Firehose:**

- Повністю кероване доставлення відразу до S3, Redshift, OpenSearch (без управління шардами)
- Трансформація через Lambda перед завантаженням
- Буферизація: 60–900 секунд або 1–128 МБ

**Kinesis Data Analytics:**

- SQL або Apache Flink для стрімінгових запитів у реальному часі

### 4.3 Apache Kafka та Amazon MSK

**Apache Kafka** — розподілений журнал подій (event log), стандарт для enterprise streaming:

- Топіки та партиції (аналог Kinesis шардів)
- Consumer groups: горизонтальне масштабування читання
- Retention: довільне (дні, тижні, нескінченно)
- Vishe throughput: мільйони повідомлень/сек

**Amazon MSK (Managed Streaming for Apache Kafka):**
Повністю кероване Kafka від AWS: автоматичний failover брокерів, інтеграція з IAM.

### 4.4 Google Pub/Sub та Dataflow

**Google Pub/Sub:** хмарна черга повідомлень/streaming від GCP; масштабується автоматично.

**Google Dataflow:** управляємий Apache Beam; уніфікований batch та streaming пайплайн. Ідеально для складних трансформацій.

---

## 5. BI та візуалізація

### 5.1 Amazon QuickSight

**Amazon QuickSight** — хмарний BI-сервіс AWS:

- **SPICE**: in-memory обчислення → відповіді за мілісекунди
- **ML Insights**: автоматичне виявлення аномалій та трендів через ML
- **Embedded Analytics**: вбудовування дашбордів у власний застосунок

### 5.2 Microsoft Power BI та Looker

**Microsoft Power BI** — найпопулярніший BI-інструмент для Microsoft-екосистеми:

- Глибока інтеграція з Excel, Azure Synapse, Teams
- Power BI Embedded: вбудовування у застосунки

**Google Looker** — enterprise BI-платформа:

- **LookML**: декларативна мова для опису моделей даних
- Semantic Layer: єдина «мова бізнесу» для всіх аналітиків

---

## Висновки

1. **Big Data** характеризується 5V: Volume, Velocity, Variety, Veracity, Value. Хмарні платформи вирішили проблему доступності надвеликих обчислювальних ресурсів для обробки таких даних.

2. **Data Lake (S3/GCS) + Data Warehouse (BigQuery/Redshift)** — стандартний двошаровий підхід. Data Lakehouse (Delta Lake/Iceberg) поєднує переваги обох.

3. **Apache Spark (EMR/Dataproc/Databricks)** є стандартом для batch-обробки великих даних. PySpark — найпопулярніший API.

4. **Kinesis/Kafka (MSK)** вирішують задачу стрімінгової обробки в реальному часі. Kafka є відчутно потужнішим і гнучкішим, але потребує більшого операційного досвіду.

5. **BI-інструменти** (QuickSight/Power BI/Looker) демократизують доступ до аналітики: менеджери отримують дашборди в реальному часі без знань SQL.

---

## Джерела

1. White, T. (2015). _Hadoop: The Definitive Guide_ (4th ed.). O'Reilly Media.
2. Chambers, B., & Zaharia, M. (2018). _Spark: The Definitive Guide_. O'Reilly Media.
3. AWS Documentation. (2024). _Amazon EMR Management Guide_. https://docs.aws.amazon.com/emr/
4. AWS Documentation. (2024). _Amazon Kinesis Developer Guide_. https://docs.aws.amazon.com/kinesis/
5. Google Cloud. (2024). _BigQuery ML Documentation_. https://cloud.google.com/bigquery-ml/docs
6. Delta Lake. (2024). _Delta Lake Documentation_. https://docs.delta.io/

---

## Запитання для самоперевірки

1. Поясніть характеристики Big Data (5V). Наведіть конкретний приклад для кожного.
2. Чим Data Lake відрізняється від Data Warehouse за підходом до схеми (schema-on-read vs schema-on-write)?
3. Що таке Data Lakehouse? Яке його місце між Data Lake та Data Warehouse?
4. Що таке AWS Glue? Яку роль виконують Glue Crawler та Glue Data Catalog?
5. Поясніть переваги Apache Spark перед Hadoop MapReduce.
6. Що таке Amazon Kinesis Data Streams? Що таке шард та як він впливає на пропускну здатність?
7. Чим Kinesis Data Firehose відрізняється від Kinesis Data Streams?
8. Для яких сценаріїв підходить batch-обробка, а для яких — streaming?
9. Що таке Apache Kafka? Як він відрізняється від Amazon SQS?
10. Що таке SPICE у Amazon QuickSight? Яку перевагу він надає?
