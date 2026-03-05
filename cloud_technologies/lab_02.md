# Лабораторна робота №2 (2 години)

**Тема:** Робота з інтерфейсами командного рядка хмарних провайдерів.

Встановлення та налаштування AWS CLI, Azure CLI або Oracle Cloud CLI; автентифікація та конфігурація профілів; виконання основних операцій через CLI; написання простих shell-скриптів для автоматизації хмарних операцій.

**Мета:** Набути практичні навички роботи з хмарними платформами через інтерфейс командного рядка (CLI), навчитися автентифікуватись, виконувати основні операції та автоматизувати рутинні дії за допомогою скриптів.

**Технологічний стек:**

- **AWS CLI v2** або **Oracle Cloud CLI (OCI CLI)** — основний інструмент
- **Python 3.8+** — необхідний для OCI CLI
- **Bash / PowerShell** — для написання скриптів
- **Terminal** (Linux/macOS) або **Windows Terminal / PowerShell** (Windows)

---

## Завдання

1. Встановити та налаштувати CLI обраного хмарного провайдера
2. Пройти автентифікацію та налаштувати профіль
3. Виконати базові операції через CLI: перегляд ресурсів, створення об'єктів, видалення
4. Написати shell-скрипт для автоматизації 2–3 операцій
5. Дослідити систему допомоги CLI (help, man-сторінки)

---

## Хід виконання роботи

### Крок 1. Встановлення CLI

#### Варіант А — AWS CLI v2

**Windows:**

```powershell
# Завантажити та встановити MSI-інсталятор
# https://awscli.amazonaws.com/AWSCLIV2.msi
# Або через winget:
winget install Amazon.AWSCLI
```

**macOS:**

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux (Ubuntu/Debian):**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Перевірка установки:

```bash
aws --version
# Очікуваний вивід: aws-cli/2.x.x Python/3.x.x ...
```

#### Варіант Б — Oracle Cloud CLI (OCI CLI)

```bash
# Автоматичне встановлення (Linux/macOS)
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Windows (PowerShell від адміністратора)
Set-ExecutionPolicy RemoteSigned
powershell -NoProfile -ExecutionPolicy Bypass -Command `
  "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.ps1'))"
```

Перевірка:

```bash
oci --version
```

### Крок 2. Автентифікація та налаштування профілю

#### AWS CLI — налаштування профілю

1. У AWS Console → IAM → Users → ваш користувач → вкладка **Security credentials**
2. **Access keys** → **Create access key** → оберіть **CLI** → збережіть `Access Key ID` і `Secret Access Key`

```bash
aws configure
# AWS Access Key ID: <ваш ключ>
# AWS Secret Access Key: <ваш секрет>
# Default region name: eu-central-1
# Default output format: json
```

Переглянути збережену конфігурацію:

```bash
cat ~/.aws/credentials
cat ~/.aws/config
```

#### OCI CLI — налаштування профілю

```bash
oci setup config
# Слідуйте підказкам:
# - Введіть OCID акаунту (знайдіть у Profile → Tenancy)
# - Введіть OCID користувача (Profile → User Settings)
# - Оберіть регіон (наприклад: eu-frankfurt-1)
# - Генерується API-ключова пара (RSA 2048)
```

Завантажте публічний ключ (`~/.oci/oci_api_key_public.pem`) до Oracle Cloud:

- Profile → User Settings → API Keys → **Add API Key** → вставте вміст публічного ключа

### Крок 3. Базові операції через CLI

#### AWS CLI

```bash
# Переглянути інформацію про поточний акаунт
aws sts get-caller-identity

# Список S3-кошиків
aws s3 ls

# Список EC2-екземплярів
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' --output table

# Список IAM-користувачів
aws iam list-users

# Список доступних регіонів
aws ec2 describe-regions --output table

# Список AMI (образів) для Amazon Linux 2
aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId'
```

#### OCI CLI

```bash
# Перевірити автентифікацію
oci iam user get --user-id <ваш_user_ocid>

# Список компартментів
oci iam compartment list

# Список VM-інстанцій у компартменті
oci compute instance list --compartment-id <compartment_ocid>

# Список доступних образів
oci compute image list --compartment-id <compartment_ocid> \
  --query 'data[?contains("display-name",`Oracle Linux`)].[display-name, id]' \
  --output table
```

### Крок 4. Робота з об'єктним сховищем через CLI

#### AWS S3 через CLI

```bash
# Створити S3-кошик (bucket name має бути глобально унікальним)
aws s3 mb s3://lab02-bucket-$(whoami)-2024 --region eu-central-1

# Завантажити файл
echo "Hello from CLI!" > test.txt
aws s3 cp test.txt s3://lab02-bucket-$(whoami)-2024/

# Переглянути вміст кошика
aws s3 ls s3://lab02-bucket-$(whoami)-2024/

# Завантажити файл назад
aws s3 cp s3://lab02-bucket-$(whoami)-2024/test.txt downloaded.txt
cat downloaded.txt

# Видалити файл і кошик
aws s3 rm s3://lab02-bucket-$(whoami)-2024/test.txt
aws s3 rb s3://lab02-bucket-$(whoami)-2024
```

### Крок 5. Написання скрипту автоматизації

Створіть файл `cloud_info.sh` (Bash) або `cloud_info.ps1` (PowerShell):

**Bash (Linux/macOS):**

```bash
#!/bin/bash
# cloud_info.sh — збір інформації про хмарний акаунт

echo "=============================="
echo "  Cloud Account Info Script   "
echo "=============================="

echo ""
echo "--- Ідентифікатор акаунту ---"
aws sts get-caller-identity

echo ""
echo "--- Список IAM-користувачів ---"
aws iam list-users --query 'Users[*].[UserName, CreateDate]' --output table

echo ""
echo "--- Список S3-кошиків ---"
aws s3 ls

echo ""
echo "--- EC2 екземпляри у eu-central-1 ---"
aws ec2 describe-instances \
  --region eu-central-1 \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]' \
  --output table

echo ""
echo "=============================="
echo "  Готово!"
echo "=============================="
```

**PowerShell (Windows):**

```powershell
# cloud_info.ps1 — збір інформації про хмарний акаунт

Write-Host "=============================="
Write-Host "  Cloud Account Info Script   "
Write-Host "=============================="

Write-Host "`n--- Ідентифікатор акаунту ---"
aws sts get-caller-identity

Write-Host "`n--- Список IAM-користувачів ---"
aws iam list-users --query 'Users[*].[UserName, CreateDate]' --output table

Write-Host "`n--- Список S3-кошиків ---"
aws s3 ls

Write-Host "`n--- EC2 у eu-central-1 ---"
aws ec2 describe-instances --region eu-central-1 --output table

Write-Host "`n=============================="
Write-Host "  Готово!"
Write-Host "=============================="
```

Запустіть скрипт і збережіть вивід:

```bash
chmod +x cloud_info.sh
./cloud_info.sh | tee cloud_info_output.txt
```

### Крок 6. Дослідження системи допомоги CLI

```bash
# Загальна довідка
aws help

# Допомога по конкретному сервісу
aws s3 help
aws ec2 help

# Допомога по конкретній команді
aws ec2 describe-instances help

# Автодоповнення команд (Bash)
complete -C '/usr/local/bin/aws_completer' aws
```

Дослідіть `--output` формати (`json`, `table`, `text`, `yaml`) та `--query` (JMESPath-фільтрація):

```bash
# Вивід у різних форматах
aws ec2 describe-regions --output json
aws ec2 describe-regions --output table
aws ec2 describe-regions --output text

# JMESPath-запит — лише назви регіонів
aws ec2 describe-regions --query 'Regions[*].RegionName' --output text
```

---

## Контрольні запитання

1. Що таке Access Key та Secret Access Key в AWS? Чому їх не можна зберігати у відкритому репозиторії?
2. Поясніть різницю між автентифікацією через Access Key та через IAM Role. Який підхід є більш безпечним?
3. Що таке JMESPath і для чого він використовується у AWS CLI (`--query`)? Наведіть приклад.
4. Чим відрізняються формати виводу `json`, `table`, `text` у AWS CLI? Коли який використовувати?
5. Що таке AWS CLI Profile? Як налаштувати кілька профілів і перемикатись між ними?
6. Як мінімізувати ризик випадкового створення платних ресурсів при роботі через CLI?

---

## Вимоги до звіту

1. Скриншот виводу команди `aws --version` або `oci --version`
2. Скриншот виводу `aws sts get-caller-identity` (або аналогу для OCI)
3. Скриншот виводу команди перегляду S3-кошиків або списку VM
4. Вміст файлу скрипту `cloud_info.sh` / `cloud_info.ps1`
5. Скриншот успішного виконання скрипту
6. Відповіді на контрольні запитання у файлі `lab02.md`
7. Посилання на GitHub-репозиторій з файлами скрипту надіслати в Classroom
