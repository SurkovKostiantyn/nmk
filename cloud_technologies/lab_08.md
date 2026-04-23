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

*(Якщо у вас немає можливості використати AWS, перейдіть до **Варіанта Б — Docker (Локально)** після Кроку 5).*

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

### Альтернативний варіант виконання (без доступу до хмарних провайдерів)

**Варіант Б — Docker (Локально):**

Цей варіант призначений для тих, хто не має доступу до хмарних провайдерів AWS, Azure або OCI. Замість хмарних ресурсів ми використовуватимемо Terraform для управління локальним середовищем Docker.

*(Вимога: на вашому комп'ютері має бути встановлений та запущений Docker Desktop або Docker Engine).*

**1. Створення проєкту та конфігурація (Аналог Кроку 2):**

Створіть та перейдіть у директорію проєкту:

```bash
mkdir lab08-docker && cd lab08-docker
```

Файл `main.tf`:

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  # За замовчуванням Terraform знайде локальний Docker сокет
}

resource "docker_image" "nginx" {
  name         = "nginx:1.25-alpine"
  keep_locally = false
}

resource "docker_container" "nginx_container" {
  image = docker_image.nginx.image_id
  name  = "lab08-nginx-${var.student_name}"

  ports {
    internal = 80
    external = 8080
  }
}
```

Файл `variables.tf`:

```hcl
variable "student_name" {
  description = "Your name (used in resource names)"
  type        = string
}
```

Файл `outputs.tf`:

```hcl
output "container_name" {
  description = "Name of the Docker container"
  value       = docker_container.nginx_container.name
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://localhost:8080"
}
```

**2. Виконання основного циклу (Аналог Кроку 3):**

Виконайте ініціалізацію Terraform (завантаження провайдера `kreuzwerker/docker`):

```bash
terraform init
```

*Можлива відповідь системи:*
```text
Initializing the backend...
Initializing provider plugins...
- Finding kreuzwerker/docker versions matching "~> 3.0"...
- Installing kreuzwerker/docker v3.0.2...
- Installed kreuzwerker/docker v3.0.2 (signed by a HashiCorp partner)

Terraform has been successfully initialized!
```

Відформатуйте конфігурацію та перевірте її на помилки:

```bash
terraform fmt
terraform validate
```

*Можлива відповідь системи:*
```text
Success! The configuration is valid.
```

Перегляньте план змін (сухий прогін):

```bash
terraform plan -var="student_name=ivan-petrenko"
```

*Можлива відповідь системи:*
```text
Terraform will perform the following actions:

  # docker_container.nginx_container will be created
  + resource "docker_container" "nginx_container" {
      + id           = (known after apply)
      + image        = (known after apply)
      + name         = "lab08-nginx-ivan-petrenko"
      + ports {
          + external = 8080
          + internal = 80
        }
      # ... інші параметри
    }

  # docker_image.nginx will be created
  + resource "docker_image" "nginx" {
      + id           = (known after apply)
      + name         = "nginx:1.25-alpine"
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

Застосуйте зміни для створення інфраструктури (введіть `yes` коли запитає):

```bash
terraform apply -var="student_name=ivan-petrenko"
```

*Можлива відповідь системи:*
```text
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

docker_image.nginx: Creating...
docker_image.nginx: Creation complete after 3s [id=sha256:...]
docker_container.nginx_container: Creating...
docker_container.nginx_container: Creation complete after 1s [id=...]

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

application_url = "http://localhost:8080"
container_name = "lab08-nginx-ivan-petrenko"
```

Після успішного виконання відкрийте свій браузер за адресою `http://localhost:8080` та переконайтеся, що відображається сторінка Nginx за замовчуванням.

**3. Створення інфраструктури з мережею (Аналог Кроку 4):**

Локальна інфраструктура може складатися з кількох контейнерів та власної мережі. Додайте створення `docker_network` та контейнера з базою даних у `main.tf`:

```hcl
resource "docker_network" "lab_net" {
  name = "lab08-net-${var.student_name}"
}

resource "docker_image" "redis" {
  name         = "redis:alpine"
  keep_locally = false
}

resource "docker_container" "redis_container" {
  image = docker_image.redis.image_id
  name  = "lab08-redis-${var.student_name}"

  networks_advanced {
    name = docker_network.lab_net.name
  }
}
```

Оновіть ресурс `nginx_container`, додавши йому підключення до мережі:

```hcl
resource "docker_container" "nginx_container" {
  image = docker_image.nginx.image_id
  name  = "lab08-nginx-${var.student_name}"

  ports {
    internal = 80
    external = 8080
  }

  networks_advanced {
    name = docker_network.lab_net.name
  }
}
```

Застосуйте зміни. Terraform перебудує Nginx (оскільки змінилися мережеві налаштування) та підключить його до нової мережі, а також створить Redis:

```bash
terraform apply -var="student_name=ivan-petrenko"
```

*Можлива відповідь системи:*
```text
...
# docker_container.nginx_container must be replaced
-/+ resource "docker_container" "nginx_container" {
... (forcing replacement)

Plan: 3 to add, 0 to change, 1 to destroy.
...
Enter a value: yes

docker_container.nginx_container: Destroying... [id=...]
docker_container.nginx_container: Destruction complete after 0s
docker_network.lab_net: Creating...
docker_image.redis: Creating...
docker_network.lab_net: Creation complete after 0s
docker_image.redis: Creation complete after 2s [id=sha256:...]
docker_container.redis_container: Creating...
docker_container.redis_container: Creation complete after 1s [id=...]
docker_container.nginx_container: Creating...
docker_container.nginx_container: Creation complete after 1s [id=...]

Apply complete! Resources: 3 added, 0 changed, 1 destroyed.
```

**4. Дослідження файлу стану (Аналог Кроку 5):**

Подивіться список усіх керованих Terraform ресурсів:

```bash
terraform state list
```

*Можлива відповідь системи:*
```text
docker_container.nginx_container
docker_container.redis_container
docker_image.nginx
docker_image.redis
docker_network.lab_net
```

Дослідіть детальну інформацію про конкретний ресурс з файлу стану без виклику команд самого Docker:

```bash
terraform state show docker_container.nginx_container
```

*Можлива відповідь системи:*
```hcl
# docker_container.nginx_container:
resource "docker_container" "nginx_container" {
    command           = [
        "nginx",
        "-g",
        "daemon off;",
    ]
    env               = []
    id                = "a1b2c3d4e5f6..."
    image             = "sha256:..."
    name              = "lab08-nginx-ivan-petrenko"
    network_data      = [
        {
            gateway                   = "172.18.0.1"
            ip_address                = "172.18.0.2"
            network_name              = "lab08-net-ivan-petrenko"
        },
    ]
    # ... інша детальна інформація
}
```

Видаліть інфраструктуру (виконайте це після перевірки роботи лабораторної):

```bash
terraform destroy -var="student_name=ivan-petrenko"
```

*Можлива відповідь системи:*
```text
...
Plan: 0 to add, 0 to change, 5 to destroy.

Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value: yes

docker_container.nginx_container: Destroying... [id=...]
docker_container.redis_container: Destroying... [id=...]
docker_container.nginx_container: Destruction complete after 1s
docker_container.redis_container: Destruction complete after 1s
docker_image.nginx: Destroying... [id=sha256:...]
docker_image.redis: Destroying... [id=sha256:...]
docker_network.lab_net: Destroying... [id=...]
...
Destroy complete! Resources: 5 destroyed.
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
