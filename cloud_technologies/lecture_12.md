# Лекція №12 (2 години). Мікросервісна архітектура та API-шлюзи

## План лекції

1. Монолітна та мікросервісна архітектура: порівняння
2. Принципи проєктування мікросервісів
3. Комунікація між сервісами: синхронна та асинхронна
4. API Gateway: концепція та хмарні реалізації
5. Service Mesh та розподілена простежуваність
6. No-Code/Low-Code інтеграційні платформи: n8n та аналоги

## Перелік умовних скорочень

Списком

- **API** — Application Programming Interface — програмний інтерфейс застосунку
- **REST** — Representational State Transfer — архітектурний стиль API
- **gRPC** — Google Remote Procedure Call — фреймворк RPC від Google
- **SQS** — Amazon Simple Queue Service — черга повідомлень
- **SNS** — Amazon Simple Notification Service — сервіс сповіщень
- **CQRS** — Command Query Responsibility Segregation — розділення відповідальності
- **DDD** — Domain-Driven Design — проєктування на основі домену
- **CI/CD** — Continuous Integration / Continuous Delivery
- **JWT** — JSON Web Token — токен автентифікації
- **mTLS** — Mutual TLS — взаємна аутентифікація TLS
- **EDA** — Event-Driven Architecture — архітектура, керована подіями
- **ACM** — AWS Certificate Manager — менеджер сертифікатів AWS
- **WAF** — Web Application Firewall — брандмауер веб-застосунків
- **DNS** — Domain Name System — система доменних імен
- **RPC** — Remote Procedure Call — виклик віддаленої процедури
- **n8n** — Node-based workflow automation tool — інструмент автоматизації робочих процесів
- **iPaaS** — Integration Platform as a Service — інтеграційна платформа як послуга
- **Webhook** — HTTP-зворотній виклик при настанні події
- **ETL** — Extract, Transform, Load — видобування, трансформація, завантаження
- **BPMN** — Business Process Model and Notation — нотація моделювання бізнес-процесів
- **OSS** — Open Source Software — відкрите програмне забезпечення

---

## Вступ

З ростом складності програмних систем монолітна архітектура дедалі більше стає перешкодою: окремі команди блокують одна одну, деплоймент цілого застосунку вимагає узгодження всіх змін, а масштабування окремих компонентів неможливе. Мікросервісна архітектура вирішує ці проблеми шляхом декомпозиції монолітного застосунку на незалежні, автономні сервіси — але водночас вносить нові виклики з розподіленими системами.

---

## 1. Монолітна та мікросервісна архітектура

### 1.1 Монолітна архітектура

**Моноліт** — застосунок, де всі модулі зібрані в єдиний розгортуваний артефакт (JAR, EXE, WAR).

**Типи монолітів:**

- **Single-process monolith**: усе в одному процесі
- **Distributed monolith**: кілька сервісів, але жорстко пов'язані між собою
- **Modular monolith**: чітка внутрішня модульність, але один деплоймент

**Проблеми монолітів при зростанні:**

- **Coupling (зв'язаність)**: зміна одного модуля ламає інший
- **Deployment risk**: деплоймент маленької зміни вимагає re-deployment всього
- **Масштабування**: не можна масштабувати лише один «гарячий» модуль
- **Технологічна негнучкість**: весь моноліт на одному стеку
- **Командна залежність**: команди блокують одна одну через спільний код

### 1.2 Мікросервісна архітектура

```
Моноліт                        Мікросервіси
┌─────────────────┐            ┌─────────┐  ┌─────────┐  ┌─────────┐
│  UI             │            │  Auth   │  │ Orders  │  │ Payment │
│  Auth           │  →→→→→→    │ Service │  │ Service │  │ Service │
│  Orders         │            └────┬────┘  └────┬────┘  └────┬────┘
│  Payment        │                 │             │             │
│  Notifications  │            ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│  DB             │            │ Auth DB │  │Orders DB│  │Pmnt DB  │
└─────────────────┘            └─────────┘  └─────────┘  └─────────┘
```

**Ключові характеристики мікросервісів:**

- **Single Responsibility**: кожен сервіс відповідає за одну бізнес-можливість
- **Незалежний деплоймент**: команда сервісу деплоїть нові версії самостійно
- **Власна БД**: кожен сервіс має свою базу (Database per Service pattern)
- **Технологічний плюралізм**: кожен сервіс може використовувати різні мови та БД

### 1.3 Коли не варто починати з мікросервісів

Martin Fowler стверджує: **«Don't start with microservices»** для нових проєктів:

- Спочатку побудуйте модульний моноліт, поки домен не зрозумілий
- Декомпозиція на мікросервіси по неправильних межах (seams) — гірше монолітa
- Мікросервіси додають складність: мережеві виклики, distributed transactions, observability

---

## 2. Принципи проєктування мікросервісів

### 2.1 Domain-Driven Design (DDD) та Bounded Context

**Bounded Context (Обмежений контекст)** — природний кордон для одного мікросервісу: один контекст має чітку відповідальність і власну модель даних.

_Приклад: E-commerce:_

- Контекст `Catalog`: товари, категорії, атрибути
- Контекст `Orders`: замовлення, рядки замовлення, статус
- Контекст `Inventory`: залишки, резервації
- Контекст `Shipping`: доставка, трекінг

### 2.2 Патерн Database per Service

**Антипатерн** — спільна БД для кількох сервісів (Shared Database):

```
Order Service ──► shared_db ◄── Inventory Service
                    (ПРОБЛЕМА: схема змінюється → ламаються обидва сервіси)
```

**Правильно** — Database per Service:

```
Order Service ──► orders_db (PostgreSQL)
Inventory Service ──► inventory_db (MySQL)
User Service ──► users_db (MongoDB)
```

### 2.3 Патерн Saga для розподілених транзакцій

Мікросервіси не підтримують distributed ACID-транзакції. **Saga** — альтернатива:

**Choreography-based Saga (без центрального оркестратора):**

```
Order Service → OrderCreated event
  └──► Inventory Service → InventoryReserved event
         └──► Payment Service → PaymentProcessed event
                └──► Shipping Service → ShippingScheduled event
```

При відмові на будь-якому кроці — компенсаційні транзакції відкочують попередні кроки.

---

## 3. Комунікація між сервісами

### 3.1 Синхронна комунікація (REST та gRPC)

**REST (HTTP/JSON):**

- Простий, widely supported
- Синхронний: клієнт чекає відповіді
- Недолік: тимчасове зчеплення (якщо сервіс недоступний — запит падає)

**gRPC (Protocol Buffers + HTTP/2):**

- Типізований контракт (`.proto` файл)
- До 7–10× ефективніший за JSON за обсягом
- Підтримка streaming (server-side, bi-directional)
- Ідеально для internal service-to-service комунікації

### 3.2 Асинхронна комунікація (черги та теми)

**Amazon SQS (Simple Queue Service):**

- Point-to-point черга повідомлень: один publisher → одна черга → один consumer
- Гарантована одноразова доставка (Standard Queue: at-least-once; FIFO: exactly-once)
- **Dead Letter Queue (DLQ)**: повідомлення, що не вдалось обробити → окрема черга для аналізу

**Amazon SNS (Simple Notification Service):**

- Pub/Sub: один publisher → кілька subscribers (SQS, Lambda, HTTP, Email, SMS)
- Fan-out pattern: одне SNS-повідомлення доставляється до кількох SQS-черг паралельно

**Amazon EventBridge:**

- Event bus з правилами маршрутизації
- Інтеграція з 200+ AWS-сервісів та SaaS-партнерами
- Schema Registry: каталог схем подій

**Apache Kafka / Amazon MSK (Managed Streaming for Kafka):**

- Розподілений журнал подій (event log) для надвисоких навантажень
- Утримання подій: дні/тижні (на відміну від SQS)
- Replay: клієнти можуть перечитати події з початку
- Стандарт для EDA (Event-Driven Architecture) у великих системах

---

## 4. API Gateway

### 4.1 Концепція API Gateway

**API Gateway** — єдина точка входу для всіх клієнтів (браузер, мобільний, зовнішній API). Виконує наскрізні (cross-cutting) функції:

```
Клієнт → ┌──────────────────────────────────┐ → Мікросервіс A
          │         API Gateway              │ → Мікросервіс B
          │  • Маршрутизація запитів         │ → Мікросервіс C
          │  • Автентифікація (JWT/API Key)  │
          │  • Авторизація                   │
          │  • Rate Limiting                 │
          │  • SSL Termination               │
          │  • Request/Response Transform    │
          │  • Caching                       │
          │  • Logging                       │
          └──────────────────────────────────┘
```

### 4.2 Amazon API Gateway

**Amazon API Gateway** — повністю кероване рішення для HTTP та WebSocket API:

- **REST API**: повна функціональність (тюнінг кешу, mock responses, usage plans)
- **HTTP API**: простіший, дешевший (~71% дешевше), покриває 80% кейсів
- **WebSocket API**: двонаправлений зв'язок для real-time застосунків (чат, торгівля)

**Інтеграції API Gateway:**

- AWS Lambda (найпоширеніше: serverless backend)
- HTTP endpoint (будь-який URL)
- AWS Service (DynamoDB, SQS напряму без Lambda)
- Mock (повернути заданий статичний response)

**Usage Plans та API Keys:**
Обмеження кількості запиту для конкретного клієнта (throttling, quotas) — для монетизації API.

### 4.3 Azure API Management та Google Cloud Apigee

**Azure API Management (APIM):**

- Developer Portal: автогенерований портал для зовнішніх розробників
- Policies: XML-конфігурація трансформацій (rate limiting, JWT validation, IP filter)
- Products: групування API у продукти з планами доступу

**Google Cloud Apigee:**

- Enterprise API Management платформа (придбана Google у 2016)
- Analytics: деталізована аналітика використання API
- Monetization: вбудована монетизація API
- Hybrid deployment: запуск на GCP, AWS або on-premise

---

## 5. Service Mesh

### 5.1 Проблеми без Service Mesh

При десятках мікросервісів у K8s виникають наскрізні проблеми:

- Як реалізувати mTLS між сервісами (шифрування трафіку)?
- Як виміряти затримку між кожною парою сервісів?
- Як реалізувати Circuit Breaker без змін у коді кожного сервісу?

### 5.2 Istio та AWS App Mesh

**Service Mesh (Istio, Linkerd)** вирішує ці задачі шляхом додавання sidecar-проксі (Envoy) до кожного Pod:

```
Pod A: [Застосунок] + [Envoy Proxy]
         │ (через sidecar)
         ▼
Pod B: [Застосунок] + [Envoy Proxy]

Istio Control Plane (istiod):
  → розповсюджує конфігурацію mTLS сертифікатів
  → збирає Telemetry (metrics, traces, logs) від Envoy
  → управляє traffic policies (retries, circuit breaking, canary)
```

---

## 6. No-Code/Low-Code інтеграційні платформи: n8n та аналоги

### 6.1 Контекст: проблема «клею» між мікросервісами

У мікросервісній архітектурі неминуче виникає потреба в **інтеграційному шарі** — коді, що з'єднує різнорідні сервіси, трансформує дані між ними та реагує на події. Такий код часто називають «glue code» (код-клей): він не містить бізнес-логіки, але є критично важливим для роботи всієї системи.

Традиційний підхід — писати цей клей вручну (Lambda-функції, скрипти, мікросервіси-адаптери). **No-Code/Low-Code Integration Platforms** пропонують альтернативу: графічний конструктор **workflow** (робочих процесів), де інтеграції описуються не кодом, а візуальними діаграмами з'єднання вузлів.

### 6.2 n8n — відкрита платформа автоматизації

**n8n** (вимовляється «nodemation», n-eight-n) — відкрита (fair-code license) платформа автоматизації робочих процесів з можливістю self-hosting. Створена у 2019 році Яном Оберхайзером.

**Ключові характеристики n8n:**

- **Self-hosted або хмарне SaaS** (n8n.cloud): повний контроль над даними
- **450+ вбудованих інтеграцій** (Slack, GitHub, PostgreSQL, S3, Stripe, Telegram, OpenAI тощо)
- **JavaScript/Python у вузлах** для складних трансформацій даних
- **Webhooks**: прийом HTTP-запитів від зовнішніх сервісів
- **Розклад** (Cron): запуск workflows за розкладом
- **Sub-workflows**: виклик одного workflow з іншого
- **Error handling**: обробка помилок на рівні workflow
- **Fair-code license**: безкоштовно для self-hosted; комерційна ліцензія для вбудованого перепродажу

**Архітектура n8n:**

```
┌──────────────────────────────────────────────────────────────┐
│                      n8n Server                              │
│                                                              │
│  ┌───────────┐   ┌────────────┐   ┌────────────────────────┐│
│  │ Scheduler │   │  Webhook   │   │  Workers (queue mode)  ││
│  │  (Cron)   │   │  Receiver  │   │  (Redis + Bull)        ││
│  └─────┬─────┘   └─────┬──────┘   └──────────┬─────────────┘│
│        │               │                      │              │
│        └───────────────┼──────────────────────┘              │
│                        ▼                                     │
│              ┌─────────────────┐                             │
│              │  Workflow Engine │                             │
│              │  (Node Runner)  │                             │
│              └────────┬────────┘                             │
│                       │ виконує вузли послідовно/паралельно  │
│  ┌────────┐  ┌───────┐│┌──────────┐  ┌──────────┐           │
│  │HTTP    │  │Slack  │││PostgreSQL│  │ OpenAI   │  ...      │
│  │Request │  │Node  │││  Node    │  │  Node    │           │
│  └────────┘  └───────┘│└──────────┘  └──────────┘           │
│              ┌─────────────────┐                             │
│              │   SQLite / PG   │ (зберігання workflow + logs)│
│              └─────────────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Роль n8n у мікросервісній архітектурі

**n8n як Integration Middleware:**

```
┌──────────────────────────────────────────────────────────────┐
│                    Мікросервісна система                     │
│                                                              │
│  Order Service ──► SQS Queue ──►┐                           │
│                                  │   ┌──────────────────┐   │
│  Payment Service ──► Webhook ───►├──►│  n8n Workflow    │   │
│                                  │   │  (Integration    │───►│Slack│
│  CRM (Salesforce) ──► API ──────►│   │   Middleware)    │   │     │
│                                  │   └───────┬──────────┘   │Email│
│                                              │               │     │
│                        ┌─────────────────────┘               │DB   │
│                        ▼                                      └─────┘
│              Inventory Service API
└──────────────────────────────────────────────────────────────┘
```

**Типові сценарії використання n8n у мікросервісах:**

| Сценарій                 | Опис                                                                  | Альтернатива без n8n            |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------- |
| **Event forwarding**     | Подія в SQS → трансформація → POST в зовнішній CRM                    | Lambda + кастомний код          |
| **Data synchronization** | Щогодини синхронізувати замовлення між Order Service та ERP           | Scheduled Lambda + DB queries   |
| **Notification routing** | При новому замовленні → Slack-повідомлення + Email + Telegram         | Lambda + SNS + кілька адаптерів |
| **API orchestration**    | Агрегувати дані з 5 API → трансформувати → записати в БД              | Кастомний aggregator-сервіс     |
| **Approval workflow**    | Людина затверджує замовлення через форму → активується наступний крок | BPMN-система або кастомний код  |
| **Error alerting**       | CloudWatch Alarm → Webhook → n8n → Slack + Jira issue                 | Lambda                          |

### 6.4 Приклад workflow n8n: сповіщення при новому замовленні

**Сценарій:** Коли в базі даних PostgreSQL з'являється нове замовлення → надіслати повідомлення у Slack та відправити Email клієнту.

```
[Trigger: PostgreSQL]                           [Налаштування]
  Тип: Poll                             ──►     Query:
  Interval: 1 хвилина                           SELECT * FROM orders
                                                 WHERE created_at > {{$now.minus(1,'minute')}}
                                                 AND status = 'new'
         │
         ▼
[IF: є нові замовлення?]
  true ──────────────────────────────────────────────────────────┐
  false → Stop workflow                                           │
                                                                  │
         ┌────────────────────────────────────────────────────────┘
         │
         ▼
[Split In Batches]  ← для кожного замовлення окремо
         │
         ├──► [Slack Node]
         │      Channel: #orders
         │      Message: «Нове замовлення #{{$json.id}} від {{$json.customer_name}}
         │                на суму {{$json.total}} грн»
         │
         └──► [Send Email Node]
                To: {{$json.customer_email}}
                Subject: Ваше замовлення #{{$json.id}} прийнято
                Body: HTML-шаблон з деталями замовлення
```

**Код у вузлі «Function» (JavaScript) для трансформації даних:**

```javascript
// Вузол: Transform Order Data
const orders = $input.all();

return orders.map((order) => ({
  json: {
    ...order.json,
    total_formatted: `${(order.json.total / 100).toFixed(2)} грн`,
    created_at_formatted: new Date(order.json.created_at).toLocaleString(
      "uk-UA",
      { timeZone: "Europe/Kyiv" },
    ),
    customer_name: order.json.first_name + " " + order.json.last_name,
  },
}));
```

### 6.5 Розгортання n8n у хмарі

**Варіант 1: Docker Compose (локально або на VM)**

```yaml
# docker-compose.yml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=securepassword
      - N8N_HOST=n8n.mycompany.com
      - N8N_PROTOCOL=https
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8npassword
      - EXECUTIONS_MODE=queue # для горизонтального масштабування
      - QUEUE_BULL_REDIS_HOST=redis
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on: [postgres, redis]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8npassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  n8n_data:
  postgres_data:
```

**Варіант 2: Kubernetes Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n
spec:
  replicas: 1
  selector:
    matchLabels: { app: n8n }
  template:
    metadata:
      labels: { app: n8n }
    spec:
      containers:
        - name: n8n
          image: n8nio/n8n:latest
          ports:
            - containerPort: 5678
          env:
            - name: DB_TYPE
              value: postgresdb
            - name: N8N_BASIC_AUTH_ACTIVE
              value: "true"
          envFrom:
            - secretRef:
                name: n8n-secrets # DB_PASSWORD, AUTH_PASSWORD тощо
          resources:
            requests: { cpu: 250m, memory: 512Mi }
            limits: { cpu: 500m, memory: 1Gi }
```

### 6.6 Порівняння: n8n та аналоги

**Хмарні No-Code/Low-Code iPaaS платформи:**

| Платформа              | Тип      | Ліцензія   | Hosting      | Безкоштовний тир           | Сильна сторона                      |
| ---------------------- | -------- | ---------- | ------------ | -------------------------- | ----------------------------------- |
| **n8n**                | Low-code | Fair-code  | Self + Cloud | Self-hosted безліміт       | Технічна гнучкість, JS/Python вузли |
| **Make (Integromat)**  | No-code  | Комерційна | SaaS         | 1000 ops/міс               | Простота, готові шаблони            |
| **Zapier**             | No-code  | Комерційна | SaaS         | 100 task/міс               | Найбільше інтеграцій (7000+)        |
| **Apache Airflow**     | Code     | OSS        | Self         | Безкоштовно                | DAG-орієнтований, Data Engineering  |
| **AWS Step Functions** | Low-code | AWS        | Cloud        | 4000 state transitions/міс | Глибока AWS-інтеграція              |
| **Azure Logic Apps**   | Low-code | Azure      | Cloud        | 4000 runs/міс              | Office 365, Teams, SharePoint       |
| **Temporal**           | Code     | OSS        | Self + Cloud | Безкоштовно                | Надійні довготривалі workflow       |
| **Prefect**            | Code     | OSS+SaaS   | Self + Cloud | Є                          | Data pipeline orchestration         |

**Детальніше про ключових конкурентів:**

**Make (раніше Integromat):**

- Найближчий конкурент n8n за функціональністю та ціною
- Povний No-code: інтуїтивніший для нетехнічних користувачів
- «Scenario» = n8n workflow; «Module» = n8n вузол
- Обмеження: немає JavaScript в базовому тирі; платний self-hosting

**Azure Logic Apps:**

- Microsoft-орієнтований: найкраща інтеграція з Teams, SharePoint, Office 365, Dynamics
- Flow-designer у браузері без коду
- **Consumption model**: оплата за кількість дій (actions) — передбачуваний для малих workflow
- Connector library: 1000+ готових конекторів
- Nested Logic Apps: виклик одного з іншого (аналог n8n Sub-workflows)

**Apache Airflow:**

- **Python-first**: workflow описуються як DAG (Directed Acyclic Graph) у Python-файлах
- Ідеальний для **Data Engineering** (ETL/ELT пайплайни, ML pipelines)
- Не підходить для event-driven сценаріїв (лише розклад і ручний запуск)
- **AWS MWAA** (Managed Workflows for Apache Airflow) — хмарна версія від AWS
- **Google Cloud Composer** — хмарна версія від Google

**Temporal:**

- Платформа для **reliable long-running workflows** (транзакції, що тривають дні/тижні)
- Code-first (Go, Java, Python, TypeScript SDK)
- Унікальна функція: **автоматичне відновлення** після падіння worker — workflow продовжується з того місця, де зупинився
- Ідеально для Saga-оркестрації

### 6.7 Критерії вибору між підходами

**Коли n8n краще ніж кастомний Lambda/сервіс:**

- Не-технічні члени команди мають підтримувати або змінювати workflow
- Інтеграції між 3+ сторонніми сервісами (Slack + GitHub + CRM + Email)
- Прототипування інтеграцій за лічені хвилини
- Потрібні вбудований UI для журналу виконань та помилок
- Невелика команда без ресурсів на підтримку кастомного коду

**Коли кастомний код краще ніж n8n:**

- Критичні з точки зору latency операції (< 100 мс — n8n не підходить)
- Складна бізнес-логіка, що потребує unit-тестування
- Великі обсяги даних (n8n не є data streaming платформою)
- Суворі вимоги до безпеки та аудиту (хоча self-hosted n8n вирішує більшість)

---

## Висновки

1. **Мікросервісна архітектура** вирішує проблему масштабованості та незалежного деплойменту, але вносить складність розподілених систем (мережеві відмови, distributed transactions, observability).

2. **DDD та Bounded Context** є найкращою методологією для виявлення правильних меж мікросервісів. Неправильна декомпозиція призводить до «distributed monolith» (найгіршого варіанту обох підходів).

3. **Асинхронна комунікація** (SQS, EventBridge, Kafka) є більш відмовостійкою, ніж синхронна (REST/gRPC), оскільки усуває тимчасове зчеплення між сервісами.

4. **API Gateway** забезпечує єдину точку входу для клієнтів та централізує наскрізні функції (автентифікація, rate limiting, логування), виводячи їх із бізнес-логіки сервісів.

5. **Service Mesh** автоматизує реалізацію mTLS, observability та traffic policies на рівні інфраструктури, не вимагаючи змін у коді застосунків.

6. **n8n та iPaaS-платформи** (Make, Azure Logic Apps, Zapier) заповнюють нішу «glue code» між мікросервісами — дозволяючи автоматизувати інтеграції без або з мінімальним кодом. n8n є найбільш технічно гнучким рішенням для self-hosted сценаріїв із підтримкою JavaScript/Python, тоді як AWS Step Functions та Azure Logic Apps є оптимальними для deep cloud-native інтеграцій у відповідних екосистемах.

---

## Джерела

1. Newman, S. (2021). _Building Microservices_ (2nd ed.). O'Reilly Media.
2. Richardson, C. (2018). _Microservices Patterns_. Manning.
3. Evans, E. (2003). _Domain-Driven Design_. Addison-Wesley.
4. AWS Documentation. (2024). _Amazon API Gateway Developer Guide_. https://docs.aws.amazon.com/apigateway/
5. AWS Documentation. (2024). _Amazon SQS Developer Guide_. https://docs.aws.amazon.com/sqs/
6. Istio Documentation. (2024). _Istio Service Mesh_. https://istio.io/docs/
7. n8n Documentation. (2024). _n8n Workflow Automation_. https://docs.n8n.io/
8. Fowler, M. (2015). _Workflow Patterns_. https://martinfowler.com/articles/workflowPatterns.html
9. Oberheiser, J. (2023). _n8n: Fair-code Workflow Automation_. https://n8n.io/blog/

---

## Запитання для самоперевірки

1. Назвіть ключові проблеми монолітної архітектури при масштабуванні команди та системи.
2. Що таке Bounded Context у DDD? Як він допомагає визначити межі мікросервісу?
3. Поясніть патерн Database per Service. Яку проблему вирішує порівняно зі Shared Database?
4. Що таке Saga pattern? Чим він відрізняється від ACID-транзакцій?
5. Коли gRPC є кращим вибором за REST для комунікації між сервісами?
6. Поясніть різницю між SQS та SNS. Що таке Fan-out патерн?
7. Що таке API Gateway? Назвіть 5 наскрізних функцій, які він виконує.
8. Що таке Service Mesh (Istio)? Яку проблему вирішує Sidecar Proxy?
9. Поясніть Choreography-based Saga з прикладом E-commerce.
10. Чому Martin Fowler рекомендує не починати нові проєкти відразу з мікросервісів?
11. Що таке n8n? Чим він відрізняється від AWS Lambda як інструменту інтеграції?
12. Назвіть 3 сценарії у мікросервісній архітектурі, де n8n є доцільнішим, ніж кастомний код.
13. Порівняйте n8n та Apache Airflow: для яких задач підходить кожен?
14. Що таке iPaaS? Наведіть приклади хмарних iPaaS-рішень від AWS і Azure.
15. У яких випадках кастомний Lambda-код є кращим вибором, ніж No-Code платформа?
