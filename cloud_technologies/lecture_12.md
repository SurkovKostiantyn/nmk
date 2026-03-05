# Лекція №12 (2 години). Мікросервісна архітектура та API-шлюзи

## План лекції

1. Монолітна та мікросервісна архітектура: порівняння
2. Принципи проєктування мікросервісів
3. Комунікація між сервісами: синхронна та асинхронна
4. API Gateway: концепція та хмарні реалізації
5. Service Mesh та розподілена простежуваність

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

## Висновки

1. **Мікросервісна архітектура** вирішує проблему масштабованості та незалежного деплойменту, але вносить складність розподілених систем (мережеві відмови, distributed transactions, observability).

2. **DDD та Bounded Context** є найкращою методологією для виявлення правильних меж мікросервісів. Неправильна декомпозиція призводить до «distributed monolith» (найгіршого варіанту обох підходів).

3. **Асинхронна комунікація** (SQS, EventBridge, Kafka) є більш відмовостійкою, ніж синхронна (REST/gRPC), оскільки усуває тимчасове зчеплення між сервісами.

4. **API Gateway** забезпечує єдину точку входу для клієнтів та централізує наскрізні функції (автентифікація, rate limiting, логування), виводячи їх із бізнес-логіки сервісів.

5. **Service Mesh** автоматизує реалізацію mTLS, observability та traffic policies на рівні інфраструктури, не вимагаючи змін у коді застосунків.

---

## Джерела

1. Newman, S. (2021). _Building Microservices_ (2nd ed.). O'Reilly Media.
2. Richardson, C. (2018). _Microservices Patterns_. Manning.
3. Evans, E. (2003). _Domain-Driven Design_. Addison-Wesley.
4. AWS Documentation. (2024). _Amazon API Gateway Developer Guide_. https://docs.aws.amazon.com/apigateway/
5. AWS Documentation. (2024). _Amazon SQS Developer Guide_. https://docs.aws.amazon.com/sqs/
6. Istio Documentation. (2024). _Istio Service Mesh_. https://istio.io/docs/

---

## Запитання для самоперевірки

1. Назвіть ключові проблеми монолітної архітектури при масштабуванні команди та системи.
2. Що таке Bounded Context у DDD? Як він допомагає визначити межі мікросервісу?
3. Поясніть патерн Database per Service. Яку проблему вирішує порівняно зі Shared Database?
4. Що таке Saga pattern? Чим він відрізняється від ACID-транзакцій?
5. Коли гRPC є кращим вибором за REST для комунікації між сервісами?
6. Поясніть різницю між SQS та SNS. Що таке Fan-out патерн?
7. Що таке API Gateway? Назвіть 5 наскрізних функцій, які він виконує.
8. Що таке Service Mesh (Istio)? Яку проблему вирішує Sidecar Proxy?
9. Поясніть Choreography-based Saga з прикладом E-commerce.
10. Чому Martin Fowler рекомендує не починати нові проєкти відразу з мікросервісів?
