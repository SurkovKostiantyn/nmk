# Лабораторна робота №4 (2 години)

**Тема:** Розгортання та управління віртуальними машинами.

Створення та запуск віртуальних машин на Oracle Cloud Free Tier або AWS EC2; вибір типу та розміру екземпляра; підключення через SSH; налаштування автоматичного масштабування та груп доступності.

**Мета:** Набути практичні навички створення, конфігурації та управління хмарними віртуальними машинами, підключення до них через SSH, встановлення програмного забезпечення та розуміння концепцій масштабування.

**Технологічний стек:**

- **Oracle Cloud Free Tier** (рекомендовано) — VM.Standard.E2.1.Micro, Always Free
- **AWS EC2** (альтернатива) — t2.micro / t3.micro, Free Tier (12 місяців)
- **SSH-клієнт**: OpenSSH (Linux/macOS), PuTTY або Windows Terminal (Windows)
- **Nginx** — веб-сервер для тестування

---

## Завдання

1. Створити SSH-ключову пару для підключення до VM
2. Запустити хмарну VM та підключитись до неї через SSH
3. Встановити та запустити Nginx-сервер на VM
4. Переглянути метрики споживання ресурсів VM у хмарній консолі
5. Зупинити та знову запустити VM; дослідити зміну IP-адреси
6. (Додатково) Настроїти AWS Auto Scaling Group або ознайомитись із концепцією

---

## Хід виконання роботи

### Крок 1. Створення SSH-ключової пари

**Linux / macOS:**

```bash
# Генерація ключової пари RSA 4096-bit
ssh-keygen -t rsa -b 4096 -C "lab04-cloud-key" -f ~/.ssh/lab04_key

# Переглянути публічний ключ (він знадобиться при створенні VM)
cat ~/.ssh/lab04_key.pub
```

**Windows (PowerShell):**

```powershell
ssh-keygen -t rsa -b 4096 -C "lab04-cloud-key" -f "$env:USERPROFILE\.ssh\lab04_key"
Get-Content "$env:USERPROFILE\.ssh\lab04_key.pub"
```

Збережіть вміст публічного ключа — він буде вставлений при створенні VM.

### Крок 2. Створення та запуск VM в Oracle Cloud

1. У консолі Oracle Cloud: ☰ → **Compute** → **Instances** → **Create instance**
2. **Name:** `lab04-vm`
3. **Image and shape:**
   - **Image:** Ubuntu 22.04 (або Oracle Linux 8)
   - **Shape:** VM.Standard.E2.1.Micro (Always Free)
4. **Networking:**
   - VCN: використайте існуючий або оберіть дефолтний
   - Subnet: публічна підмережа
   - Public IP: **Assign automatically**
5. **Add SSH keys:**
   - Вставте вміст `lab04_key.pub`
6. Натисніть **Create**

Зачекайте ~2 хвилини поки статус зміниться на **Running** та з'явиться Public IP.

### Крок 3. Підключення до VM через SSH

```bash
# Надаємо правильні права на приватний ключ
chmod 400 ~/.ssh/lab04_key

# Підключення (Oracle Cloud: default user = ubuntu або opc)
ssh -i ~/.ssh/lab04_key ubuntu@<PUBLIC_IP>

# Якщо Oracle Linux:
ssh -i ~/.ssh/lab04_key opc@<PUBLIC_IP>
```

Після підключення дослідіть систему:

```bash
# Інформація про систему
uname -a
cat /etc/os-release

# Ресурси (CPU, RAM, диск)
nproc              # кількість процесорів
free -h            # використання пам'яті
df -h              # використання дискового простору
uptime             # час роботи системи
```

### Крок 4. Встановлення та запуск Nginx

```bash
# Оновлення пакетів та встановлення Nginx
sudo apt update && sudo apt install -y nginx   # Ubuntu
# або:
sudo yum install -y nginx                       # Oracle Linux

# Запуск та увімкнення автостарту
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx

# Перевірка локально
curl http://localhost
```

**Відкрийте порт 80 у Security List / Security Group:**

- Oracle Cloud: VCN → Security List → додати Ingress Rule: TCP, Source `0.0.0.0/0`, Port 80
- AWS: EC2 → Security Group → Inbound Rules → Add Rule: HTTP, `0.0.0.0/0`

Відкрийте у браузері: `http://<PUBLIC_IP>` — ви маєте побачити сторінку привітання Nginx.

Створіть власну HTML-сторінку:

```bash
echo "<h1>Lab 04 — Cloud VM by $(whoami)</h1><p>IP: $(curl -s ifconfig.me)</p>" | sudo tee /var/www/html/index.html
```

### Крок 5. Моніторинг метрик VM

**Oracle Cloud:**

- ☰ → Compute → Instances → `lab04-vm` → вкладка **Metrics**
- Перегляньте графіки: CPU Utilization, Memory Utilization, Network Bytes In/Out

**AWS:**

- EC2 → Instances → оберіть інстанцію → вкладка **Monitoring**
- Вкладка **CloudWatch metrics** — CPU, NetworkIn/Out, DiskReadBytes

Запустіть навантаження для спостереження за метриками:

```bash
# Навантаження CPU на 30 секунд
yes > /dev/null &
sleep 30 && kill %1
```

Спостерігайте за зміною CPU на графіку метрик (може знадобитись ~1 хвилина для відображення).

### Крок 6. Зупинка, запуск та зміна IP-адреси

```bash
# Запишіть поточну публічну IP-адресу
curl -s ifconfig.me
```

У консолі хмари:

1. Зупиніть VM: **Stop** (статус → Stopped)
2. Зачекайте 1–2 хвилини
3. Запустіть знову: **Start** (статус → Running)
4. Порівняйте нову публічну IP з попередньою

> **Спостереження:** У більшості провайдерів динамічна публічна IP-адреса **змінюється** після зупинки/старту VM. Для постійної IP потрібне виділення статичної (Elastic IP в AWS, Reserved IP в OCI).

### Крок 7 (Додатково). Концепція Auto Scaling

В AWS консолі ознайомтеся з Auto Scaling Groups:

- EC2 → Auto Scaling → **Launch Templates** → Create launch template
- EC2 → Auto Scaling → **Auto Scaling Groups** → Create

Ключові параметри, які слід вивчити:

- **Minimum / Maximum / Desired capacity** — межі масштабування
- **Scaling policies** — умови збільшення або зменшення кількості інстанцій
- **Target tracking** — підтримка цільового рівня метрики (наприклад, CPU 70%)

---

## Контрольні запитання

1. Що таке AMI (Amazon Machine Image) або Cloud Image? Яку роль він відіграє при створенні VM?
2. Поясніть різницю між типами EC2-інстанцій у AWS (t, m, c, r-серії). Для чого кожен тип оптимізований?
3. Чому публічна IP-адреса змінюється після зупинки та повторного запуску VM? Як зберегти постійну адресу?
4. Що таке Auto Scaling? Поясніть різницю між горизонтальним (scale out) та вертикальним (scale up) масштабуванням.
5. Що таке Spot Instance (AWS) або Preemptible VM (Google Cloud)? Коли їх вигідно використовувати?
6. Чому важливо правильно налаштувати Security Group / Security List перед запуском VM у хмарі?

---

## Вимоги до звіту

1. Скриншот успішного підключення через SSH (`ssh ubuntu@<IP>`)
2. Вивід команд `uname -a`, `free -h`, `df -h` з VM
3. Скриншот сторінки Nginx у браузері (з вашим текстом)
4. Скриншот метрик CPU VM під навантаженням та без
5. Порівняння Public IP до та після зупинки/запуску VM
6. Відповіді на контрольні запитання у файлі `lab04.md`
7. Посилання на GitHub або файли матеріалів надіслати в Classroom
