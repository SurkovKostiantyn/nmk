# Лабораторна робота №8 (2 години)

**Тема:** Автоматизація інфраструктури за допомогою Terraform.

Встановлення Terraform та налаштування провайдера; написання конфігураційних файлів для розгортання VM, мережі та сховища; команди `init`, `plan`, `apply`, `destroy`; управління станом інфраструктури та використання змінних.

**Мета:** Набути практичні навички декларативного опису та автоматизованого розгортання хмарної інфраструктури за концепцією Infrastructure as Code (IaC) за допомогою Terraform.

**Технологічний стек:**

- **Terraform** v1.6+ — основний IaC-інструмент
- **Oracle Cloud (OCI) Provider** або **AWS Provider** для Terraform
- **VS Code** з розширенням HashiCorp Terraform — для редагування `.tf` файлів
- **OCI CLI / AWS CLI** — для автентифікації провайдера

---

## Завдання

1. Встановити Terraform та перевірити його роботу
2. Написати конфігурацію для розгортання простого хмарного ресурсу (Object Storage bucket або S3)
3. Виконати цикл `init → plan → apply → destroy`
4. Розгорнути VM з мережевою інфраструктурою через Terraform
5. Використати змінні (variables) та виводи (outputs) у конфігурації
6. Дослідити файл стану `terraform.tfstate`

---

## Хід виконання роботи

### Крок 1. Встановлення Terraform

**Windows (winget):**

```powershell
winget install HashiCorp.Terraform
```

**macOS (Homebrew):**

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

**Linux (Ubuntu):**

```bash
sudo apt update && sudo apt install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

Перевірка:

```bash
terraform version
```

### Крок 2. Перший проєкт — Object Storage Bucket

Створіть директорію проєкту:

```bash
mkdir lab08-terraform && cd lab08-terraform
```

**Варіант А — AWS S3 Bucket:**

Файл `main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "lab_bucket" {
  bucket = "lab08-terraform-${var.student_name}"

  tags = {
    Name        = "Lab08 Terraform Bucket"
    Environment = "Lab"
    Student     = var.student_name
  }
}

resource "aws_s3_bucket_versioning" "lab_versioning" {
  bucket = aws_s3_bucket.lab_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

Файл `variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "student_name" {
  description = "Your name (used in resource names)"
  type        = string
}
```

Файл `outputs.tf`:

```hcl
output "bucket_name" {
  description = "Name of the created S3 bucket"
  value       = aws_s3_bucket.lab_bucket.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.lab_bucket.arn
}
```

### Крок 3. Виконання основного циклу Terraform

```bash
# 1. Ініціалізація — завантаження провайдерів
terraform init

# 2. Форматування коду
terraform fmt

# 3. Валідація конфігурації
terraform validate

# 4. Планування — перегляд змін БЕЗ застосування
terraform plan -var="student_name=ivan-petrenko"

# 5. Застосування — реальне розгортання
terraform apply -var="student_name=ivan-petrenko"
# Введіть 'yes' для підтвердження

# 6. Перегляд стану
terraform show
terraform state list

# 7. Видалення ресурсів
terraform destroy -var="student_name=ivan-petrenko"
```

### Крок 4. Розгортання VM з мережею

Додайте до `main.tf` (AWS):

```hcl
# VPC
resource "aws_vpc" "lab_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = { Name = "lab08-vpc" }
}

# Публічна підмережа
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.lab_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = { Name = "lab08-public-subnet" }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.lab_vpc.id
  tags   = { Name = "lab08-igw" }
}

# Security Group
resource "aws_security_group" "lab_sg" {
  name   = "lab08-sg"
  vpc_id = aws_vpc.lab_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "lab_vm" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.lab_sg.id]

  user_data = <<-EOF
    #!/bin/bash
    apt update && apt install -y nginx
    echo "<h1>Terraform Lab 08</h1>" > /var/www/html/index.html
    systemctl start nginx
  EOF

  tags = { Name = "lab08-vm-${var.student_name}" }
}
```

Додайте до `outputs.tf`:

```hcl
output "vm_public_ip" {
  value = aws_instance.lab_vm.public_ip
}
```

```bash
terraform apply -var="student_name=ivan-petrenko"
# Після apply відкрийте у браузері: http://<vm_public_ip>
terraform destroy -var="student_name=ivan-petrenko"
```

### Крок 5. Дослідження файлу стану

```bash
# Перегляд стану у форматі JSON
cat terraform.tfstate | python3 -m json.tool | head -50

# Список ресурсів у стані
terraform state list

# Деталі конкретного ресурсу
terraform state show aws_s3_bucket.lab_bucket

# Імпорт існуючого ресурсу до стану (ознайомчо)
# terraform import aws_s3_bucket.lab_bucket <bucket-name>
```

---

## Контрольні запитання

1. Що таке Infrastructure as Code (IaC)? Які переваги воно надає порівняно з ручним налаштуванням через консоль?
2. Поясніть різницю між декларативним (Terraform) та імперативним (Ansible) підходами до IaC.
3. Що таке `terraform.tfstate`? Чому його не варто видаляти та де зберігати у командній розробці?
4. Поясніть призначення команд `terraform plan` та `terraform apply`. Чому варто завжди виконувати `plan` перед `apply`?
5. Що таке Provider у Terraform? Як він зв'язує Terraform з конкретною хмарною платформою?
6. Що таке `terraform destroy`? Які ситуації вимагають обережності при виконанні цієї команди?

---

## Вимоги до звіту

1. Вміст файлів `main.tf`, `variables.tf`, `outputs.tf`
2. Вивід команди `terraform plan` (або його скриншот)
3. Вивід команди `terraform apply` зі стовпцем «Apply complete!»
4. Вивід команди `terraform state list` після розгортання
5. Скриншот або підтвердження створеного ресурсу у хмарній консолі
6. Відповіді на контрольні запитання у файлі `lab08.md`
7. Посилання на GitHub з Terraform-конфігурацією надіслати в Classroom
