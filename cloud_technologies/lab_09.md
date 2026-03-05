# Лабораторна робота №9 (2 години)

**Тема:** Моніторинг та логування хмарної інфраструктури.

Налаштування CloudWatch або Azure Monitor для збору метрик і логів; створення дашбордів та алертів; налаштування централізованого логування; аналіз інцидентів на основі метрик та журналів подій.

**Мета:** Набути практичні навички налаштування моніторингу та логування хмарної інфраструктури, створення алертів і дашбордів, а також аналізу зібраних даних для виявлення та усунення проблем.

**Технологічний стек:**

- **AWS CloudWatch** або **Oracle Cloud Monitoring** — хмарний моніторинг
- **CloudWatch Agent** — збір метрик ОС та логів з VM
- **Amazon SNS** — сервіс сповіщень (email/SMS)
- **VM з Лабораторної №4** — об'єкт моніторингу

---

## Завдання

1. Переглянути базові метрики VM у хмарній консолі
2. Встановити CloudWatch Agent / Monitoring Agent для збору розширених метрик
3. Налаштувати збір логів застосунку у хмарне сховище
4. Створити Alarm (алерт) при перевищенні порогу CPU
5. Налаштувати сповіщення через email (SNS)
6. Створити Dashboard з ключовими метриками
7. Змоделювати навантаження та перевірити спрацювання алерту

---

## Хід виконання роботи

### Крок 1. Базові метрики у AWS CloudWatch

1. У AWS Console → **CloudWatch** → **Metrics** → **All metrics**
2. Виберіть namespace **EC2** → **Per-Instance Metrics**
3. Знайдіть ваш EC2 instance та перегляньте метрики:
   - `CPUUtilization` — завантаження процесора
   - `NetworkIn / NetworkOut` — мережевий трафік
   - `DiskReadOps / DiskWriteOps` — операції з диском
4. Виберіть `CPUUtilization` → **Add to graph**
5. Змініть часовий діапазон на **Last 1 hour**

> **Зверніть увагу:** Базові EC2-метрики CloudWatch оновлюються кожні 5 хвилин безкоштовно. Detailed monitoring (1 хвилина) — платний.

### Крок 2. Встановлення CloudWatch Agent на VM

Підключіться до вашої VM (з Лаб. №4):

```bash
ssh -i ~/.ssh/lab04_key ubuntu@<PUBLIC_IP>
```

**Встановлення агента:**

```bash
# Завантаження та встановлення
sudo apt update
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

**Надання IAM-ролі EC2-інстанції:**

1. EC2 → ваша інстанція → **Actions** → **Security** → **Modify IAM role**
2. Якщо ролі немає: IAM → **Roles** → **Create role** → EC2 → прикріпити `CloudWatchAgentServerPolicy`
3. Прикріпіть роль до EC2

**Конфігурація агента:**

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
# Дайте відповіді на запитання:
# - OS: linux
# - StatsD daemon: no
# - collectd: no
# - Metrics to monitor: memory, disk
# - Log files: yes → /var/log/nginx/access.log та /var/log/nginx/error.log
```

Або створіть конфігурацію вручну `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`:

```json
{
  "metrics": {
    "namespace": "Lab09/CustomMetrics",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/lab09/nginx/access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/lab09/nginx/error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

**Запуск агента:**

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Перевірка статусу
sudo systemctl status amazon-cloudwatch-agent
```

### Крок 3. Перегляд логів у CloudWatch

1. CloudWatch → **Log groups**
2. Знайдіть `/lab09/nginx/access` — логи Nginx
3. Клацніть на Log Group → Log Stream → перегляньте записи

**Надсилання тестових запитів для генерації логів:**

```bash
# Надішліть 20 запитів до Nginx (або виконайте з іншого терміналу)
for i in {1..20}; do curl -s http://<PUBLIC_IP> > /dev/null; done

# Запит до неіснуючої сторінки (генерує 404 в error.log)
curl http://<PUBLIC_IP>/not-found
```

**Пошук у LogInsights:**

- CloudWatch → **Logs Insights** → оберіть `/lab09/nginx/access`

```sql
fields @timestamp, @message
| filter @message like /GET/
| sort @timestamp desc
| limit 20
```

### Крок 4. Створення Alarm (алерту)

1. CloudWatch → **Alarms** → **Create alarm**
2. **Select metric** → EC2 → Per-Instance Metrics → `CPUUtilization`
3. **Conditions:**
   - Threshold type: Static
   - Whenever CPUUtilization is: **Greater than** `70` (%)
   - For: 1 out of 1 datapoints
4. **Configure actions:**
   - Alarm state trigger: **In alarm**
   - Notification: **Create new SNS topic**
   - Topic name: `lab09-cpu-alert`
   - Email: ваша адреса (підтвердіть підписку в листі)
5. **Name:** `lab09-high-cpu`
6. Натисніть **Create alarm**

### Крок 5. Моделювання навантаження та перевірка алерту

```bash
# На VM — генерація навантаження CPU
stress --cpu 1 --timeout 300 &
# Якщо stress не встановлений:
sudo apt install -y stress

# Або без додаткових пакетів:
yes > /dev/null &
STRESS_PID=$!
echo "Навантаження PID: $STRESS_PID"
echo "Зупиніть через 5 хв: kill $STRESS_PID"
```

Спостерігайте у CloudWatch:

- CloudWatch → Alarms → `lab09-high-cpu` — стан має змінитися на **In alarm**
- Перевірте email — ви маєте отримати сповіщення від SNS

Зупиніть навантаження:

```bash
kill $STRESS_PID
```

### Крок 6. Створення Dashboard

1. CloudWatch → **Dashboards** → **Create dashboard**
2. **Dashboard name:** `Lab09-Monitoring`
3. Додайте widgets:
   - **Line** → EC2 CPUUtilization
   - **Number** → EC2 NetworkIn + NetworkOut
   - **Line** → Lab09/CustomMetrics → mem_used_percent (якщо агент налаштований)
   - **Logs table** → /lab09/nginx/access (останні 10 рядків)
4. Натисніть **Save dashboard**

---

## Контрольні запитання

1. Що таке метрика (metric) у контексті хмарного моніторингу? Наведіть 5 прикладів важливих метрик для веб-сервісу.
2. Чим відрізняється метрика від логу? Коли який підхід є більш доцільним для виявлення проблем?
3. Що таке Amazon SNS? Назвіть типи endpoints, які підтримує SNS для надсилання сповіщень.
4. Поясніть концепцію SLI, SLO та SLA у контексті моніторингу та управління сервісами.
5. Що таке алерт (Alarm) у CloudWatch? З яких компонентів він складається (метрика, поріг, дія)?
6. Що таке MTTD (Mean Time To Detect) та MTTR (Mean Time To Recover)? Як моніторинг впливає на ці показники?

---

## Вимоги до звіту

1. Скриншот графіку CPUUtilization під навантаженням у CloudWatch Metrics
2. Скриншот логів Nginx у CloudWatch Log Insights
3. Скриншот налаштованого Alarm (`lab09-high-cpu`) у стані **In alarm** (з навантаженням)
4. Скриншот або текст email-сповіщення від SNS
5. Скриншот створеного Dashboard з не менш ніж 3 widgets
6. Відповіді на контрольні запитання у файлі `lab09.md`
7. Посилання на GitHub або файли матеріалів надіслати в Classroom
