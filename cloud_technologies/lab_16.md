# Лабораторна робота №16 (2 години)

**Тема:** Опрацювання та аналіз даних у хмарі (Big Data).

Завантаження набору даних у хмарне сховище; налаштування та запуск завдань обробки даних; виконання аналітичних запитів у BigQuery або Amazon Athena; побудова базового дашборду.

**Мета:** Ознайомитись з підходами до аналітики великих даних у хмарі: навчитись завантажувати та аналізувати датасети за допомогою serverless SQL-сервісів без попереднього налаштування сервера БД.

**Технологічний стек:**

- **Google BigQuery** (рекомендовано) — безкоштовно до 1 TB запитів/місяць, публічні датасети
- **Amazon Athena** (альтернатива) — оплата за кількість відсканованих даних ($5/TB)
- **Google Looker Studio** (раніше Data Studio) — безкоштовна візуалізація BigQuery даних
- **Python + pandas** — локальна обробка датасету

---

## Завдання

1. Підготувати CSV-датасет та завантажити у хмарне сховище
2. Виконати аналітичні SQL-запити через BigQuery або Athena
3. Дослідити публічні датасети у BigQuery
4. Побудувати базовий звіт у Looker Studio або QuickSight
5. Порівняти підхід серверної та serverless аналітики

---

## Хід виконання роботи

### Крок 1. Підготовка CSV-датасету

Створіть та наповніть датасет продажів:

```python
# generate_data.py
import csv
import random
from datetime import datetime, timedelta

products = ['Ноутбук', 'Смартфон', 'Планшет', 'Навушники', 'Клавіатура']
regions = ['Київ', 'Харків', 'Львів', 'Одеса', 'Дніпро']

with open('sales_data.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['order_id', 'date', 'product', 'region', 'quantity', 'price', 'total'])

    for i in range(1, 501):
        date = datetime(2024, 1, 1) + timedelta(days=random.randint(0, 364))
        product = random.choice(products)
        price = {'Ноутбук': 30000, 'Смартфон': 15000, 'Планшет': 10000,
                 'Навушники': 2000, 'Клавіатура': 800}[product]
        qty = random.randint(1, 5)
        writer.writerow([i, date.strftime('%Y-%m-%d'), product,
                         random.choice(regions), qty, price, qty * price])

print("Датасет sales_data.csv створено (500 записів)")
```

```bash
python generate_data.py
head -5 sales_data.csv
```

### Крок 2. Завантаження до Google Cloud Storage та BigQuery

**Реєстрація в Google Cloud (якщо ще немає):**

1. [https://cloud.google.com](https://cloud.google.com) → Start free ($300 кредитів на 90 днів)
2. Встановіть `gcloud` CLI: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

```bash
# Авторизація
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>

# Створення Cloud Storage bucket
gsutil mb -l EU gs://lab16-analytics-$(whoami)

# Завантаження CSV
gsutil cp sales_data.csv gs://lab16-analytics-$(whoami)/sales/sales_data.csv

# Верифікація
gsutil ls -l gs://lab16-analytics-$(whoami)/sales/
```

**Створення BigQuery Dataset та таблиці:**

```bash
# Створення dataset
bq mk --dataset --location=EU lab16_analytics

# Завантаження CSV у BigQuery таблицю
bq load \
  --source_format=CSV \
  --skip_leading_rows=1 \
  lab16_analytics.sales \
  gs://lab16-analytics-$(whoami)/sales/sales_data.csv \
  order_id:INTEGER,date:DATE,product:STRING,region:STRING,quantity:INTEGER,price:INTEGER,total:INTEGER

# Перевірка схеми
bq show lab16_analytics.sales
```

### Крок 3. Аналітичні SQL-запити у BigQuery

Відкрийте [BigQuery Console](https://console.cloud.google.com/bigquery) та виконайте:

```sql
-- 1. Загальна статистика
SELECT
  COUNT(*) AS total_orders,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_order_value,
  MIN(date) AS first_sale,
  MAX(date) AS last_sale
FROM `<PROJECT_ID>.lab16_analytics.sales`;

-- 2. Продажі за продуктом (спадання)
SELECT
  product,
  COUNT(*) AS orders_count,
  SUM(quantity) AS units_sold,
  SUM(total) AS revenue,
  ROUND(SUM(total) * 100.0 / (SELECT SUM(total) FROM `<PROJECT_ID>.lab16_analytics.sales`), 2) AS revenue_pct
FROM `<PROJECT_ID>.lab16_analytics.sales`
GROUP BY product
ORDER BY revenue DESC;

-- 3. Продажі по регіонам та місяцях
SELECT
  region,
  FORMAT_DATE('%Y-%m', date) AS month,
  SUM(total) AS monthly_revenue
FROM `<PROJECT_ID>.lab16_analytics.sales`
GROUP BY region, month
ORDER BY region, month;

-- 4. Топ-10 найбільших замовлень
SELECT order_id, date, product, region, quantity, total
FROM `<PROJECT_ID>.lab16_analytics.sales`
ORDER BY total DESC
LIMIT 10;

-- 5. Ковзне середнє (7-денний тренд)
SELECT
  date,
  SUM(total) AS daily_revenue,
  AVG(SUM(total)) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM `<PROJECT_ID>.lab16_analytics.sales`
GROUP BY date
ORDER BY date;
```

### Крок 4. Аналіз публічних датасетів BigQuery

BigQuery має сотні безкоштовних публічних датасетів:

```sql
-- Публічний датасет COVID-19 (ВООЗ)
SELECT country_region, SUM(confirmed) AS total_confirmed
FROM `bigquery-public-data.covid19_who.who_covid_19_sit_rep_weekly`
GROUP BY country_region
ORDER BY total_confirmed DESC
LIMIT 10;

-- Публічний датасет Вікіпедії (дані про переглядання)
SELECT title, SUM(views) AS total_views
FROM `bigquery-public-data.wikipedia.pageviews_2024`
WHERE wiki = 'uk'    -- Україномовна Вікіпедія
  AND DATE(datehour) = '2024-01-01'
GROUP BY title
ORDER BY total_views DESC
LIMIT 20;
```

### Крок 5. Побудова дашборду в Looker Studio

1. Відкрийте [https://lookerstudio.google.com](https://lookerstudio.google.com)
2. **Create** → **Report**
3. **Add data** → **BigQuery** → ваш проєкт → `lab16_analytics` → `sales`
4. Додайте charts:
   - **Bar chart:** product (Dimension) / revenue (Metric) — продажі за продуктом
   - **Time series:** date / total — тренд продажів
   - **Pie chart:** region / SUM(total) — розподіл по регіонах
   - **Scorecard:** SUM(total) — загальна виручка
5. Налаштуйте заголовок: `Lab 16 — Sales Analytics Dashboard`

---

## Контрольні запитання

1. Що таке serverless аналітика? Чим BigQuery / Athena відрізняються від традиційних рішень хмарного сховища даних (Data Warehouse)?
2. Що таке партиційована таблиця (Partitioned Table) у BigQuery? Як вона допомагає зменшити витрати на запити?
3. Поясніть концепцію ETL (Extract, Transform, Load). Як хмарні сервіси (AWS Glue, Azure Data Factory) автоматизують цей процес?
4. Що таке потокова обробка даних (stream processing)? Чим вона відрізняється від пакетної (batch)?
5. Чому розмір відсканованих даних впливає на вартість запиту в Athena? Як колонковий формат (Parquet, ORC) знижує витрати?
6. Що таке BI (Business Intelligence) інструмент? Наведіть приклади та поясніть, як вони підключаються до хмарних сховищ даних.

---

## Вимоги до звіту

1. Вивід `head -5 sales_data.csv` — перші рядки датасету
2. Результати SQL-запиту №2 (продажі за продуктом) — скриншот або таблиця
3. Результати SQL-запиту №3 (регіон × місяць) — скриншот або таблиця
4. Скриншот дашборду Looker Studio з щонайменше 3 charts
5. Скриншот виконання запиту до публічного датасету з BigQuery Console
6. Відповіді на контрольні запитання у файлі `lab16.md`
7. Посилання на GitHub з кодом надіслати в Classroom
