# Лекція №9 (2 години). Моніторинг, логування та відмовостійкість в IaaS

## План лекції

1. Концепція спостережуваності (Observability): метрики, логи, трейси
2. Хмарні сервіси моніторингу: CloudWatch, Azure Monitor, Cloud Monitoring
3. Логування та централізований збір журналів
4. Розподілене трасування
5. Відмовостійкість: патерни надійних систем

## Перелік умовних скорочень

Списком

- **SRE** — Site Reliability Engineering — інженерія надійності сайтів
- **SLA** — Service Level Agreement — угода про рівень обслуговування
- **SLO** — Service Level Objective — цільовий рівень обслуговування
- **SLI** — Service Level Indicator — показник рівня обслуговування
- **MTTR** — Mean Time To Recovery — середній час відновлення
- **MTBF** — Mean Time Between Failures — середній час між відмовами
- **APM** — Application Performance Monitoring — моніторинг продуктивності застосунків
- **ELK** — Elasticsearch, Logstash, Kibana — стек для роботи з логами
- **RCA** — Root Cause Analysis — аналіз першопричини інцидентів
- **AZ** — Availability Zone — зона доступності
- **DR** — Disaster Recovery — аварійне відновлення
- **PII** — Personally Identifiable Information — персонально ідентифікована інформація
- **TTL** — Time to Live — час існування
- **WAF** — Web Application Firewall — міжмережевий екран веб-застосунків

---

## Вступ

Розгортання системи в хмарі — це лише початок. Дійсна зрілість хмарних операцій визначається здатністю команди **зрозуміти, що відбувається всередині системи** в будь-який момент часу та швидко реагувати на відхилення від норми. Саме тут концепція **спостережуваності (Observability)** стає центральною.

Паралельно, будь-яка система врешті-решт зазнає збоїв — питання не «чи відбудеться відмова», а «коли» і «наскільки добре система відновиться». Проєктування систем з урахуванням відмов (**Design for Failure**) є фундаментальним принципом хмарної архітектури.

---

## 1. Концепція спостережуваності (Observability)

### 1.1 Observability vs Monitoring

**Monitoring (Моніторинг)** — відповідає на питання «**Чи справна система?**». Ми заздалегідь знаємо, що перевіряти.

**Observability (Спостережуваність)** — відповідає на питання «**Чому система поводить себе саме так?**». Дозволяє досліджувати невідомі раніше стани.

Система є спостережуваною, якщо її внутрішній стан можна визначити лише на основі зовнішніх виходів (телеметрії).

### 1.2 Три стовпи спостережуваності

**Metrics (Метрики)** — числові значення, що вимірюються у часі:

- CPU utilization: 78%
- Requests/sec: 1 250
- Error rate: 0.3%
- Response time (p95): 230 ms
- Queue depth: 42

Метрики — агреговані, займають мало місця, ідеальні для алертів і дашбордів.

**Logs (Журнали)** — дискретні події у часі зі структурованим або неструктурованим текстом:

```json
{
  "timestamp": "2024-01-15T14:23:45.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "message": "Payment gateway timeout",
  "transaction_id": "tx-9f8b2c",
  "user_id": "u-12345",
  "duration_ms": 5001,
  "gateway": "stripe"
}
```

Логи детальні, але займають багато місця. Ідеальні для дебагінгу та розслідування інцидентів.

**Traces (Розподілені трейси)** — фіксація шляху запиту через усі мікросервіси системи:

```
HTTP GET /api/orders/123
│
├── auth-service (25ms) — перевірка токена
│
├── order-service (180ms) — обробка
│   ├── db-query (45ms) — SELECT * FROM orders
│   └── inventory-service (120ms) — перевірка наявності
│       └── db-query (35ms)
│
└── notification-service (15ms) — надсилання email
```

Трейси є критичними для мікросервісних архітектур — дозволяють знайти "вузькі місця" у ланцюжку запитів.

### 1.3 SLA, SLO, SLI

**SLI (Service Level Indicator)** — конкретна метрика, що вимірює якість обслуговування:

- Доступність: `успішні запити / всі запити × 100%`
- Затримка: `% запитів, що виконані швидше порогового часу`
- Частота помилок: `помилкові запити / всі запити`

**SLO (Service Level Objective)** — цільове значення SLI:

- Доступність ≥ 99.9% за місяць
- p99 затримка ≤ 500 мс
- Частота помилок ≤ 0.1%

**SLA (Service Level Agreement)** — юридично обов'язкова угода між провайдером і клієнтом, базується на SLO. Передбачає компенсацію при порушенні.

**Error Budget (Бюджет помилок):**

```
SLO: 99.9% доступність / місяць
Error budget: 100% - 99.9% = 0.1% = 43.8 хвилин простою/місяць

Використано: 25 хвилин → залишок: 18.8 хвилин
```

Команда може витрачати error budget на ризиковані деплойменти. Якщо budget вичерпано — нові feature-деплойменти призупиняються до кінця місяця.

---

## 2. Хмарні сервіси моніторингу

### 2.1 Amazon CloudWatch

**Amazon CloudWatch** — центральна платформа моніторингу та спостережуваності в AWS.

**Компоненти CloudWatch:**

**CloudWatch Metrics:**

- Автоматично збирає метрики від усіх AWS-сервісів (EC2, RDS, Lambda, ELB тощо) щохвилини
- Granularity: 1-хвилинні метрики (стандарт), 1-секундні (High Resolution)
- **Custom Metrics**: надсилання власних метрик застосунків через API або agentS
- Зберігання метрик: 15 місяців

**CloudWatch Alarms (Сповіщення):**

```
Alarm: WebServerCPUHigh
  Metric:    CPUUtilization (EC2 Auto Scaling Group)
  Threshold: > 80% протягом 3 з 3 хвилин
  Action:    → SNS notification (email/SMS)
             → Auto Scaling: додати 2 інстанси
```

**CloudWatch Dashboards:**
Кастомні дашборди для візуалізації метрик у реальному часі. Підтримку: графіки, числа, heatmap, alarm status.

**CloudWatch Logs:**

- Централізований збір журналів від EC2, Lambda, ECS, API Gateway
- **Log Groups** → **Log Streams**
- CloudWatch Logs Insights: SQL-подібний запитний мовою для аналізу логів

**CloudWatch Container Insights:**
Автоматичний збір метрик та логів з EKS та ECS кластерів.

**Агент CloudWatch (CloudWatch Agent):**
Встановлюється на EC2 для збору додаткових метрик (використання RAM, дискового простору — не доступні за замовчуванням) та надсилання логів застосунків.

### 2.2 Amazon CloudWatch Synthetics та Real User Monitoring

**CloudWatch Synthetics (Canary):**

- Запускають скрипти, що симулюють поведінку реального користувача (відкрити URL, клікнути кнопку, заповнити форму)
- Перевіряють доступність і функціональність ендпоінтів кожну хвилину
- Сповіщення при виявленні проблем ще до того, як їх помітять реальні користувачі

### 2.3 Azure Monitor та Application Insights

**Azure Monitor** — єдина платформа моніторингу в Azure:

- **Metrics**: метрики Azure-ресурсів
- **Log Analytics Workspace**: централізований збір та аналіз логів (KQL-мова запитів)
- **Alerts**: повідомлення при перевищенні порогів

**Azure Application Insights (APM):**

- SDK для вбудови в застосунок (Node.js, Python, .NET, Java)
- Автоматичний збір: HTTP-запити, залежності (БД, зовнішні API), виняткові ситуації, трейси
- **Live Metrics**: реальний час із затримкою 1 секунда
- **Funnel аналіз**: де користувачі покидають воронку конверсії
- **Smart Detection**: ML-виявлення аномалій без налаштування порогів

### 2.4 Google Cloud Monitoring та Operations Suite

**Google Cloud Monitoring:**

- Метрики з GCP-ресурсів та кастомні метрики
- **Workspaces**: моніторинг кількох проєктів або навіть AWS-ресурсів

**Google Cloud Trace:** розподілене трасування запитів (автоматична інтеграція з App Engine, GKE).

**Google Cloud Profiler:** аналіз продуктивності коду в production (CPU, heap, mutex) без значного впливу на затримку.

### 2.5 Сторонні інструменти моніторингу

| Інструмент               | Тип                | Особливості                          |
| ------------------------ | ------------------ | ------------------------------------ |
| **Prometheus + Grafana** | Open-source        | Стандарт для K8s-моніторингу         |
| **Datadog**              | SaaS               | Повна observability, AI-аналітика    |
| **New Relic**            | SaaS               | APM + Infrastructure + Logs в одному |
| **Dynatrace**            | SaaS               | AI-автоматична побудова топології    |
| **Elastic (ELK)**        | Open-source + SaaS | Потужний пошук та аналіз логів       |

---

## 3. Логування та централізований збір журналів

### 3.1 Принципи ефективного логування

**Структуроване логування (JSON):**

```json
{
  "timestamp": "2024-01-15T14:23:45.123Z",
  "level": "INFO",
  "service": "order-service",
  "version": "1.4.2",
  "trace_id": "abc123def456",
  "span_id": "xyz789",
  "user_id": "u-12345",
  "action": "order_created",
  "order_id": "ord-98765",
  "amount": 149.99,
  "currency": "UAH"
}
```

**Переваги структурованих логів:**

- Легке парсинг та індексування
- Можна фільтрувати, агрегувати та запитувати через CloudWatch Logs Insights, Splunk, Elasticsearch

**Рівні логування:**

- **DEBUG**: детальна діагностична інформація (тільки при розробці)
- **INFO**: нормальні події (запуск, успішна дія)
- **WARN**: потенційно небезпечна ситуація, але система продовжує працювати
- **ERROR**: помилка, що перешкоджає виконанню конкретної операції
- **CRITICAL/FATAL**: критична помилка, що може спричинити зупинку сервісу

### 3.2 ELK-стек для централізованого логування

**Elasticsearch + Logstash + Kibana (ELK)** — класичний стек для обробки Journal:

```
Джерела логів               Збір/Обробка       Зберігання   Візуалізація
───────────────             ─────────────       ──────────   ────────────
EC2 Instance ──► Filebeat ──►               ──► Elasticsearch ──► Kibana
Lambda       ──► Fluentd  ──► Logstash ─────►   (індекс)         (дашборд,
ECS          ──► Logstash ──►               ──►                   Alerts)
K8s Pods     ──► Fluent Bit►               ──►
```

**OpenSearch** — AWS-форк Elasticsearch, що використовується в Amazon OpenSearch Service (замінник Elasticsearch у хмарі AWS).

### 3.3 Практики керування логами

**Retention Policy (Термін зберігання):**

- DEBUG-логи: 7 днів
- INFO-логи: 30 днів
- ERROR-логи: 90 днів
- Аудит-логи (безпека): 1–7 років (відповідно до GDPR, SOX)

**Log Sanitization (Приховування PII):**

```python
# Неправильно — логування картки
logger.info(f"Processing card {card_number}")  # '4532-1234-5678-9012'

# Правильно — маскування
logger.info(f"Processing card ****{card_number[-4:]}")  # '****9012'
```

---

## 4. Розподілене трасування

### 4.1 Концепція розподіленого трасування

У мікросервісній архітектурі один HTTP-запит може пройти через 10–20 сервісів. **Розподілене трасування** відстежує весь шлях запиту та вимірює час виконання на кожному кроці.

**Terminology:**

- **Trace** — весь шлях одного запиту від початку до кінця
- **Span** — одна операція в межах trace (HTTP-запит, SQL-запит, черга)
- **Trace ID** — унікальний ID, що передається між сервісами через HTTP-заголовок (`X-Trace-Id`)

### 4.2 AWS X-Ray

**AWS X-Ray** — сервіс розподіленого трасування AWS:

```
Service Map (X-Ray Console):

[Browser] ──► [API Gateway] ──► [Lambda: orders] ──► [DynamoDB]
                                        │
                                        └──► [Lambda: inventory] ──► [SQS]
                                        │
                                        └──► [SES: email]
```

Для кожного вузла X-Ray показує:

- Кількість запитів/сек
- Затримку (avg, p99)
- % помилок / throttled / faults

**X-Ray Segment та Subsegment:**

```python
from aws_xray_sdk.core import xray_recorder

@xray_recorder.capture('process_order')
def process_order(order_id):
    with xray_recorder.in_subsegment('validate'):
        validate_order(order_id)
    with xray_recorder.in_subsegment('db_write'):
        save_to_db(order_id)
```

### 4.3 OpenTelemetry — відкритий стандарт

**OpenTelemetry (OTel)** — відкритий стандарт та набір SDK для збору метрик, логів і трейсів, що підтримується CNCF.

Переваги OTel:

- Vendor-neutral: один код → будь-який бекенд (Jaeger, Zipkin, Tempo, X-Ray, Datadog)
- Підтримується всіма хмарними провайдерами та більшістю APM-систем
- Стає стандартом де-факто для observability в K8s

---

## 5. Відмовостійкість: патерни надійних систем

### 5.1 Design for Failure — проєктування з урахуванням відмов

Принцип **«Everything can fail»** стверджує: будь-який компонент системи врешті-решт відмовить. Задача архітектора — спроєктувати систему так, щоб відмова одного компонента не призводила до відмови всієї системи.

**Chaos Engineering (Хаос-інженерія):**
Навмисне введення збоїв у production-систему для перевірки її стійкості.

- **Netflix Chaos Monkey**: інструмент, що випадково зупиняє EC2-інстанси у production
- **AWS Fault Injection Simulator (FIS)**: керовані відмови AWS-ресурсів
- Мета: виявити слабкі місця до того, як вони проявляться в реальній аварії

### 5.2 Ключові патерни відмовостійкості

**Circuit Breaker (Автоматичний вимикач):**
Патерн, що запобігає каскадним відмовам при недоступності залежності.

```
Стан: CLOSED (нормальний)
  → сервіс B недоступний: помилки
  → поріг помилок перевищено

Стан: OPEN (відкритий)
  → запити до B відхиляються миттєво (fallback)
  → чекаємо час відновлення (30 сек)

Стан: HALF-OPEN
  → пробний запит до B
  → успіх → CLOSED
  → невдача → OPEN знову
```

**Retry з Exponential Backoff та Jitter:**

```python
import random
import time

def call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except TransientError as e:
            if attempt == max_retries - 1:
                raise
            # Exponential backoff + random jitter
            wait = (2 ** attempt) + random.uniform(0, 1)  # 1s, 2s, 4s + jitter
            time.sleep(wait)
```

Без jitter: всі клієнти після першої відмови звертаються одночасно → "thundering herd" → сервер перевантажується → нові відмови.

**Bulkhead (Водонепроникна перегородка):**
Ізоляція ресурсів між незалежними частинами системи. Навіть якщо один сервіс вичерпає thread pool — інші продовжать роботу.

```
Worker Threads Pool: 100 потоків
  ├── /api/orders:    40 потоків (ізольований пул)
  ├── /api/users:     30 потоків (ізольований пул)
  └── /api/payments:  30 потоків (ізольований пул)
```

**Timeout (Таймаут):**
Завжди встановлюйте таймаут для зовнішніх викликів. Без таймауту — один повільний зовнішній сервіс може блокувати всі потоки застосунку.

```python
# Без таймауту — небезпечно!
response = requests.get("http://slow-service.internal/api")

# З таймаутом — правильно
response = requests.get("http://slow-service.internal/api", timeout=(3, 10))
# (3s — connect timeout, 10s — read timeout)
```

**Cache-Aside (Кешування):**
Читання з кешу (Redis, Memcached) перед зверненням до БД знижує навантаження на БД та покращує відмовостійкість при пікових навантаженнях.

**Graceful Degradation (Поступова деградація):**
При відмові залежного сервісу — повертати спрощений варіант відповіді замість помилки:

- Сервіс рекомендацій недоступний → показати популярні товари
- Персоналізація недоступна → показати загальний контент

### 5.3 Multi-AZ та Multi-Region для відмовостійкості

**Multi-AZ (всередині регіону):**

- Захист від відмови одного датацентру
- Автоматичне переключення: RDS Multi-AZ, ALB між AZ, ASG Multi-AZ
- Синхронна реплікація даних

**Multi-Region (між регіонами):**

- Захист від катастрофи цілого регіону (землетрус, удар блискавки в підстанцію)
- Складніша реплікація (асинхронна або активно-активна)
- Набагато вища вартість та складність

### 5.4 Runbook та Incident Response

**Runbook (Інструкція з реагування)** — задокументована покрокова інструкція для реагування на конкретний тип інциденту. Критично важлива для ефективного відновлення в 3 годині ночі:

```
Incident: High Error Rate on Payment Service (> 5%)
Severity: P1

1. Перевірити CloudWatch Dashboard: payment-service-prod
2. Перевірити останні деплойменти (CodeDeploy Console, останні 2 год)
3. Перевірити залежності: Stripe API Status (https://status.stripe.com)
4. Перевірити логи: CloudWatch Insights → payment-service → рівень ERROR
5. Якщо деплоймент — виконати rollback (AWS CodeDeploy → попередня версія)
6. Якщо Stripe → увімкнути резервний провайдер (PayPal) через feature flag
7. Повідомити stakeholders через Slack #incidents
8. Провести Post-Mortem протягом 48 годин
```

**Post-Mortem (Пост-метрем):**
Безвинний аналіз інциденту після його усунення:

- Хронологія подій
- Першопричина (Root Cause Analysis)
- Що спрацювало добре / що ні
- Action items для запобігання повторення

---

## Висновки

1. **Observability** — ширша концепція, ніж моніторинг. Три стовпи (метрики, логи, трейси) разом дають повну картину стану системи та дозволяють відповісти на питання «чому?» при виникненні інцидентів.

2. **SLI/SLO/SLA** та Error Budget — фундамент SRE-практик. Помилковий бюджет балансує між надійністю та швидкістю розробки.

3. **CloudWatch, Azure Monitor та GCP Operations** є потужними платформами моніторингу, що надають готові інтеграції з усіма сервісами своїх хмар. Для мультихмарних або K8s-середовищ — Prometheus+Grafana або Datadog.

4. **Розподілене трасування** (X-Ray, Jaeger, OTel) є незамінним для мікросервісних систем, де єдиний запит охоплює десятки сервісів.

5. **Патерни відмовостійкості** (Circuit Breaker, Retry, Bulkhead, Timeout, Graceful Degradation) та Multi-AZ розгортання — фундамент production-систем. Design for Failure та Chaos Engineering гарантують, що система витримає реальні збої.

---

## Джерела

1. Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly Media.
2. Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (2016). _Site Reliability Engineering_ (Google SRE Book). O'Reilly.
3. AWS Documentation. (2024). _Amazon CloudWatch User Guide_. https://docs.aws.amazon.com/cloudwatch/
4. AWS Documentation. (2024). _AWS X-Ray Developer Guide_. https://docs.aws.amazon.com/xray/
5. OpenTelemetry. (2024). _OpenTelemetry Documentation_. https://opentelemetry.io/docs/
6. Nygard, M. T. (2018). _Release It!: Design and Deploy Production-Ready Software_ (2nd ed.). Pragmatic Bookshelf.
7. Microsoft. (2024). _Azure Monitor Documentation_. https://learn.microsoft.com/en-us/azure/azure-monitor/

---

## Запитання для самоперевірки

1. Поясніть різницю між Monitoring та Observability. Чому Observability є ширшою концепцією?
2. Назвіть три стовпи спостережуваності. Яка інформація міститься у кожному з них?
3. Що таке SLI, SLO та SLA? Наведіть конкретні приклади для сервісу онлайн-платежів.
4. Що таке Error Budget? Як він впливає на рішення щодо ризикованих деплойментів?
5. Які метрики AWS CloudWatch збирає автоматично. Для яких метрик потрібен CloudWatch Agent?
6. Почому слід використовувати структуровані логи (JSON) замість неструктурованого тексту? Наведіть приклад.
7. Поясніть концепцію розподіленого трасування. Що таке Trace, Span та Trace ID?
8. Що таке Circuit Breaker? Опишіть три стани та переходи між ними.
9. Навіщо до механізму Retry додають Exponential Backoff та Jitter? Яку проблему вирішує Jitter?
10. Що таке Chaos Engineering та Chaos Monkey? Яку мету переслідує навмисне руйнування production-системи?
