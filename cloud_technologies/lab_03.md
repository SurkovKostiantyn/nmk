# Лабораторна робота №3 (2 години)

**Тема:** Налаштування хмарної мережевої інфраструктури.

Створення та конфігурація Virtual Cloud Network (VCN) в Oracle Cloud або Virtual Private Cloud (VPC) в AWS; налаштування підмереж, таблиць маршрутизації та Internet Gateway; конфігурація груп безпеки та мережевих ACL; тестування зв'язності між ресурсами.

**Мета:** Набути практичні навички створення ізольованої хмарної мережі, налаштування підмереж і правил безпеки, а також тестування мережевої зв'язності між хмарними ресурсами.

**Технологічний стек:**

- **Oracle Cloud Free Tier** (рекомендується) — повністю безкоштовно, без списання коштів; VCN є прямим аналогом AWS VPC
- **Альтернатива 1 — AWS Free Tier** (потрібна банківська картка): VPC, EC2 t2.micro (750 год/міс безкоштовно 12 місяців)
- **Альтернатива 2 — LocalStack Community** (без картки, локально): симулює AWS API на вашому ПК через Docker

---

## Варіант А. Oracle Cloud Free Tier (рекомендований)

### Реєстрація (якщо ще не зроблено)

1. Зайдіть на [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)
2. Натисніть **Start for free** → заповніть форму будь-якою email-адресою (Gmail підходить)
3. Введіть дані картки — **кошти не знімаються**, картка потрібна лише для верифікації особистості
4. Оберіть Home Region (наприклад, **Germany Central** або **UK South**)
5. Після підтвердження email отримаєте доступ до консолі

> **Always Free ресурси Oracle Cloud:** 2 AMD Compute VM (1 OCPU, 1 GB RAM кожна), 200 GB Block Volume, 1 VCN з необмеженою кількістю підмереж — **назавжди, без обмеження 12 місяців**.

## Завдання

1. Створити Virtual Cloud Network (VCN) з адресним простором `10.0.0.0/16`
2. Створити дві підмережі: публічну (`10.0.1.0/24`) та приватну (`10.0.2.0/24`)
3. Налаштувати Internet Gateway та таблицю маршрутизації для публічної підмережі
4. Створити Security List з правилами для SSH (порт 22) та HTTP (порт 80)
5. Запустити дві VM у різних підмережах і перевірити зв'язність між ними
6. Задокументувати архітектуру мережі у вигляді схеми або таблиці

---

## Хід виконання роботи

### Крок 1. Вхід до Oracle Cloud Console

1. Відкрийте [https://cloud.oracle.com](https://cloud.oracle.com) та увійдіть до акаунту
2. У верхньому меню переконайтесь, що обрано правильний **Region** (той, що обрали при реєстрації)
3. У головному меню (☰) → **Networking** → **Virtual Cloud Networks**

### Крок 2. Створення VCN

1. Натисніть **Create VCN**
2. Заповніть поля:
   - **Name:** `lab03-vcn`
   - **IPv4 CIDR Block:** `10.0.0.0/16`
   - DNS Resolution: увімкнено
3. Натисніть **Create VCN**

Після створення ви побачите деталі VCN. Запишіть OCID VCN — він знадобиться пізніше.

### Крок 3. Створення Internet Gateway

1. У деталях VCN → ліве меню **Internet Gateways** → **Create Internet Gateway**
2. **Name:** `lab03-igw`
3. Натисніть **Create Internet Gateway**

### Крок 4. Налаштування таблиці маршрутизації для публічної підмережі

1. У деталях VCN → **Route Tables** → **Create Route Table**
2. **Name:** `lab03-public-rt`
3. Додайте правило маршрутизації:
   - **Destination CIDR:** `0.0.0.0/0`
   - **Target Type:** Internet Gateway
   - **Target:** `lab03-igw`
4. Натисніть **Create**

### Крок 5. Налаштування Security List

1. У деталях VCN → **Security Lists** → **Create Security List**
2. **Name:** `lab03-public-sl`
3. Додайте **Ingress Rules** (вхідні правила):

   | Stateless | Protocol | Source CIDR   | Port           | Призначення      |
   | --------- | -------- | ------------- | -------------- | ---------------- |
   | No        | TCP      | `0.0.0.0/0`   | 22             | SSH              |
   | No        | TCP      | `0.0.0.0/0`   | 80             | HTTP             |
   | No        | ICMP     | `0.0.0.0/0`   | Type 3, Code 4 | MTU discovery    |
   | No        | ICMP     | `10.0.0.0/16` | Type 8         | Ping у межах VCN |

4. **Egress Rules** (вихідні): залишіть дефолтне правило `0.0.0.0/0` All Traffic

### Крок 6. Створення публічної підмережі

1. У деталях VCN → **Subnets** → **Create Subnet**
2. Заповніть:
   - **Name:** `lab03-public-subnet`
   - **Subnet Type:** Regional
   - **IPv4 CIDR Block:** `10.0.1.0/24`
   - **Route Table:** `lab03-public-rt`
   - **Security List:** `lab03-public-sl`
3. Натисніть **Create Subnet**

### Крок 7. Створення приватної підмережі

1. **Create Subnet** ще раз:
   - **Name:** `lab03-private-subnet`
   - **IPv4 CIDR Block:** `10.0.2.0/24`
   - **Route Table:** Default Route Table (без Internet Gateway)
   - **Security List:** Default Security List
2. Натисніть **Create Subnet**

### Крок 8. Запуск VM у публічній підмережі

1. ☰ → **Compute** → **Instances** → **Create Instance**
2. Налаштування:
   - **Name:** `vm-public`
   - **Image:** Oracle Linux 8 або Ubuntu 22.04 (Always Free eligible)
   - **Shape:** VM.Standard.E2.1.Micro (Always Free)
   - **Networking:** оберіть `lab03-vcn` → `lab03-public-subnet`
   - **Public IP address:** Assign automatically
3. **Add SSH keys:** завантажте або вставте свій публічний SSH-ключ (`~/.ssh/id_rsa.pub`)
4. Натисніть **Create**

### Крок 9. Запуск VM у приватній підмережі

1. Аналогічно створіть другий екземпляр:
   - **Name:** `vm-private`
   - **Networking:** `lab03-vcn` → `lab03-private-subnet`
   - **Public IP address:** Do not assign

### Крок 10. Тестування зв'язності

**Підключення до public VM через SSH:**

```bash
ssh -i ~/.ssh/id_rsa opc@<PUBLIC_IP_vm-public>
```

**Тест зв'язності між VM (з public до private):**

```bash
# На vm-public — перевірити ping до private VM
ping 10.0.2.x   # IP вашої приватної VM

# Перевірити маршрути
ip route show

# Спробувати SSH до приватної VM через публічну (jump host)
ssh -J opc@<PUBLIC_IP> opc@<PRIVATE_IP>
```

**Перевірка Security List (що SSH із зовні приходить):**

```bash
# З вашого ПК перевірити доступність порту 22
nc -zv <PUBLIC_IP> 22
nc -zv <PUBLIC_IP> 80   # має бути closed, бо HTTP-сервер не запущений
```

### Крок 11. Перегляд мережевої топології

В Oracle Cloud Console:

- ☰ → **Networking** → **Virtual Cloud Networks** → `lab03-vcn` → вкладка **Topology**
- Зробіть скриншот топології мережі для звіту

---

## Варіант Б. LocalStack (без облікового запису у хмарі)

Якщо немає можливості зареєструватись у хмарі — можна симулювати AWS VPC локально.

### Встановлення

```bash
# Потрібен Docker Desktop (https://www.docker.com/products/docker-desktop)
pip install localstack awscli-local

# Запуск LocalStack
docker run --rm -d \
  -p 4566:4566 \
  -e SERVICES=ec2,route53 \
  --name localstack \
  localstack/localstack
```

### Робота з симульованим VPC

```bash
# Встановити endpoint для LocalStack
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# Створити VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Створити підмережу
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24

# Створити Internet Gateway
aws ec2 create-internet-gateway

# Прикріпити IGW до VPC
aws ec2 attach-internet-gateway --vpc-id <VPC_ID> --internet-gateway-id <IGW_ID>

# Переглянути VPC
aws ec2 describe-vpcs
aws ec2 describe-subnets
```

---

## Контрольні запитання

1. Що таке Virtual Private Cloud (VPC/VCN)? Чим він відрізняється від звичайної мережі?
2. Поясніть різницю між публічною та приватною підмережею у хмарній мережі.
3. Для чого потрібен Internet Gateway? Що відбудеться, якщо його видалити з публічної підмережі?
4. Що таке Security List (Oracle) або Security Group (AWS)? Чим вони відрізняються від мережевих ACL?
5. Поясніть маршрут `0.0.0.0/0` у таблиці маршрутизації. Що він означає?
6. Чому приватна VM не має публічного IP? Як до неї можна отримати доступ?
7. Що таке CIDR-нотація? Скільки хостів можна розмістити у підмережі `/24`?

---

## Вимоги до звіту

1. Скриншот топології мережі (Oracle Cloud → Topology або AWS → VPC Topology)
2. Скриншот таблиці підмереж (IP-адреси, CIDR, тип — публічна/приватна)
3. Виведення команди `ip route show` з vm-public
4. Скриншот успішного ping між vm-public та vm-private
5. Відповіді на контрольні запитання у файлі `lab03.md`
6. Посилання на GitHub-репозиторій або файл з матеріалами — надіслати в Classroom
