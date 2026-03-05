# Лабораторна робота №5 (2 години)

**Тема:** Хмарне зберігання даних: об'єктне та блочне сховище.

Створення та налаштування Amazon S3 або Oracle Cloud Object Storage; завантаження, організація та управління доступом до об'єктів; налаштування версіонування та політик життєвого циклу; підключення блочного сховища до VM.

**Мета:** Набути практичні навички роботи з різними типами хмарних сховищ — об'єктним та блочним; навчитися керувати доступом до даних, налаштовувати версіонування та розуміти цінову модель зберігання у хмарі.

**Технологічний стек:**

- **Oracle Cloud Object Storage** (рекомендовано) — 20 GB Always Free без обмеження часу
- **AWS S3** (альтернатива) — 5 GB безкоштовно в рамках Free Tier (12 місяців)
- **AWS CLI / OCI CLI** — для операцій через командний рядок
- **VM з Лабораторної №4** — для підключення Block Volume

---

## Завдання

1. Створити об'єктний кошик (bucket) та завантажити файли різних типів
2. Налаштувати права доступу: публічний файл та приватний файл
3. Увімкнути версіонування та перевірити його роботу
4. Налаштувати базову політику life cycle (автоматичне видалення через N днів)
5. Підключити Block Volume до VM та ініціалізувати файлову систему
6. Порівняти вартість зберігання різних типів через ціновий калькулятор

---

## Хід виконання роботи

### Крок 1. Створення об'єктного кошика

#### Oracle Cloud Object Storage (рекомендовано)

1. ☰ → **Storage** → **Object Storage & Archive Storage** → **Buckets**
2. Натисніть **Create Bucket**
3. Заповніть:
   - **Bucket Name:** `lab05-bucket-<ваш логін>`
   - **Storage Tier:** Standard
   - **Versioning:** Enabled ✅
   - **Encryption:** Oracle managed keys (дефолт)
4. Натисніть **Create**

#### AWS S3 (альтернатива)

```bash
# Через CLI (bucket name — глобально унікальний)
aws s3 mb s3://lab05-bucket-$(whoami)-$(date +%s) --region eu-central-1

# Або через консоль: S3 → Create bucket
```

### Крок 2. Завантаження файлів

Підготуйте тестові файли:

```bash
# Створення тестових файлів
echo "Публічний файл — доступний всім" > public.txt
echo "Приватний файл — лише для власника" > private.txt
echo "<html><body><h1>Cloud Storage Lab</h1></body></html>" > index.html

# Зображення (або інший бінарний файл)
curl -o image.jpg https://picsum.photos/200/200
```

**Oracle Cloud — завантаження через CLI:**

```bash
# Встановіть NAMESPACE (ваш Object Storage namespace — у Profile → Tenancy → Object Storage Namespace)
NAMESPACE="<ваш namespace>"
BUCKET="lab05-bucket-<ваш логін>"

oci os object put --namespace $NAMESPACE --bucket-name $BUCKET --name public.txt --file public.txt
oci os object put --namespace $NAMESPACE --bucket-name $BUCKET --name private.txt --file private.txt
oci os object put --namespace $NAMESPACE --bucket-name $BUCKET --name index.html --file index.html
oci os object put --namespace $NAMESPACE --bucket-name $BUCKET --name image.jpg --file image.jpg

# Список об'єктів у кошику
oci os object list --namespace $NAMESPACE --bucket-name $BUCKET
```

**AWS S3 — завантаження через CLI:**

```bash
BUCKET="lab05-bucket-$(whoami)"

aws s3 cp public.txt s3://$BUCKET/public.txt
aws s3 cp private.txt s3://$BUCKET/private.txt
aws s3 cp index.html s3://$BUCKET/index.html
aws s3 cp image.jpg s3://$BUCKET/image.jpg

aws s3 ls s3://$BUCKET/
```

### Крок 3. Налаштування прав доступу

#### Публічний об'єкт

**AWS S3:**

```bash
# Вимкнути Block Public Access для кошика (у консолі: S3 → bucket → Permissions → Block public access → Edit)
# Потім встановити ACL публічного читання для файлу:
aws s3api put-object-acl --bucket $BUCKET --key public.txt --acl public-read

# Перевірити публічний доступ:
curl https://$BUCKET.s3.eu-central-1.amazonaws.com/public.txt
```

**Oracle Cloud:**

- Bucket → **Edit Visibility** → **Public** (для публічного дозволу на весь кошик)
- Або: налаштуйте Pre-Authenticated Request (PAR) для конкретного об'єкта

Отримайте URL для `public.txt` та скопіюйте посилання. Відкрийте у браузері — файл має бути доступний без авторизації.

### Крок 4. Версіонування об'єктів

Завантажте оновлену версію файлу:

```bash
echo "Версія 2 — оновлений вміст" > public.txt
aws s3 cp public.txt s3://$BUCKET/public.txt

echo "Версія 3 — ще одне оновлення" > public.txt
aws s3 cp public.txt s3://$BUCKET/public.txt

# Переглянути всі версії
aws s3api list-object-versions --bucket $BUCKET --prefix public.txt
```

Відновіть конкретну версію:

```bash
# Отримайте VersionId з попередньої команди
aws s3api get-object \
  --bucket $BUCKET \
  --key public.txt \
  --version-id <VERSION_ID> \
  restored_v1.txt

cat restored_v1.txt
```

### Крок 5. Налаштування Lifecycle Policy

У AWS S3 консолі:

1. S3 → ваш bucket → **Management** → **Create lifecycle rule**
2. **Rule name:** `delete-old-versions`
3. **Filter:** Apply to all objects
4. **Lifecycle rule actions:**
   - ✅ Expire current versions of objects — after **30 days**
   - ✅ Permanently delete noncurrent versions — after **7 days**
5. Натисніть **Create rule**

**Або через CLI:**

```bash
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "delete-old-versions",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Expiration": {"Days": 30},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 7}
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET \
  --lifecycle-configuration file://lifecycle.json
```

### Крок 6. Підключення Block Volume до VM

> Виконується на основі VM з Лабораторної №4.

**Oracle Cloud — створення Block Volume:**

1. ☰ → **Storage** → **Block Storage** → **Block Volumes** → **Create Block Volume**
2. **Name:** `lab05-block-vol`
3. **Size:** 50 GB (мінімум; частина Always Free квоти)
4. **Availability Domain:** той самий, що й ваша VM

**Прикріплення до VM:**

1. Block Volumes → `lab05-block-vol` → **Attached Instances** → **Attach to Instance**
2. Оберіть `lab04-vm`, тип підключення: **Paravirtualized**
3. Access: **Read/Write**

**Ініціалізація диску на VM (через SSH):**

```bash
# Переглянути всі диски
lsblk

# Знайти новий диск (зазвичай /dev/sdb або /dev/vdb)
sudo fdisk -l

# Форматування новий диск у ext4
sudo mkfs.ext4 /dev/sdb

# Створення точки монтування
sudo mkdir -p /mnt/data

# Монтування
sudo mount /dev/sdb /mnt/data

# Перевірка
df -h /mnt/data

# Запис тестових даних
echo "Block Storage Test" | sudo tee /mnt/data/test.txt
ls -la /mnt/data/

# Автоматичне монтування при старті системи
echo "/dev/sdb /mnt/data ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

### Крок 7. Порівняння вартості зберігання

Заповніть таблицю на основі цінових калькуляторів:

| Тип сховища               | Провайдер      | Вартість/GB/місяць | Free Tier      |
| ------------------------- | -------------- | ------------------ | -------------- |
| Object Storage (Standard) | AWS S3         | ~$0.023            | 5 GB / 12 міс  |
| Object Storage (Standard) | Oracle OCI     | ~$0.0255           | 20 GB завжди   |
| Object Storage (Cold)     | AWS S3 Glacier | ~$0.004            | —              |
| Block Storage (SSD)       | AWS EBS gp3    | ~$0.08             | 30 GB / 12 міс |
| Block Storage (SSD)       | Oracle OCI     | ~$0.0255           | 200 GB завжди  |

---

## Контрольні запитання

1. Чим відрізняється об'єктне (Object Storage), блочне (Block Storage) та файлове (File Storage) сховище? Коли який тип доцільно використовувати?
2. Що таке версіонування об'єктів у S3? Як воно захищає від випадкового видалення файлів?
3. Що таке Lifecycle Policy? Наведіть практичний приклад її застосування для оптимізації витрат.
4. Що таке Pre-Authenticated Request (PAR) або Presigned URL? Для чого вони використовуються?
5. Поясніть різницю між Storage Class у AWS S3: Standard, Intelligent-Tiering, Glacier. Як вибрати оптимальний?
6. Чому при видаленні VM блочний том (Block Volume) може зберегтись окремо? Що таке «detach» та «terminate»?

---

## Вимоги до звіту

1. Скриншот списку об'єктів у кошику після завантаження всіх файлів
2. Посилання на публічний об'єкт та скриншот його відкриття в браузері
3. Вивід команди перегляду версій об'єкта (3 версії)
4. Скриншот налаштованої Lifecycle Policy
5. Вивід `lsblk` та `df -h` після підключення Block Volume
6. Відповіді на контрольні запитання у файлі `lab05.md`
7. Посилання на GitHub надіслати в Classroom
