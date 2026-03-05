# Лабораторна робота №14 (2 години)

**Тема:** Налаштування безпеки та контролю доступу у хмарному середовищі.

Налаштування ролей та політик IAM; реалізація принципу мінімальних привілеїв; налаштування шифрування даних; конфігурація аудиту доступу; сканування вразливостей хмарних ресурсів.

**Мета:** Набути практичні навички налаштування безпечного хмарного середовища: управління ідентичностями та доступом, шифрування даних та аудиту всіх дій у хмарному акаунті.

**Технологічний стек:**

- **AWS IAM** — управління ідентичностями та доступом
- **AWS KMS** — сервіс управління ключами шифрування
- **AWS CloudTrail** — сервіс аудиту та логування подій
- **AWS Config** — перевірка відповідності конфігурацій
- **AWS CLI** — для автоматизації налаштувань

---

## Завдання

1. Створити IAM-групи та ролі з принципом мінімальних привілеїв
2. Написати та прикріпити кастомну IAM-політику
3. Налаштувати CloudTrail для аудиту всіх дій в акаунті
4. Увімкнути шифрування S3-кошика через KMS
5. Перевірити дотримання принципу PoLP через аналіз Access Advisor
6. Дослідити реальний CloudTrail-лог після виконання операцій

---

## Хід виконання роботи

### Крок 1. Структура IAM — групи та ролі

**Створення IAM-груп:**

```bash
# Група розробників — читання + деплой
aws iam create-group --group-name Developers

# Група адмінів БД — доступ тільки до RDS
aws iam create-group --group-name DBAdmins

# Група аудиторів — лише перегляд
aws iam create-group --group-name Auditors
```

**Прикріплення AWS-managed policies:**

```bash
aws iam attach-group-policy \
  --group-name Auditors \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

aws iam attach-group-policy \
  --group-name Developers \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
```

### Крок 2. Кастомна IAM-політика (принцип мінімальних привілеїв)

Створіть файл `dev-policy.json` — лише необхідні дозволи для розробника:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadS3LabBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::lab14-dev-bucket",
        "arn:aws:s3:::lab14-dev-bucket/*"
      ]
    },
    {
      "Sid": "AllowWriteS3LabBucket",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::lab14-dev-bucket/*"
    },
    {
      "Sid": "AllowEC2ReadOnly",
      "Effect": "Allow",
      "Action": ["ec2:Describe*"],
      "Resource": "*"
    },
    {
      "Sid": "DenyProductionBucket",
      "Effect": "Deny",
      "Action": "*",
      "Resource": [
        "arn:aws:s3:::production-bucket",
        "arn:aws:s3:::production-bucket/*"
      ]
    }
  ]
}
```

```bash
# Створення кастомної політики
aws iam create-policy \
  --policy-name DeveloperMinimalPolicy \
  --policy-document file://dev-policy.json \
  --description "Minimal privileges for developers"

# Прикріплення до групи
aws iam attach-group-policy \
  --group-name Developers \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/DeveloperMinimalPolicy
```

### Крок 3. Перевірка Access Advisor

1. IAM Console → Users → ваш IAM-користувач
2. Вкладка **Access Advisor**
3. Перевірте список сервісів:
   - **Last accessed** — коли останній раз використовувався сервіс
   - Сервіси, що ніколи не використовувались — кандидати на видалення привілеїв
4. Порівняйте надані права з реально використаними

> **Принцип PoLP:** якщо сервіс не використовується — прибираємо доступ.

### Крок 4. Налаштування CloudTrail

**Через консоль:**

1. AWS Console → **CloudTrail** → **Trails** → **Create trail**
2. **Trail name:** `lab14-audit-trail`
3. **Storage location:** Create new S3 bucket → `lab14-cloudtrail-logs-<account-id>`
4. **Log file SSE-KMS encryption:** Enabled → Create new KMS key: `lab14-trail-key`
5. **CloudWatch Logs:** Enabled → Create new log group: `/cloudtrail/lab14`
6. **Event type:** Management events → All (Read & Write)
7. Натисніть **Create trail**

**Перевірка через CLI:**

```bash
# Список trails
aws cloudtrail describe-trails

# Перегляд останніх 10 подій (без створення Trail)
aws cloudtrail lookup-events \
  --max-results 10 \
  --query 'Events[*].[EventTime, EventName, Username]' \
  --output table
```

### Крок 5. Генерація та аналіз аудит-логів

Виконайте кілька операцій від імені IAM-користувача:

```bash
# Від імені IAM-user (налаштуйте профіль)
aws configure --profile dev-user
# ... введіть Access Key dev-user

# Виконайте дії
aws s3 ls --profile dev-user
aws ec2 describe-instances --profile dev-user --region eu-central-1
aws iam list-users --profile dev-user   # Очікуємо AccessDenied
```

Потім перегляньте CloudTrail:

```bash
# Пошук подій конкретного користувача
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=dev-user \
  --max-results 20 \
  --query 'Events[*].{Time:EventTime, Event:EventName, Source:EventSource}' \
  --output table
```

У CloudWatch Log Insights (`/cloudtrail/lab14`):

```sql
fields eventTime, eventName, userIdentity.userName, errorCode
| filter userIdentity.userName = "dev-user"
| sort eventTime desc
| limit 20
```

### Крок 6. Шифрування S3 через KMS

```bash
# Створення S3-кошика
aws s3 mb s3://lab14-encrypted-bucket --region eu-central-1

# Отримання ARN KMS-ключа (створеного для CloudTrail або нового)
aws kms list-keys --query 'Keys[0].KeyArn'

# Увімкнення SSE-KMS для кошика
aws s3api put-bucket-encryption \
  --bucket lab14-encrypted-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:eu-central-1:<ACCOUNT_ID>:key/<KEY_ID>"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Перевірка
aws s3api get-bucket-encryption --bucket lab14-encrypted-bucket

# Завантаження файлу — автоматично зашифрується
echo "Secret data" > secret.txt
aws s3 cp secret.txt s3://lab14-encrypted-bucket/

# Перевірка метаданих об'єкта (ServerSideEncryption)
aws s3api head-object --bucket lab14-encrypted-bucket --key secret.txt
```

---

## Контрольні запитання

1. Що таке IAM Policy? Поясніть структуру JSON-документу: Version, Statement, Effect, Action, Resource.
2. Що таке принцип мінімальних привілеїв (PoLP)? Наведіть конкретний приклад його порушення та правильного застосування.
3. Чим відрізняється IAM Role від IAM User? Коли слід використовувати Role замість User?
4. Що таке AWS CloudTrail? Яку інформацію він фіксує і чому він важливий для розслідування інцидентів?
5. Що таке SSE-S3 та SSE-KMS? Яка ключова відмінність між ними з точки зору контролю доступу до ключів?
6. Що таке умовний доступ (Condition) у IAM-політиках? Наведіть приклад умови, що обмежує доступ за IP-адресою.

---

## Вимоги до звіту

1. Вміст файлу `dev-policy.json` з поясненням кожного Statement
2. Скриншот вкладки **Access Advisor** для вашого IAM-користувача
3. Вивід `aws cloudtrail lookup-events` з 5+ подіями вашого dev-user
4. Скриншот або вивід підтвердження SSE-KMS для S3-кошика (`head-object`)
5. Скриншот CloudWatch Logs Insights із запитом та результатами
6. Відповіді на контрольні запитання у файлі `lab14.md`
7. Посилання на GitHub або файли матеріалів надіслати в Classroom
