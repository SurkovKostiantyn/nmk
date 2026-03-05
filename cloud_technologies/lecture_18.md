# Лекція №18 (2 години). Оптимізація витрат та майбутнє хмарних технологій

## План лекції

1. Концепція FinOps та хмарна економіка
2. Інструменти управління та оптимізації хмарних витрат
3. Практики оптимізації витрат: Compute, Storage, Networking
4. Тренди тa майбутнє хмарних технологій
5. Стратегії побудови кар'єри в хмарній галузі

## Перелік умовних скорочень

Списком

- **FinOps** — Financial Operations — фінансові операції (управління хмарними витратами)
- **TCO** — Total Cost of Ownership — сукупна вартість володіння
- **ROI** — Return on Investment — повернення інвестицій
- **COGS** — Cost of Goods Sold — собівартість реалізованої продукції
- **RI** — Reserved Instance — зарезервований екземпляр
- **SP** — Savings Plan — план заощаджень
- **EC2** — Elastic Compute Cloud — обчислення AWS
- **S3** — Simple Storage Service — об'єктне сховище AWS
- **WAF** — Well-Architected Framework — добре спроєктована архітектура
- **AI** — Artificial Intelligence — штучний інтелект
- **ML** — Machine Learning — машинне навчання
- **LLM** — Large Language Model — велика мовна модель
- **IoT** — Internet of Things — Інтернет речей
- **KPI** — Key Performance Indicator — ключовий показник ефективності
- **CNCF** — Cloud Native Computing Foundation

---

## Вступ

Однією з найчастіших помилок при переході у хмару є думка, що хмара автоматично дешевша за on-premise. Насправді, без цілеспрямованого управління витратами, хмара може обходитись значно дорожче, ніж традиційна інфраструктура. **FinOps** — культура та набір практик, що дозволяє організаціям отримати максимальну бізнес-цінність від хмарних витрат при збереженні фінансового контролю.

Паралельно, хмарні технологи продовжують стрімко розвиватись — від квантових обчислень до Edge Computing та нових AI-парадигм, що визначатимуть наступне десятиліття індустрії.

---

## 1. Концепція FinOps та хмарна економіка

### 1.1 Що таке FinOps

**FinOps (Cloud Financial Operations)** — операційна модель, що об'єднує фінансові, технічні та бізнес-команди для спільного управління хмарними витратами з метою максимізувати цінність при оптимізації вартості.

**FinOps Foundation** визначає FinOps-цикл:

```
┌──────────────────────────────────────────────────────────────┐
│                  FinOps Цикл (Inform → Optimize → Operate)  │
│                                                               │
│  Inform ──►  Бачимо, скільки витрачаємо і на що             │
│     │        (тегування, dashboards, Cost Explorer)          │
│     │                                                         │
│  Optimize ► Знаходимо і реалізуємо можливості економії      │
│     │        (Rightsizing, Reserved, Spot, waste cleanup)    │
│     │                                                         │
│  Operate ►  Встановлюємо процеси для постійної оптимізації   │
│             (budgets, alerts, governance, team culture)       │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Чому хмара буває дорогою

**Топ-5 причин неконтрольованих хмарних витрат:**

1. **Over-provisioning**: сервери t3.2xlarge там, де достатньо t3.medium
2. **Zombie Resources**: зупинені EC2-інстанси (EBS продовжує тарифікуватись), невикористані Elastic IP, старі snapshots
3. **Відсутність Lifecycle Policies**: S3-об'єкти 2015 року у Standard tier замість Glacier
4. **NAT Gateway egress**: надмірний мережевий трафік через NAT ($0.045/ГБ × терабайти)
5. **Відсутність Reserved Instances**: оплата On-Demand за стабільні навантаження

### 1.3 Ключові хмарні cost-моделі

**Unit Economics (Одинична економіка):**
Вимірювання вартості на одиницю бізнес-метрики:

- Вартість на 1 транзакцію
- Вартість на 1 активного користувача
- Вартість на 1 GB оброблених даних

Мета: знизити Unit Cost при зростанні, а не просто знизити абсолютні витрати.

---

## 2. Інструменти управління хмарними витратами

### 2.1 AWS Cost Explorer та Billing Tools

**AWS Cost Explorer:**

- Візуалізація витрат за послугами, регіонами, тегами, акаунтами
- **Savings Plans Recommendations**: AWS рекомендує оптимальний Savings Plans на основі використання
- **RI Recommendations**: рекомендації щодо Reserved Instances
- Прогнозування витрат на 12 місяців

**AWS Cost and Usage Report (CUR):**
Найдетальніший звіт про витрати (кожний ресурс, кожна година) → завантажується в S3 → аналіз у Athena або Redshift.

**AWS Budgets:**

- Встановлення бюджетів на послуги, теги, проєкти
- Алерти при досягненні 50%, 80%, 100% бюджету
- **Budget Actions**: автоматичне застосування IAM-політики або SCP при перевищенні бюджету

**AWS Trusted Advisor:**

- Щоденний аналіз хмарного середовища за 5 категоріями: Cost Optimization, Security, Performance, Fault Tolerance, Service Limits
- **Cost Optimization рекомендації**: Low utilization EC2, idle RDS, unused Elastic IP тощо

### 2.2 Тегування ресурсів (Resource Tagging)

Тегування — фундамент FinOps: без тегів неможливо зрозуміти, хто і на що витрачає.

**Стратегія тегування:**

```
Обов'язкові теги:
  Environment: prod | staging | dev
  Project:     my-saas-app
  Team:        backend | data | platform
  CostCenter:  CC-12345
  Owner:       john.doe@company.com

Опціональні:
  Terraform:   true (ресурси IaC)
  AutoShutdown: true (для dev-середовищ)
```

**AWS Tag Policies** (Organizations): обов'язкове застосування тегів на рівні організації.

**Cost Allocation Tags:** увімкнуті теги стають вимірами у Cost Explorer → розподіл витрат між командами.

### 2.3 Azure Cost Management та GCP Cloud Billing

**Azure Cost Management + Billing:**

- **Cost Analysis**: аналіз витрат за підписками, групами ресурсів, тегами
- **Budgets**: аналогічно AWS Budgets
- **Azure Advisor**: рекомендації оптимізації (cost, security, performance)

**GCP Cloud Billing:**

- **Billing reports**: візуалізація витрат
- **Labels**: аналог тегів; обов'язкові через Organization Policies
- **Cost recommender**: рекомендації rightsizing та committed use discounts
- **Budget Alerts**: сповіщення при перевищенні бюджету

### 2.4 Multi-Cloud FinOps інструменти

| Інструмент           | Тип         | Особливості                         |
| -------------------- | ----------- | ----------------------------------- |
| CloudHealth (VMware) | SaaS        | Multi-cloud, governance             |
| Apptio Cloudability  | SaaS        | Unit economics, showback/chargeback |
| Spot.io (NetApp)     | SaaS        | Автоматична оптимізація Spot        |
| CAST AI              | SaaS        | K8s cost optimization               |
| OpenCost             | Open-source | K8s cost allocation                 |

---

## 3. Практики оптимізації витрат

### 3.1 Compute Optimization

**Rightsizing (Правильне визначення розміру):**
Найпоширеніша проблема: over-provisioned EC2-інстанси (CPU 10%, RAM 20%).

1. AWS Compute Optimizer: аналізує CloudWatch метрики та рекомендує оптимальний тип
2. Зміна t3.2xlarge (8 vCPU, 32 GB) на t3.medium (2 vCPU, 4 GB) → -75% вартості

**Purchasing Model Optimization:**

```
Поточний стан: 100% On-Demand
Оптимально:
  60% → Compute Savings Plans (стабільна база)
  20% → Reserved Instances (конкретні сервіси)
  20% → On-Demand / Spot (піки та batch)
```

Потенційна економія: **40–65%** від On-Demand.

**Spot Instances для переривних навантажень:**

- CI/CD workers: 90% знижка (якщо Spot зупинено → re-queue job)
- ML training: Checkpointing + Spot = дешеве тренування
- Batch processing: EMR + Spot Worker Nodes

**AWS Graviton переведення:**
ARM-інстанси Graviton 3 дешевші та ефективніші завдяки кращому ціна/продуктивність. Переведення `m6i` → `m7g` (Graviton 3) → ~20% економії за ту саму продуктивність.

### 3.2 Storage Optimization

**S3 Intelligent-Tiering:**
Для сховищ із непередбачуваним патерном доступу — автоматична міграція між класами:

- Об'єкти без доступу 30 днів → Infrequent Access (40% знижка)
- 90 днів → Archive Instant Access (68% знижка)
- 180 днів → Deep Archive (95% знижка)

**EBS: gp2 → gp3 міграція:**
gp3 дешевший за gp2 (~20%) при аналогічній або вищій продуктивності. Масова міграція всіх gp2-томів → швидка перемога.

**Cleanup Unused EBS:**
Snapshot retention policies, видалення orphan EBS (відключених від EC2):

```bash
# Знайти EBS томи, відключені від EC2
aws ec2 describe-volumes --filters Name=status,Values=available
```

### 3.3 Network Optimization

**Egress (Вихідний трафік)** — один із найдорожчих аспектів хмарних витрат ($0.08–0.09/ГБ за перший ТБ).

**Основні стратегії зниження egress:**

1. **CloudFront** — кеш CDN знижує egress від origin (S3, EC2) на 60–90%
2. **S3 Transfer Acceleration** для glобальних завантажень (замість прямого egress)
3. **VPC Endpoints** (S3, DynamoDB) — трафік залишається в мережі AWS (без NAT Gateway, безкоштовно)
4. **NAT Gateway оптимізація**: NAT Gateway → $0.045/ГБ + $0.045/ГБ egress. Для K8s → VPC Endpoint for ECR знижує трафік через NAT

### 3.4 Auto Shutdown для Non-Production

Dev та staging середовища мають бути зупинені у неробочі години:

```python
# Lambda (triggered by EventBridge Scheduler, щодня о 20:00)
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    # Знайти та зупинити dev EC2-інстанси
    instances = ec2.describe_instances(
        Filters=[{'Name': 'tag:Environment', 'Values': ['dev', 'staging']},
                 {'Name': 'instance-state-name', 'Values': ['running']}]
    )
    ids = [i['InstanceId'] for r in instances['Reservations']
           for i in r['Instances']]
    if ids:
        ec2.stop_instances(InstanceIds=ids)
        print(f"Stopped {len(ids)} dev instances")
```

Потенційна економія: 65% (16 год зупинки / 24 год × 100%).

---

## 4. Тренди та майбутнє хмарних технологій

### 4.1 Edge Computing

**Edge Computing** — переміщення обчислень ближче до джерела даних (до «краю» мережі):

**Драйвери:**

- IoT-пристрої (камери, датчики) генерують терабайти даних → відправка всього в хмару неприйнятна за вартістю та затримкою
- Real-time обробка: автономні автомобілі потребують рішень за < 1 мс

**AWS Greengrass:** запуск Lambda/контейнерів напряму на IoT-пристроях.
**AWS Wavelength:** зони AWS всередині телеком-мереж 5G (затримка < 10 мс для мобільних пристроїв).
**AWS Outposts:** стійки AWS-обладнання у датацентрі клієнта.

### 4.2 Quantum Computing у хмарі

**Amazon Braket:** доступ до квантових комп'ютерів IonQ, Rigetti, D-Wave через API:

- Поки: 50–2000 кубітів; висока частота помилок; обмежені задачі
- Застосування: оптимізація (фінансове portfólio, логістика), квантова хімія, кріптографія
- **2030+**: очікується quantum advantage для практичних задач

**Azure Quantum, IBM Quantum (доступний через IBM Cloud)** — аналогічні сервіси.

### 4.3 AI-Native Cloud

Хмарна інфраструктура переосмислюється навколо AI:

- **Спеціалізоване AI-обладнання**: AWS Trainium/Inferentia, Google TPU v5, Azure Maia — замінюють GPU для ML навантажень
- **AI-агенти**: автономні AI-системи, що управляють хмарною інфраструктурою (automated capacity planning, self-healing)
- **Generative AI як commodity**: LLM стають доступними через API як стандартний компонент застосунків

### 4.4 Platform Engineering та Internal Developer Platforms

**Platform Engineering** — нова дисципліна:

- Замість того щоб кожен розробник налаштовував K8s/Terraform — платформна команда будує **Internal Developer Platform (IDP)**
- IDP надає розробникам self-service: «Мені потрібен PostgreSQL для staging» → кілька кліків → готово
- Ключові інструменти: Backstage (Spotify), Port, Cortex

### 4.5 Cloud Sustainability

Хмарні провайдери ставлять амбітні цілі carbon neutrality:

- **AWS**: 100% renewable energy до 2025 (досягнуто у 2023)
- **Microsoft Azure**: Carbon Negative до 2030
- **Google Cloud**: 24/7 Carbon-free energy до 2030

**AWS Customer Carbon Footprint Tool:** звіт про вуглецевий слід ваших AWS-ресурсів.

---

## 5. Побудова кар'єри в хмарній галузі

### 5.1 Хмарні сертифікації

**AWS Certifications:**

| Рівень       | Назва                                                        | Для кого                       |
| ------------ | ------------------------------------------------------------ | ------------------------------ |
| Foundational | Cloud Practitioner (CLF-C02)                                 | Non-technical; загальні знання |
| Associate    | Solutions Architect (SAA-C03)                                | Архітектор хмарних рішень      |
| Associate    | Developer (DVA-C02)                                          | Розробник AWS-застосунків      |
| Associate    | SysOps Administrator                                         | DevOps/Operations              |
| Professional | Solutions Architect Pro                                      | Старший архітектор             |
| Professional | DevOps Engineer Pro                                          | Senior DevOps                  |
| Specialty    | Security / Machine Learning / Database / Advanced Networking | Вузькі спеціалісти             |

**Microsoft Azure:** AZ-900 (Fundamental) → AZ-104 (Administrator) → AZ-305 (Architect)

**Google Cloud:** Cloud Digital Leader → Associate Cloud Engineer → Professional Cloud Architect

### 5.2 Технологічний стек для хмарного інженера

**Cloud Engineer (2024–2025):**

- Shell/Linux Administration
- Python або Go
- Terraform (IaC)
- Docker + Kubernetes
- CI/CD (GitHub Actions або аналог)
- Один major cloud provider до рівня Associate сертифікату
- Основи мережевих протоколів (TCP/IP, DNS, HTTP/S)

**Cloud Architect (Senior):**

- Весь стек Cloud Engineer +
- Мульти-cloud досвід
- Software Architecture patterns (мікросервіси, DDD)
- FinOps та cost management
- Безпека (zero trust, IAM design)

### 5.3 Well-Architected Framework — базис хмарної освіти

**AWS Well-Architected Framework** — набір принципів та найкращих практик для проєктування надійних, безпечних, ефективних та економічних хмарних систем:

| Стовп                      | Ключові питання                             |
| -------------------------- | ------------------------------------------- |
| **Operational Excellence** | Як ми управляємо та вдосконалюємо операції? |
| **Security**               | Як захистити дані та системи?               |
| **Reliability**            | Як відновитись від відмов?                  |
| **Performance Efficiency** | Як ефективно використовувати ресурси?       |
| **Cost Optimization**      | Як управляти та знижувати витрати?          |
| **Sustainability**         | Як мінімізувати екологічний вплив?          |

**AWS Well-Architected Tool:** безкоштовний сервіс для оцінки хмарної архітектури за 6 стовпами.

---

## Висновки

1. **FinOps** — культура, що поєднує Engineering, Finance та Business для спільного управління хмарними витратами. Without FinOps, хмарні витрати часто виходять з-під контролю через over-provisioning, zombie resources та неоптимальні моделі оплати.

2. **Тегування** є фундаментом ФінОps — без правильних тегів неможливо розподілити витрати та виявити waste. Обов'язкове тегування та Cost Allocation Tags мають бути впроваджені з першого дня.

3. **Оптимізація витрат** охоплює compute (Rightsizing, Savings Plans, Spot, Graviton), storage (S3 Intelligent-Tiering, gp3 migration), networking (CDN, VPC Endpoints, NAT) та auto-shutdown для non-production.

4. **Майбутнє хмарних технологій** визначають Edge Computing (IoT, 5G), AI-Native Cloud (спеціалізоване AI-залізо, AI-агенти), Platform Engineering та sustainability. Хмара продовжує трансформуватись від IaaS до більш абстрактних, AI-driven платформ.

5. **Хмарна кар'єра** вимагає поєднання технічних навичок (Linux, Python, Terraform, K8s) з розумінням бізнес-контексту. Сертифікації (AWS SAA, CKA) підтверджують компетентність та відкривають нові можливості.

---

## Джерела

1. FinOps Foundation. (2024). _FinOps Framework_. https://www.finops.org/framework/
2. AWS Documentation. (2024). _AWS Cost Management User Guide_. https://docs.aws.amazon.com/cost-management/
3. AWS. (2022). _AWS Well-Architected Framework_. https://docs.aws.amazon.com/wellarchitected/
4. Storment, J. R., & Fuller, M. (2019). _Cloud FinOps_. O'Reilly Media.
5. Gartner. (2024). _Hype Cycle for Cloud Computing, 2024_.
6. Greenbaum, E. (2023). _Platform Engineering_. O'Reilly Media.
7. Google Cloud. (2024). _State of DevOps 2024_. https://cloud.google.com/devops/state-of-devops/

---

## Запитання для самоперевірки

1. Що таке FinOps? Опишіть три фази FinOps-циклу (Inform → Optimize → Operate).
2. Назвіть п'ять найпоширеніших причин неконтрольованих хмарних витрат.
3. Що таке Rightsizing? Який інструмент AWS допомагає виявити over-provisioned ресурси?
4. Поясніть оптимальну комбінацію моделей оплати EC2: Savings Plans, Reserved та Spot.
5. Що таке Resource Tagging? Чому він є основою FinOps?
6. Як S3 Intelligent-Tiering допомагає оптимізувати витрати на зберігання?
7. Що таке Edge Computing? Наведіть два конкретних сценарії, де він необхідний.
8. Що таке AWS Well-Architected Framework? Назвіть 6 стовпів та коротко опишіть кожен.
9. Який технологічний стек необхідний для позиції Cloud Engineer у 2024 році?
10. Які сертифікації є найважливішими для початку хмарної кар'єри? Поясніть порядок їх отримання.
