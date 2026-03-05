# Лабораторна робота №18 (2 години)

**Тема:** Аналіз та оптимізація хмарних витрат.

Аналіз поточних витрат за допомогою AWS Cost Explorer або Azure Cost Management; виявлення невикористаних ресурсів; налаштування бюджетів та сповіщень; розрахунок TCO та порівняння варіантів резервування ресурсів.

**Мета:** Набути практичні навички аналізу хмарних витрат, виявлення неефективного використання ресурсів та застосування FinOps-практик для оптимізації хмарних видатків.

**Технологічний стек:**

- **AWS Cost Explorer** — аналіз витрат (безкоштовно у Free Tier акаунті)
- **AWS Budgets** — налаштування бюджетів та алертів (2 бюджети безкоштовно)
- **AWS Trusted Advisor** — рекомендації щодо оптимізації
- **Infracost** — оцінка вартості Terraform-конфігурацій (open-source)

---

## Завдання

1. Дослідити інструменти аналізу витрат у хмарній консолі
2. Налаштувати бюджет та алерт при наближенні до ліміту
3. Використати AWS Billing Dashboard та Cost Explorer
4. Порівняти вартість On-Demand vs. Reserved Instances (розрахунок)
5. Ознайомитись з методологією FinOps та інструментом Infracost
6. Підготувати та підсумувати витрати за всі лабораторні роботи

---

## Хід виконання роботи

### Крок 1. AWS Billing Dashboard

1. AWS Console → натисніть на ім'я акаунту → **Billing and Cost Management**
2. Ознайомтеся з розділами:
   - **Bills** — деталізований рахунок поточного місяця
   - **Free Tier** — поточне використання безкоштовних лімітів
   - **Cost Explorer** — інтерактивний аналіз витрат
   - **Budgets** — управління бюджетами

**Free Tier Usage:**

1. Billing → **Free Tier**
2. Перегляньте стовпці:
   - **Service** — назва сервісу
   - **Month-to-date usage** — поточне використання
   - **Free Tier Limit** — ліміт
   - **Forecasted usage** — прогноз до кінця місяця
3. Знайдіть сервіси, де прогноз > 80% від Free Tier Limit

### Крок 2. Налаштування Budget (бюджет)

1. Billing → **Budgets** → **Create budget**
2. **Budget type:** Cost budget
3. **Period:** Monthly
4. **Budget amount:** $5 (або ваш реальний ліміт)
5. **Configure thresholds:**
   - Threshold 1: **Actual** cost > **80%** → Email notification
   - Threshold 2: **Forecasted** cost > **100%** → Email notification
6. **Email recipients:** ваша email-адреса
7. Натисніть **Create budget**

**Через AWS CLI:**

```bash
# Створення бюджету $10/місяць
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "lab18-monthly-budget",
    "BudgetLimit": {"Amount": "10.00", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "your@email.com"}]
  }]'
```

### Крок 3. AWS Cost Explorer — аналіз витрат

1. Billing → **Cost Explorer** → **Launch Cost Explorer**
2. Дослідіть:

**За сервісами (останні 30 днів):**

- Group by: **Service**
- Знайдіть топ-3 сервіси за витратами

**За часом:**

- Granularity: **Daily**
- Для виявлення пікового навантаження

**Сучасний фільтр:**

```bash
# Витрати за поточний місяць через CLI
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "BlendedCost" "UsageQuantity" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[*].[Keys[0],Metrics.BlendedCost.Amount]' \
  --output table
```

### Крок 4. Порівняння моделей ціноутворення

**Задача:** Компанія потребує EC2 t3.medium (2 vCPU, 4 GB RAM) у регіоні eu-central-1 протягом 1 року.

Заповніть таблицю на основі AWS Pricing Calculator ([https://calculator.aws](https://calculator.aws)):

| Модель                          | Опис                                 | Місячна вартість | Річна вартість | Економія |
| ------------------------------- | ------------------------------------ | ---------------- | -------------- | -------- |
| **On-Demand**                   | Оплата погодинно, без зобов'язань    | ~$35             | ~$420          | —        |
| **Reserved (1yr, No Upfront)**  | 1 рік, без передоплати               | ~$22             | ~$264          | ~37%     |
| **Reserved (1yr, All Upfront)** | 1 рік, повна передоплата             | ~$20             | ~$240          | ~43%     |
| **Reserved (3yr, All Upfront)** | 3 роки, повна передоплата            | ~$14             | ~$168          | ~60%     |
| **Spot Instance**               | Надлишкові потужності, переривається | ~$10             | ~$120          | ~71%     |

> **Висновок:** Reserved Instances вигідні при стабільному навантаженні на 1–3 роки. Spot — лише для переривуваних задач (batch, ML-тренування).

**Дослідіть Savings Plans:**

```bash
# Рекомендації щодо Savings Plans на основі вашого вжитку
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --query 'SavingsPlansPurchaseRecommendation.{
    EstimatedMonthlySavings:SavingsPlansPurchaseRecommendationSummary.EstimatedMonthlySavingsAmount,
    RecommendedHourlyCommitment:SavingsPlansPurchaseRecommendationSummary.HourlyCommitmentToPurchase
  }' \
  --output table
```

### Крок 5. Infracost — оцінка вартості IaC

Infracost — інструмент для оцінки вартості Terraform-конфігурацій до їхнього застосування.

```bash
# Встановлення
brew install infracost   # macOS
# або:
curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

# Авторизація (безкоштовно)
infracost auth login

# Оцінка вартості Terraform-конфігурації з Лаб. №8
cd ~/lab08-terraform
infracost breakdown --path .
```

Приклад виводу:

```
Name                           Monthly Qty  Unit       Monthly Cost
aws_instance.lab_vm
  Instance usage (Linux/UNIX)          730  hours           $8.47
aws_s3_bucket.lab_bucket
  Standard storage                       0  GB months        $0.00

OVERALL TOTAL                                               $8.47
```

```bash
# Порівняти різні конфігурації (якщо змінили instance type)
infracost diff --path . --compare-to main
```

### Крок 6. Аудит невикористаних ресурсів

**AWS Trusted Advisor:**

1. AWS Console → **Trusted Advisor** (лише деякі перевірки безкоштовні)
2. Категорія **Cost Optimization:**
   - Low Utilization Amazon EC2 Instances
   - Unassociated Elastic IP Addresses
   - Idle Load Balancers

**Через CLI — пошук неприєднаних Elastic IP:**

```bash
# Elastic IP, що не прикріплені до жодного ресурсу (і за них стягується плата!)
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].[PublicIp, AllocationId]' \
  --output table
```

**Зупинені, але існуючі EC2 (зберігаються стоп-тагів):**

```bash
aws ec2 describe-instances \
  --filters Name=instance-state-name,Values=stopped \
  --query 'Reservations[*].Instances[*].[InstanceId, InstanceType, Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

### Крок 7. Підсумковий звіт витрат по лабораторних роботах

Заповніть таблицю на основі AWS Billing та Free Tier звіту:

| Лабораторна | Основні ресурси           | Потрапило під Free Tier? | Орієнтовна вартість |
| ----------- | ------------------------- | ------------------------ | ------------------- |
| Лаб. 1      | IAM                       | ✅ Так                   | $0                  |
| Лаб. 2      | CLI (немає ресурсів)      | ✅ Так                   | $0                  |
| Лаб. 3      | VPC, Security Groups      | ✅ Так                   | $0                  |
| Лаб. 4      | EC2 t2.micro              | ✅ 750 год/міс           | $0                  |
| Лаб. 5      | S3 (5 GB), EBS (30 GB)    | ✅ Так                   | $0                  |
| Лаб. 6      | Docker Hub (公開)         | ✅ Так                   | $0                  |
| Лаб. 7      | Minikube (локально)       | ✅ Так                   | $0                  |
| Лаб. 8      | Terraform + EC2 (destroy) | ✅ Якщо destroy          | $0                  |
| Лаб. 9      | CloudWatch (10 метрик)    | ✅ 10 безкоштовно        | $0                  |
| **РАЗОМ**   |                           |                          | **~$0**             |

---

## Контрольні запитання

1. Що таке FinOps? Назвіть три основних принципи цієї методології.
2. Поясніть різницю між On-Demand, Reserved Instances та Spot Instances в AWS. Для якого типу навантаження підходить кожна модель?
3. Що таке TCO (Total Cost of Ownership)? Які витрати входять до TCO хмарного рішення порівняно з on-premise?
4. Що таке «хмарний spreadшит» (cloud sprawl)? Як автоматизація та IaC допомагають запобігти непотрібним витратам?
5. Що таке Right-sizing у контексті оптимізації хмарних витрат? Як AWS Compute Optimizer допомагає у цьому?
6. Яка різниця між бюджетом (Budget) та Cost Allocation Tag у AWS? Як теги допомагають розподілити витрати між відділами або проєктами?

---

## Вимоги до звіту

1. Скриншот AWS Free Tier Usage з поточним використанням
2. Скриншот налаштованого Budget з порогами та email-сповіщеннями
3. Скриншот Cost Explorer (витрати за сервісами за останні 30 днів)
4. Заповнена таблиця порівняння On-Demand / Reserved / Spot (зі значеннями з AWS Calculator)
5. Вивід `infracost breakdown` або скриншот результату
6. Заповнена підсумкова таблиця витрат по всіх лабораторних
7. Відповіді на контрольні запитання у файлі `lab18.md`
8. Посилання на GitHub або матеріали надіслати в Classroom
