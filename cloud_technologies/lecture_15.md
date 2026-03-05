# Лекція №15 (2 години). Serverless-обчислення та хмарні функції

## План лекції

1. Концепція Serverless та FaaS (Function as a Service)
2. AWS Lambda: архітектура, triggers та lifecycle
3. Serverless-архітектурні патерни та event-driven системи
4. Azure Functions та Google Cloud Functions
5. Обмеження та антипатерни Serverless

## Перелік умовних скорочень

Списком

- **FaaS** — Function as a Service — функції як послуга
- **BaaS** — Backend as a Service — бекенд як послуга
- **SaaS** — Software as a Service
- **IaC** — Infrastructure as Code
- **EDA** — Event-Driven Architecture — архітектура, керована подіями
- **S3** — Amazon Simple Storage Service
- **SQS** — Amazon Simple Queue Service
- **SNS** — Amazon Simple Notification Service
- **IAM** — Identity and Access Management
- **VPC** — Virtual Private Cloud
- **API** — Application Programming Interface
- **HTTP** — HyperText Transfer Protocol
- **REST** — Representational State Transfer
- **DLQ** — Dead Letter Queue — черга мертвих листів
- **CI/CD** — Continuous Integration / Continuous Delivery

---

## Вступ

Serverless — не означає «без серверів». Сервери існують, але ви про них не думаєте. Serverless — це найвищий рівень абстракції в хмарі: розробник пише тільки функцію (бізнес-логіку), а провайдер бере на себе все інше — від провізіонування сервера до масштабування та моніторингу. Це радикально змінює підхід до розробки: замість постійно запущених серверів — функції, що виконуються тільки при надходженні подій.

---

## 1. Концепція Serverless та FaaS

### 1.1 Визначення Serverless

**Serverless** — модель хмарних обчислень, за якої:

- Провайдер повністю управляє інфраструктурою (сервери, ОС, рантайм)
- Застосунок масштабується автоматично (включно з масштабуванням до нуля)
- **Оплата лише за фактичний час виконання коду**

Serverless включає два компоненти:

- **FaaS (Function as a Service)**: AWS Lambda, Azure Functions, GCF
- **BaaS (Backend as a Service)**: Firebase (Auth, DB, Hosting), Cognito, Auth0 — готові backend-сервіси через API

### 1.2 Порівняння моделей обчислень

| Характеристика           |       EC2        | Контейнери (ECS/EKS) |      Serverless (Lambda)       |
| ------------------------ | :--------------: | :------------------: | :----------------------------: |
| Управління сервером      |      Клієнт      |       Частково       |           Провайдер            |
| Автомасштабування        |   Manual / ASG   |       K8s HPA        |          Автоматично           |
| Мінімум idle-вартості    | EC2 running cost |        1+ Pod        |       $0 (масштаб до 0)        |
| Початковий час відповіді |      Швидко      |        Швидко        | Cold start: десятки мс–секунди |
| Максимум виконання       |    Необмежено    |      Необмежено      |         15 хв (Lambda)         |
| Стан (state)             |  Full stateful   |  Stateful/Stateless  |           Stateless            |

### 1.3 Коли обирати Serverless

**Ідеально для Serverless:**

- Нерегулярне навантаження (переодичні задачі, batch-процеси)
- Event-driven обробка (S3 trigger, SQS consumer, API events)
- Мікроcервіси з коротким часом виконання (< 15 хв)
- Прототипи та MVP (нульова вартість при відсутності трафіку)
- Хмарні автоматизації та cron-jobs

**Не підходить для Serverless:**

- Тривалі обчислення (> 15 хвилин для Lambda)
- Stateful-застосунки з постійною пам'яттю
- Системи з мікросекундними вимогами до затримки (через cold start)
- Постійне висококонкурентне навантаження (дорожче EC2)

---

## 2. AWS Lambda

### 2.1 Архітектура AWS Lambda

**AWS Lambda** — FaaS-сервіс AWS, запущений у 2014 році. Lambda-функція:

- Виконується в ізольованому контейнері (Firecracker MicroVM)
- Підтримує: Python, Node.js, Java, Go, Ruby, .NET, кастомний рантайм
- Максимальний час виконання: **15 хвилин**
- RAM: від 128 МБ до 10 240 МБ (CPU пропорційний RAM)
- Тимчасове сховище: /tmp до 10 ГБ

### 2.2 Lambda Triggers (Джерела подій)

Lambda може бути запущена десятками тригерів:

| Тригер                         | Опис                           | Паттерн     |
| ------------------------------ | ------------------------------ | ----------- |
| **API Gateway / Function URL** | HTTP-запит → Lambda            | Синхронний  |
| **S3**                         | Upload/Delete об'єкту → Lambda | Асинхронний |
| **SQS**                        | Повідомлення у черзі → Lambda  | Polling     |
| **EventBridge**                | Scheduled cron або event rule  | Асинхронний |
| **DynamoDB Streams**           | Зміна у таблиці → Lambda       | Streaming   |
| **SNS**                        | Сповіщення → Lambda            | Асинхронний |
| **Kinesis**                    | Потіковий запис → Lambda       | Streaming   |
| **Step Functions**             | Крок у state machine           | Синхронний  |

### 2.3 Lambda: приклад функції

```python
import json
import boto3

# S3 client ініціалізується за межами handler для reuse між інвокаціями
s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Тригер: S3 PutObject
    Обробляє завантажений JSON-файл та зберігає результат
    """
    # Отримати параметри з event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    # Зчитати файл з S3
    response = s3.get_object(Bucket=bucket, Key=key)
    data = json.loads(response['Body'].read())

    # Обробка
    processed = {
        'total': sum(item['amount'] for item in data['orders']),
        'count': len(data['orders'])
    }

    # Записати результат в S3
    s3.put_object(
        Bucket=bucket,
        Key=f"processed/{key}",
        Body=json.dumps(processed)
    )

    return {'statusCode': 200, 'body': json.dumps(processed)}
```

### 2.4 Cold Start та проблема латентності

**Cold Start (Холодний старт)** — затримка при першому виклику Lambda-функції (або після тривалого простою), що пов'язана з ініціалізацією середовища виконання:

```
Перший запит (Cold Start):
  Container Init (50–500ms) + Runtime Init (50–200ms) + Handler Init + Handler Exec

Наступні запити (Warm):
  Handler Exec (мілісекунди)
```

**Стратегії мінімізації Cold Start:**

- **Provisioned Concurrency**: AWS заздалегідь ініціалізує N екземплярів lambda (без cold start, але платно)
- **SnapStart** (для Java): знімок ініціалізованого стану → відновлення замість ініціалізації
- Уникнення важких ініціалізацій у handler (ініціалізуйте clients поза handler)
- Вибір легших рантаймів (Python, Node.js vs Java)

### 2.5 Lambda Layers та Environment Variables

**Lambda Layers:**
Спільні залежності (бібліотеки, конфігурації) між кількома Lambda-функціями у вигляді шарів. До 5 layers на функцію.

**Environment Variables:**
Конфігурація через env змінні; чутливі значення — через AWS Secrets Manager або SSM Parameter Store із шифруванням KMS.

---

## 3. Serverless-архітектурні патерни

### 3.1 Serverless API (API Gateway + Lambda)

```
Client → API Gateway → Lambda (auth) → Lambda (business logic) → DynamoDB
                           │
                           └── JWT validation, rate limiting (API GW)
```

Повністю serverless REST API: нульова вартість при відсутності трафіку, масштабується до мільйонів запитів/сек.

### 3.2 Event-Driven Processing

```
S3: new file uploaded
  → Lambda: parse CSV → SQS: individual records
    → Lambda consumers (concurrent): validate + transform
      → DynamoDB: write results
        → DynamoDB Streams → Lambda: send notifications (SNS → Email/SMS)
```

### 3.3 AWS Step Functions — оркестрація Lambda

**AWS Step Functions** — візуальний сервіс для побудови state machines з Lambda-функцій:

```json
{
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:ValidateOrderFunction",
      "Next": "CheckInventory"
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:CheckInventoryFunction",
      "Catch": [{"ErrorEquals": ["OutOfStock"], "Next": "NotifyUser"}],
      "Next": "ProcessPayment"
    }
    ...
  }
}
```

Вирішує проблему координації між кількома Lambda без складної логіки в коді.

---

## 4. Azure Functions та Google Cloud Functions

### 4.1 Azure Functions

**Azure Functions** — FaaS від Microsoft. Підтримує: C#, JavaScript, Python, Java, PowerShell, TypeScript.

**Azure Durable Functions** — розширення для stateful orchestration (аналог Step Functions):

- **Function Chaining**: sequential виклик функцій
- **Fan-out/Fan-in**: паралельний виклик + збір результатів
- **Human Interaction**: очікування підтвердження від людини

**Hosting Plans:**

- Consumption: оплата за виконання; масштабування до 0 (аналог Lambda)
- Premium: Provisioned instances; VNet integration; уникнення cold start
- Dedicated (App Service): запуск на існуючому App Service Plan

### 4.2 Google Cloud Functions та Cloud Run

**Google Cloud Functions (2nd gen):**

- Базується на Cloud Run (контейнер) + підтримує event triggers
- 1-gen: простіший, обмежений; 2-gen: потужніший, аяближений до Cloud Run

**Google Cloud Run:**
Хоча технічно не FaaS, Cloud Run дозволяє запускати **stateless Docker-контейнер** з масштабуванням до нуля:

- Більш гнучкий за Lambda (будь-яка мова, будь-яка бібліотека в контейнері)
- Поєднує переваги PaaS (serverless) та IaaS (контейнер)

---

## 5. Обмеження та антипатерни Serverless

### 5.1 Відомі обмеження

| Обмеження          |   AWS Lambda   | Рішення                            |
| ------------------ | :------------: | ---------------------------------- |
| Макс час виконання |     15 хв      | Step Functions, EC2 Batch          |
| Payload size       |  6 МБ (sync)   | S3 для великих даних               |
| Concurrency limit  | 1000 (default) | Request limit increase             |
| Cold start         |   50–500 мс    | Provisioned Concurrency, SnapStart |
| Stateless          |       —        | DynamoDB, ElastiCache, EFS         |
| Vendor lock-in     |     Висока     | OpenFaaS, Knative (K8s)            |

### 5.2 Антипатерни Serverless

**Lambda calling Lambda (синхронно):**

```
Lambda A → (sync invoke) → Lambda B → Lambda C
```

Проблема: при помилці в C — timeout у B, що спричиняє timeout у A. Рішення: асинхронна комунікація через SQS або Step Functions.

**Монолітна Lambda (Lambdalith):**
Одна Lambda-функція, що містить весь backend-код. Втрачаються переваги FaaS (незалежне масштабування частин). Рішення: декомпозиція на менші функції за відповідальністю.

---

## Висновки

1. **Serverless/FaaS** є найвищим рівнем абстракції для обчислень. Модель «плати лише за виконання» та автоматичне масштабування до нуля роблять її ідеальною для event-driven та нерегулярних навантажень.

2. **AWS Lambda** підтримує десятки тригерів і є ключовим сервісом для побудови event-driven архітектур в AWS. Правильне розуміння lifecycle (cold start, warm) є критичним для продуктивності.

3. **AWS Step Functions** вирішує проблему координації між Lambda-функціями без складного коду, перетворюючи бізнес-процес на декларативну state machine.

4. **Cold Start** є головним обмеженням FaaS для latency-sensitive застосунків. Provisioned Concurrency та SnapStart є основними рішеннями.

5. **Cloud Run (Google)** та **Azure Container Apps** пропонують serverless-модель для контейнерів, що усуває обмеження Lambda (час виконання, обсяг payload, залежності).

---

## Джерела

1. AWS Documentation. (2024). _AWS Lambda Developer Guide_. https://docs.aws.amazon.com/lambda/
2. AWS Documentation. (2024). _AWS Step Functions Developer Guide_. https://docs.aws.amazon.com/step-functions/
3. Microsoft. (2024). _Azure Functions Documentation_. https://learn.microsoft.com/en-us/azure/azure-functions/
4. Google Cloud. (2024). _Cloud Run Documentation_. https://cloud.google.com/run/docs
5. Roberts, M. (2018). _Serverless Architectures_. Martin Fowler's Blog. https://martinfowler.com/articles/serverless.html
6. Sbarski, P. (2017). _Serverless Architectures on AWS_. Manning.

---

## Запитання для самоперевірки

1. Що означає «serverless»? Чи існують реально «сервери» у Serverless архітектурі?
2. Чим FaaS відрізняється від BaaS? Наведіть приклади обох.
3. Порівняйте EC2, ECS та Lambda за критеріями управління, масштабування та вартості простою.
4. Що таке Cold Start у Lambda? Які чинники збільшують його тривалість?
5. Назвіть 5 AWS-сервісів, що можуть тригерити Lambda-функцію. Опишіть один з них.
6. Що таке Provisioned Concurrency? Яку проблему вона вирішує і скільки коштує?
7. Що таке AWS Step Functions? Чому варто використовувати Step Functions замість виклику Lambda з Lambda?
8. Поясніть антипатерн «Lambda calling Lambda synchronously». Як його виправити?
9. Чим Google Cloud Run відрізняється від GCF? Яку перевагу дає використання контейнера замість FaaS-функції?
10. Для яких навантажень Serverless **не** є оптимальним вибором? Чому?
