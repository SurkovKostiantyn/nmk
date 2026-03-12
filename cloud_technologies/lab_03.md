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

### Встановлення та Налаштування

```bash
# Потрібен Docker Desktop (https://www.docker.com/products/docker-desktop)
# Встановлюємо пакети LocalStack, awscli та обгортку awslocal (з прапорцем --user для уникнення помилок прав доступу)
pip install --user awscli localstack awscli-local

# Запуск LocalStack у Docker
docker run --rm -d \
  -p 4566:4566 \
  -e SERVICES=ec2,route53 \
  --name localstack \
  localstack/localstack
```

> **Важливо для Windows (PowerShell):** Якщо після встановлення команди `aws` або `awslocal` не розпізнаються, переконайтеся, що шлях до скриптів Python додано у змінні середовища `PATH`.
>
> Щоб додати шлях у `PATH`, виконайте цю команду (але зверніть увагу: замініть `teach` на ім'я вашого користувача Windows, а `Python311` на вашу версію Python, якщо вона відрізняється):
>
> ```powershell
> [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\teach\AppData\Roaming\Python\Python311\Scripts", "User"); $env:Path += ";C:\Users\teach\AppData\Roaming\Python\Python311\Scripts"
> ```

Далі необхідно налаштувати фіктивні облікові дані, оскільки AWS CLI вимагає їх наявності:

```bash
aws configure
# Введіть наступні значення, коли інструмент попросить:
# AWS Access Key ID: test
# AWS Secret Access Key: test
# Default region name: us-east-1
# Default output format: json
```

### Робота з симульованим VPC

Використовуйте команду `awslocal` замість `aws`. Вона автоматично перенаправлятиме запити до локального LocalStack-контейнера.

```bash
# Створити VPC
awslocal ec2 create-vpc --cidr-block 10.0.0.0/16

# Створити підмережу (змініть <VPC_ID> на отриманий вище)
awslocal ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24

# Створити Internet Gateway
awslocal ec2 create-internet-gateway

# Прикріпити IGW до VPC (змініть на свої <VPC_ID> та <IGW_ID>)
awslocal ec2 attach-internet-gateway --vpc-id <VPC_ID> --internet-gateway-id <IGW_ID>

# Переглянути стан VPC та підмереж
awslocal ec2 describe-vpcs
awslocal ec2 describe-subnets
```

### Практичне значення локальної симуляції

### Як це використовується на практиці у розробці?

Створення подібної віртуальної мережі локально має величезне значення для сучасних інженерів (DevOps та Backend):

1. **Безпечне тестування мікросервісів:** Ви можете запустити свої сервіси так, як вони б працювали в хмарі. Наприклад, розмістити базу даних у "приватній підмережі" (без доступу до інтернету), а веб-сервер — у "публічній". LocalStack дозволить перевірити, чи дійсно веб-сервер має до неї доступ, а комп'ютери ззовні — ні.
2. **Інтеграційні тести (CI/CD):** В автоматичних конвеєрах (наприклад, GitHub Actions чи GitLab CI) розробники часто піднімають тимчасовий контейнер LocalStack, створюють у ньому VPC, бази S3, черги SQS, запускають тести свого коду, а потім знищують контейнер. Це абсолютно безкоштовно і працює миттєво.
3. **Навчання роботі з інфраструктурою:** Для вивчення інструментів оркестрації (наприклад, Terraform, Ansible чи AWS CDK) не обов'язково купувати хмарний акаунт і боятися зламати інфраструктуру або отримати величезний рахунок за ресурси. Більшість хмарних архітектур наразі можуть бути повністю написані в коді та вживу протестовані саме через такий локальний інструмент.

#### Демонстрація: Запуск EC2-інстансу у нашій створеній підмережі

Для перевірки роботи нашої мережі, ми можемо створити віртуальний сервер (EC2) та помістити його в конкретну створену нами підмережу:

````bash
# 1. Знаходимо ID нашої підмережі (SubnetId) з попереднього виводу (наприклад: subnet-fdb77180834222214)

# 2. Запускаємо віртуальну машину (t2.micro) всередині нашої підмережі
awslocal ec2 run-instances --image-id ami-000001 --count 1 --instance-type t2.micro --subnet-id <ВАШ_SUBNET_ID>

Очікувана відповідь від LocalStack (фрагмент):
```json
...
"InstanceId": "i-a4064262069363936",
"ImageId": "ami-000001",
"State": {
    "Code": 0,
    "Name": "pending"
},
...
"SubnetId": "subnet-fdb77180834222214",
"VpcId": "vpc-523f98001c2638213",
"PrivateIpAddress": "10.0.1.4"
...
````

**Що означає ця відповідь:**

- **`InstanceId`** — ідентифікатор нашого нового віртуального сервера.
- **`State (pending)`** — статус сервера: він щойно почав запускатися і буде доступний за кілька секунд.
- **`VpcId` та `SubnetId`** — LocalStack розмістив сервер рівно у тій мережі та підмережі, яку ми створили раніше.
- **`PrivateIpAddress` (`10.0.1.4`)** — локальний DHCP-сервер у нашій VPC автоматично видав віртуальній машині вільну приватну IP-адресу з діапазону 10.0.1.0/24.

# 3. Перевіряємо, що сервер запустився і отримав IP-адресу з нашого діапазону (10.0.1.X)

awslocal ec2 describe-instances

````

### Приклад: Налаштування доступу до Інтернету для нашої підмережі (Public Subnet)

У попередніх кроках ми створили `VPC`, Підмережу (`Subnet`) та Інтернет-шлюз (`Internet Gateway`). Але зараз наша підмережа "приватна" — з неї немає виходу в Інтернет.

Щоб зробити підмережу "публічною" (наприклад, щоб наш створений EC2-сервер міг завантажувати оновлення), нам потрібно налаштувати **Таблицю маршрутизації (Route Table)**. Це типова задача для хмарного інженера:

```bash
# 1. Створюємо нову таблицю маршрутизації для нашої VPC
awslocal ec2 create-route-table --vpc-id <ВАШ_VPC_ID>

# З відповіді копіюємо RouteTableId (наприклад: rtb-0123456789abcdef0)

# 2. Додаємо маршрут, який направляє весь невідомий трафік (0.0.0.0/0) до Інтернет-шлюзу (який ми створили раніше)
awslocal ec2 create-route \
    --route-table-id <ВАШ_ROUTE_TABLE_ID> \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id <ВАШ_IGW_ID>

# Зверніть увагу: для Windows (PowerShell) запишіть команду вище в один рядок:
# awslocal ec2 create-route --route-table-id <ВАШ_ROUTE_TABLE_ID> --destination-cidr-block 0.0.0.0/0 --gateway-id <ВАШ_IGW_ID>

# 3. Прив'язуємо цю таблицю маршрутизації до нашої підмережі
awslocal ec2 associate-route-table \
    --route-table-id <ВАШ_ROUTE_TABLE_ID> \
    --subnet-id <ВАШ_SUBNET_ID>

# Для Windows (PowerShell):
# awslocal ec2 associate-route-table --route-table-id <ВАШ_ROUTE_TABLE_ID> --subnet-id <ВАШ_SUBNET_ID>
````

Цей конкретний приклад показує, як за допомогою декількох команд ми будуємо складну мережеву топологію: ми щойно перетворили ізольовану частину мережі на публічну зону (DMZ), куди тепер можна безпечно виставляти веб-сервери, залишаючи бази даних в інших (приватних) підмережах цієї ж VPC.

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

```

```
