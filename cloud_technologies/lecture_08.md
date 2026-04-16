# Лекція №8 (2 години). Інфраструктура як код (IaC)

## План лекції

1. Концепція Infrastructure as Code та її значення
2. Інструменти IaC: Terraform, AWS CloudFormation, Pulumi
3. Terraform: архітектура, синтаксис HCL та основні команди
4. Управління станом та модульність у Terraform
5. Найкращі практики IaC та інтеграція з CI/CD

## Перелік умовних скорочень

Списком

- **IaC** — Infrastructure as Code — інфраструктура як код
- **HCL** — HashiCorp Configuration Language — мова конфігурації Terraform
- **CFN** — AWS CloudFormation — сервіс IaC від Amazon
- **ARM** — Azure Resource Manager — менеджер ресурсів Azure
- **JSON** — JavaScript Object Notation — формат обміну даними
- **YAML** — Yet Another Markup Language — формат конфігурації
- **VCS** — Version Control System — система контролю версій
- **CI/CD** — Continuous Integration / Continuous Delivery
- **IAM** — Identity and Access Management
- **S3** — Simple Storage Service (AWS)
- **DRY** — Don't Repeat Yourself — принцип уникнення дублювання
- **PR** — Pull Request — запит на злиття гілки у VCS
- **SDK** — Software Development Kit — набір інструментів розробника
- **API** — Application Programming Interface
- **SLA** — Service Level Agreement

---

## Вступ

Уявіть компанію, що розгортає нове production-середовище вручну: адміністратор входить у консоль AWS, клацає у десятках меню, створює VPC, підмережі, security groups, EC2-інстанси, налаштовує балансувальник — і все це займає кілька годин. Наступне середовище (staging, dev) він намагається зробити ідентичним першому — і це майже неможливо без помилок.

**IaC (Infrastructure as Code)** вирішує цю проблему: інфраструктура описується у текстових конфігураційних файлах, що зберігаються у системі контролю версій, рецензуються як звичайний код і автоматично застосовуються. Результат — відтворювані, версіоновані та автоматизовані середовища.

---

## 1. Концепція Infrastructure as Code

### 1.1 Визначення та переваги

**Infrastructure as Code (IaC)** — практика управління та провізіонування обчислювальної інфраструктури за допомогою машинозчитуваних конфігураційних файлів замість ручних операцій через консоль або CLI.

**Ключові переваги IaC:**

| Перевага            | Опис                                            | Приклад                                     |
| ------------------- | ----------------------------------------------- | ------------------------------------------- |
| **Відтворюваність** | Однаковий код → однакова інфраструктура         | Dev, staging, production ідентичні          |
| **Версіонування**   | Код в Git → повна історія змін                  | Можна відкотити до попередньої конфігурації |
| **Автоматизація**   | Інфраструктура деплоїться автоматично в CI/CD   | Нові середовища за хвилини, а не дні        |
| **Рецензування**    | Pull Request → перегляд колегами                | Запобігання помилкам у конфігурації         |
| **Документація**    | Код є документацією самої інфраструктури        | Нові члени команди розуміють систему з коду |
| **Тестування**      | Конфігурацію можна перевіряти (lint, validate)  | `terraform validate`, `cfn-lint`            |
| **Drifт-детекція**  | Виявлення ручних змін, що відхиляються від коду | `terraform plan` показує різниці            |

### 1.2 Підходи: Imperative vs Declarative

**Imperative (Процедурний) підхід:**
Описуємо **послідовність кроків** для досягнення бажаного стану.

```bash
# Bash-скрипт (imperative)
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24
aws ec2 run-instances --image-id ami-xxx --instance-type t3.medium
```

Проблема: важко управляти станом; при повторному запуску — дублювання ресурсів.

**Declarative (Декларативний) підхід:**
Описуємо **бажаний кінцевий стан**; інструмент сам визначає, що потрібно зробити.

```hcl
# Terraform (declarative)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

Інструмент порівнює поточний стан із бажаним і вносить лише необхідні зміни. **Terraform, CloudFormation, ARM** — декларативні.

### 1.3 Категорії IaC-інструментів

| Категорія           | Опис                     | Приклади                          |
| ------------------- | ------------------------ | --------------------------------- |
| **Провізіонування** | Створення інфраструктури | Terraform, CloudFormation, Pulumi |
| **Конфігурування**  | Налаштування ОС та ПЗ    | Ansible, Chef, Puppet, SaltStack  |
| **Immutable infra** | Заміна замість змін      | Packer (AMI), Docker              |

---

## 2. Огляд ключових IaC-інструментів

### 2.1 Terraform

**Terraform** (HashiCorp, 2014) — найпопулярніший мультихмарний IaC-інструмент.

**Ключові характеристики:**

- **Мультихмарний**: підтримує AWS, Azure, GCP, Kubernetes, GitHub та тисячі провайдерів через **Provider Plugin**
- **Декларативний**: описуємо бажаний стан у HCL (HashiCorp Configuration Language)
- **Управління станом**: зберігає поточний стан інфраструктури у `terraform.tfstate`
- **Планування**: `terraform plan` показує зміни до їхнього застосування
- **Open-source + Terraform Cloud**: безкоштовна CLI-версія та платна хмарна платформа

### 2.2 AWS CloudFormation

**AWS CloudFormation (CFN)** — рідний IaC-сервіс AWS.

**Характеристики:**

- Підтримує лише AWS-ресурси
- Шаблони у форматі JSON або YAML
- **Stack**: набір ресурсів, що управляються разом
- Автоматичне відкочення при помилці розгортання
- **Change Sets**: попередній перегляд змін до застосування
- Безкоштовний сервіс (оплачуються лише виділені ресурси)
- **AWS CDK** — дозволяє визначати CloudFormation-шаблони через Python, TypeScript або Java

### 2.3 Azure Resource Manager (ARM) та Bicep

**ARM Templates** — рідний IaC-формат Azure (JSON). Складні для читання та написання.

**Azure Bicep** — DSL поверх ARM, що компілюється у JSON ARM-шаблони. Більш читабельний:

```bicep
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'mystorageaccount'
  location: 'eastus'
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}
```

### 2.4 Pulumi

**Pulumi** — IaC з використанням повноцінних мов програмування (Python, TypeScript, Go, C#):

```python
import pulumi
import pulumi_aws as aws

vpc = aws.ec2.Vpc("main", cidr_block="10.0.0.0/16")
```

**Перевага Pulumi:** можна використовувати умови, цикли, функції — все, що доступно у Python/TypeScript. Ідеальний для команд з сильними розробницькими навиками.

### 2.5 Google Cloud Deployment Manager та Config Connector

**Cloud Deployment Manager** — рідний IaC-сервіс GCP (YAML/Jinja2). Менш популярний, ніж Terraform.

**Config Connector** — управління GCP-ресурсами через Kubernetes Custom Resources.

В GCP здебільшого використовують **Terraform** через його мультихмарність.

---

## 3. Terraform: детальний огляд

### 3.1 Архітектура Terraform

```
┌────────────────────────────────────────────────────────────────┐
│              Terraform Core                                     │
│  HCL Config Files (.tf) ──► State Comparison ──► Execution Plan│
└────────────────────────┬───────────────────────────────────────┘
                          │ Plugin Protocol (gRPC)
                          ▼
        ┌─────────────────────────────────────────┐
        │           Provider Plugins              │
        │  aws   │  azurerm  │  google  │  k8s   │
        └─────────────────────────────────────────┘
                          │ API Calls
                          ▼
                 Хмарні провайдери
               (AWS, Azure, GCP, ...)
```

### 3.2 Структура Terraform-проєкту

```
my-infrastructure/
├── main.tf          # Основні ресурси
├── variables.tf     # Оголошення змінних
├── outputs.tf       # Вихідні значення
├── providers.tf     # Конфігурація провайдерів
├── terraform.tfvars # Значення змінних (не комітити в Git!)
└── modules/         # Перевикористовувані модулі
    └── vpc/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### 3.3 Синтаксис HCL

**Provider (Провайдер):**
Це плагін, який дозволяє Terraform взаємодіяти з API конкретного хмарного провайдера (AWS, Azure, GCP) або сервісу (GitHub, Kubernetes).

```hcl
terraform {
  # Блок конфігурації самого Terraform
  required_providers {
    aws = {
      source  = "hashicorp/aws" # Звідки завантажувати (Terraform Registry)
      version = "~> 5.0"        # Версія: дозволено оновлення лише в межах мінорної версії 5.x
    }
  }
}

# Налаштування конкретного екземпляра провайдера
provider "aws" {
  region = "eu-central-1" # Регіон, де створюватимуться ресурси
}
```

**Resource (Ресурс):**
Описує конкретний компонент інфраструктури. Синтаксис: `resource "тип_ресурсу" "локальне_імʼя"`.

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16" # Мережевий діапазон VPC
  enable_dns_hostnames = true

  tags = {
    Name        = "main-vpc"
    Environment = var.environment # Використання змінної
  }
}

resource "aws_subnet" "public" {
  # Використання інтерполяції (id іншого ресурсу). 
  # Це створює неявну залежність: subnet не почне створюватися, поки не готова VPC.
  vpc_id     = aws_vpc.main.id   
  cidr_block = "10.0.1.0/24"
  availability_zone = "eu-central-1a"
}
```

**Variables (Змінні):**
Дозволяють робити конфігурацію гнучкою та параметризованою.

```hcl
# variables.tf
variable "environment" {
  description = "Опис змінної для документації"
  type        = string  # Тип даних (string, number, bool, list, map, object)
  default     = "dev"   # Значення за замовчуванням
  
  # Блок валідації для перевірки коректності введених даних
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Дозволені значення лише: dev, staging або prod."
  }
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}
```

**Outputs (Вихідні значення):**
Використовуються для виведення важливої інформації в консоль після `apply` або для передачі даних між модулями.

```hcl
# outputs.tf
output "vpc_id" {
  description = "ID створеного VPC"
  value       = aws_vpc.main.id # Значення, яке буде виведено
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}
```

**Data Sources (Джерела даних):**
Дозволяють Terraform отримувати (читати) інформацію про ресурси, які вже існують в хмарі або створені не через Terraform.

```hcl
# Запит до AWS для пошуку найсвіжішого образу (AMI) Amazon Linux 2023
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id # Використання знайденого ID
  instance_type = "t3.medium"
}
```

### 3.4 Основні Terraform-команди

Життєвий цикл роботи з інфраструктурою зазвичай складається з наступних кроків:

1.  **`terraform init`** — ініціалізує робочу директорію, сканує код на наявність провайдерів та завантажує необхідні плагіни. Створює папку `.terraform`.
2.  **`terraform fmt`** — автоматично форматує код згідно з канонічним стилем HCL (вирівнювання, відступи).
3.  **`terraform validate`** — перевіряє код на синтаксичні помилки та логічну цілісність (наприклад, чи всі змінні оголошені).
4.  **`terraform plan`** — порівнює поточний стан хмари (state) з вашим кодом і показує "план дій": що буде створено (+), змінено (~) або видалено (-).
5.  **`terraform apply`** — виконує план. Після підтвердження користувачем Terraform надсилає API-запити провайдеру для створення ресурсів.
6.  **`terraform destroy`** — безпечне видалення всіх ресурсів, описаних у поточному проєкті.
7.  **`terraform show`** — виводить зрозумілий опис поточного стану інфраструктури (з файлу state).
8.  **`terraform state list`** — показує список усіх ресурсів, які зараз знаходяться під управлінням даного проєкту.

---

### 3.5 Умовна логіка та цикли

**Count (Умовний або кратний ресурс):**
Використовується, коли потрібно створити кілька однакових ресурсів або створити ресурс за умови.

```hcl
resource "aws_instance" "web" {
  # Тернарний оператор: якщо prod — створити 3 інстанси, інакше — 1.
  count         = var.environment == "prod" ? 3 : 1
  
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"
  
  tags = {
    # count.index — порядковий номер ресурсу (0, 1, 2...)
    Name = "web-${count.index + 1}"
  }
}
```

**For Each (Ітерація по колекції):**
Більш гнучкий спосіб ітерації, дозволяє створювати ресурси на основі ключів карти (map) або списку (set).

```hcl
variable "subnets" {
  type = map(object({ cidr = string, az = string }))
  default = {
    public-1a  = { cidr = "10.0.1.0/24", az = "eu-central-1a" }
    public-1b  = { cidr = "10.0.2.0/24", az = "eu-central-1b" }
    private-1a = { cidr = "10.0.3.0/24", az = "eu-central-1a" }
  }
}

resource "aws_subnet" "all" {
  for_each = var.subnets # Створити subnet для кожного елемента карти

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr # Доступ до значень об'єкта
  availability_zone = each.value.az
  tags = { 
    Name = each.key # Ключ (наприклад, "public-1a") стає іменем
  }
}
```


---

## 4. Управління станом та модульність

### 4.1 Terraform State

**State File (terraform.tfstate)** — файл, що зберігає поточний стан усіх керованих ресурсів (ID, атрибути). Terraform порівнює його з описом у .tf-файлах для визначення необхідних змін.

**Критично важливо:**

- **Ніколи не видаляйте tfstate** вручну без розуміння наслідків
- **Не зберігайте tfstate у Git** — містить чутливі дані (паролі, ключі)
- При роботі в команді — використовуйте **Remote State**

**Remote State (S3 + DynamoDB):**

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # State locking
  }
}
```

**State Locking:** DynamoDB-таблиця запобігає одночасному застосуванню змін кількома розробниками (race condition).

### 4.2 Terraform Modules

**Модуль** — перевикористовуваний блок Terraform-конфігурації. Аналог функції у програмуванні.

**Виклик модуля:**

```hcl
# Використання публічного модуля (Terraform Registry)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.2"

  name = "main-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}
```

**Terraform Registry** (registry.terraform.io) — публічна бібліотека перевірених модулів для типових ресурсів (VPC, EKS, RDS, ALB тощо).

---

## 5. Найкращі практики IaC та інтеграція з CI/CD

### 5.1 Найкращі практики Terraform

**1. Структура проєкту:**

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── modules/
│   ├── vpc/
│   ├── eks/
│   └── rds/
└── common/
    └── providers.tf
```

**2. Версіонування провайдерів та модулів:**
Завжди фіксуйте версію: `version = "~> 5.0"` (minor оновлення дозволено, major — ні).

**3. Тегування всіх ресурсів:**

```hcl
locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.team
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = local.common_tags
}
```

**4. Secrets Management — ніколи не хардкодити:**

```hcl
# Неправильно
resource "aws_db_instance" "main" {
  password = "MySecretPassword123"  # НЕБЕЗПЕЧНО!
}

# Правильно — з AWS Secrets Manager або Parameter Store
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

**5. Статичний аналіз та lint:**

- **`terraform validate`** — перевірка синтаксису
- **`tfsec`** або **`checkov`** — аналіз безпеки конфігурації
- **`terraformdocs`** — автогенерація документації з коментарів

### 5.2 Інтеграція у CI/CD pipeline

**Типовий GitOps-workflow:**

```
Розробник      GitHub PR      CI Pipeline         CD Pipeline
    │               │              │                    │
    ├─ git push ───►│              │                    │
    │               ├─ lint ──────►│                    │
    │               ├─ validate ──►│                    │
    │               ├─ plan ──────►│ (terraform plan)   │
    │               │ PR review    │                    │
    │ PR Approved    │              │                    │
    │               ├─ merge ─────►│                    │
    │               │              ├─ apply ───────────►│
    │               │              │   (terraform apply) │
    │               │              │                    │
    │               │              │              Infrastructure
    │               │              │                   Created
```

**Приклад GitHub Actions Pipeline для Terraform:**

```yaml
name: Terraform CI/CD

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        if: github.event_name == 'pull_request'

      - name: Terraform Apply
        run: terraform apply tfplan
        if: github.ref == 'refs/heads/main'
```

### 5.3 Drift Detection (Виявлення відхилень)

**Configuration Drift** — стан, коли реальна інфраструктура відхиляється від конфігурації в коді (внаслідок ручних змін, збоїв тощо).

**Виявлення:**

```bash
terraform plan   # Показує різниці між кодом та реальним станом
```

**Автоматичний моніторинг:**

- Регулярний запуск `terraform plan` у CI та надсилання сповіщень
- AWS Config Rules — моніторинг відповідності ресурсів правилам
- **Terraform Cloud / Enterprise** — вбудована drift detection функція

---

## Висновки

1. **IaC** є фундаментальною практикою сучасної хмарної інженерії, що забезпечує відтворюваність, версіонування та автоматизацію управління інфраструктурою. Ручне управління через консоль неприйнятне для production-середовищ.

2. **Terraform** є стандартом де-факто для мультихмарного IaC завдяки широкій підтримці провайдерів, потужній екосистемі модулів та декларативному підходу.

3. **Remote State + State Locking** є обов'язковими для командної роботи. Зберігання стану в S3+DynamoDB запобігає конфліктам та забезпечує централізований контроль.

4. **Модульність та DRY-принцип** дозволяють перевикористовувати конфігурації між середовищами та проєктами, скорочуючи дублювання та помилки.

5. **Інтеграція у CI/CD pipeline** з автоматичними plan при PR та apply після злиття — золотий стандарт GitOps, що поєднує ревізування коду з безпечним автоматичним розгортанням.

---

## Джерела

1. HashiCorp. (2024). _Terraform Documentation_. https://developer.hashicorp.com/terraform/docs
2. AWS Documentation. (2024). _AWS CloudFormation User Guide_. https://docs.aws.amazon.com/cloudformation/
3. Microsoft. (2024). _Azure Bicep Documentation_. https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/
4. Brikman, Y. (2022). _Terraform: Up & Running_ (3rd ed.). O'Reilly Media.
5. Kim, G., Humble, J., Debois, P., & Willis, J. (2016). _The DevOps Handbook_. IT Revolution Press.
6. Humble, J., & Farley, D. (2010). _Continuous Delivery_. Addison-Wesley.
7. Weaveworks. (2021). _GitOps: Operations by Pull Request_. https://www.weave.works/blog/gitops-operations-by-pull-request

---

## Запитання для самоперевірки

1. Що таке Infrastructure as Code? Назвіть п'ять ключових переваг IaC порівняно з ручним управлінням.
2. Поясніть різницю між imperative та declarative підходами до IaC. Який підхід використовує Terraform?
3. Що таке Terraform Provider? Як він дозволяє Terraform підтримувати AWS, Azure та GCP одним інструментом?
4. Поясніть структуру HCL-конфігурації Terraform: що таке resource, variable, output та data source?
5. Що таке terraform.tfstate? Чому його не можна зберігати у Git? Як організувати remote state для командної роботи?
6. Що таке State Locking і яку проблему він вирішує при командній роботі?
7. Для чого використовуються Terraform-модулі? Наведіть приклад сценарію, де без модулів виникне порушення DRY.
8. Опишіть типовий GitOps CI/CD pipeline для Terraform: які кроки виконуються при PR та після злиття?
9. Що таке Configuration Drift? Як Terraform допомагає його виявляти та усувати?
10. Порівняйте Terraform та AWS CloudFormation. Коли варто обрати CloudFormation замість Terraform?
