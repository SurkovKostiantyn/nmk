# Лекція №7 (2 години). Контейнеризація та оркестрація в IaaS

## План лекції

1. Концепція контейнеризації та порівняння з VM
2. Docker: архітектура, образи та контейнери
3. Реєстри контейнерів та управління образами
4. Оркестрація контейнерів: Kubernetes (K8s)
5. Хмарні керовані Kubernetes-сервіси: EKS, AKS, GKE

## Перелік умовних скорочень

Списком

- **VM** — Virtual Machine — віртуальна машина
- **OS** — Operating System — операційна система
- **CLI** — Command Line Interface — інтерфейс командного рядка
- **CI/CD** — Continuous Integration / Continuous Delivery
- **K8s** — Kubernetes (скорочена назва)
- **EKS** — Elastic Kubernetes Service — керований Kubernetes від AWS
- **AKS** — Azure Kubernetes Service — керований Kubernetes від Azure
- **GKE** — Google Kubernetes Engine — керований Kubernetes від GCP
- **ECR** — Elastic Container Registry — реєстр контейнерів AWS
- **Pod** — мінімальна одиниця розгортання в Kubernetes
- **HPA** — Horizontal Pod Autoscaler — горизонтальний автоскейлер Pod
- **YAML** — Yet Another Markup Language — формат конфігурації
- **API** — Application Programming Interface
- **CPU** — Central Processing Unit
- **ECS** — Elastic Container Service — сервіс контейнерів AWS (без K8s)

---

## Вступ

Контейнеризація стала однією з найважливіших технологій хмарної ери. Docker, випущений у 2013 році, революціонізував спосіб пакування та постачання застосунків, усунувши вічну проблему «у мене на локальному середовищі працює». Kubernetes, відкритий Google у 2014 році, вирішив проблему оркестрації сотень і тисяч контейнерів у production-середовищах.

Сьогодні контейнери та K8s є основою для переважної більшості хмарних застосунків — від стартапів до Fortune 500.

---

## 1. Концепція контейнеризації та порівняння з VM

### 1.1 Проблема, яку вирішують контейнери

Класична проблема розробки:

> «На моєму ноутбуці (Ubuntu 20.04, Python 3.9, бібліотека X версії 2.1) застосунок працює. На production-сервері (CentOS 7, Python 3.6, бібліотека X версії 1.9) — не запускається.»

Рішення: **упакувати застосунок разом з усіма його залежностями** в ізольований, портативний пакет — **контейнер**.

### 1.2 VM vs Контейнери

```
┌─────────── Віртуальна машина ──────────────┐   ┌────────── Контейнер ─────────────────────┐
│                                             │   │                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐             │   │  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │ App A│  │ App B│  │ App C│             │   │  │ App A│  │ App B│  │ App C│           │
│  ├──────┤  ├──────┤  ├──────┤             │   │  ├──────┤  ├──────┤  ├──────┤           │
│  │ Libs │  │ Libs │  │ Libs │             │   │  │ Libs │  │ Libs │  │ Libs │           │
│  ├──────┤  ├──────┤  ├──────┤             │   │  └──────┘  └──────┘  └──────┘           │
│  │Guest │  │Guest │  │Guest │             │   │  ┌──────────────────────────────────┐   │
│  │  OS  │  │  OS  │  │  OS  │             │   │  │     Container Runtime (Docker)   │   │
│  └──────┘  └──────┘  └──────┘             │   │  └──────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │   │  ┌──────────────────────────────────┐   │
│  │          Hypervisor               │   │   │  │         Host OS (спільне)        │   │
│  └────────────────────────────────────┘   │   │  └──────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │   │  ┌──────────────────────────────────┐   │
│  │     Фізичне обладнання             │   │   │  │     Фізичне обладнання           │   │
│  └────────────────────────────────────┘   │   │  └──────────────────────────────────┘   │
└─────────────────────────────────────────────┘   └──────────────────────────────────────────┘
```

**Ключові відмінності:**

| Характеристика |          VM          |             Контейнер              |
| -------------- | :------------------: | :--------------------------------: |
| Власна ОС      |    Так (Guest OS)    |      Ні (спільне ядро хоста)       |
| Розмір диску   |   Гігабайти (з ОС)   | Мегабайти (лише застосунок + libs) |
| Час запуску    |       Хвилини        |    Секунди (навіть мілісекунди)    |
| Ізоляція       |   Повна (апаратна)   |  Процесна (namespaces + cgroups)   |
| Щільність      | Низька (3–5 VM/хост) | Висока (десятки–сотні контейнерів) |
| Портативність  |       Часткова       |      Висока ("run anywhere")       |

**Коли використовувати VM:** потрібна повна ізоляція, різні ОС, legacy-застосунки або безпечне оточення з вимогами до hardware-level isolation.

**Коли використовувати контейнери:** мікросервіси, CI/CD, швидке масштабування, максимальна щільність розміщення, DevOps.

### 1.3 Технологічна основа контейнерів в Linux

Контейнери не є новою технологією — вони спираються на функції Linux-ядра:

- **Namespaces (простори імен)**: ізоляція ресурсів (PID, мережа, файлова система, UTS/hostname, IPC, User)
- **cgroups (control groups)**: обмеження використання ресурсів (CPU, RAM, диск, мережа)
- **Union File Systems (OverlayFS)**: багатошарова файлова система — основа образів Docker

---

## 2. Docker: архітектура, образи та контейнери

### 2.1 Компоненти Docker

**Docker** — платформа для розробки, постачання та запуску контейнерів. Ключові компоненти:

- **Docker Engine** (демон `dockerd`): основний процес, що управляє контейнерами та образами
- **Docker CLI** (`docker`): інтерфейс командного рядка для взаємодії з Engine
- **Docker Hub**: публічний реєстр образів (hub.docker.com)
- **containerd**: низькорівневий runtime контейнерів (використовується Docker Engine та Kubernetes)

### 2.2 Docker Image (Образ)

**Образ Docker (Docker Image)** — незмінний (immutable) шаблон, що містить файлову систему контейнера. Образ будується пошарово:

```
┌────────────────────────────┐  ← Шар 4: APP (файли застосунку)
├────────────────────────────┤  ← Шар 3: pip install requirements.txt
├────────────────────────────┤  ← Шар 2: apt-get install python3
├────────────────────────────┤  ← Шар 1: Ubuntu 22.04 base image
└────────────────────────────┘  ← Base Layer (read-only)
```

**Переваги пошарової архітектури:**

- Шари кешуються: якщо шар не змінився, Docker не перебудовує його
- Спільні шари: 5 образів, що використовують однаковий Ubuntu-базовий шар, зберігають спільний шар лише один раз

### 2.3 Dockerfile

**Dockerfile** — текстовий файл з інструкціями для побудови Docker-образу:

```dockerfile
# Базовий образ
FROM python:3.11-slim

# Встановити робочу директорію
WORKDIR /app

# Копіювати та встановити залежності (окремий шар для кешування)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіювати код застосунку
COPY . .

# Відкрити порт
EXPOSE 8000

# Команда запуску
CMD ["python", "app.py"]
```

**Збірка та запуск:**

```bash
docker build -t myapp:1.0 .
docker run -p 8000:8000 --name my-container myapp:1.0
```

### 2.4 Ключові Docker-команди

| Категорія  | Команда                        | Опис                         |
| ---------- | ------------------------------ | ---------------------------- |
| Образи     | `docker build -t name:tag .`   | Зібрати образ                |
| Образи     | `docker images`                | Список локальних образів     |
| Образи     | `docker pull nginx:latest`     | Завантажити образ            |
| Образи     | `docker push myrepo/myapp:1.0` | Завантажити образ до реєстру |
| Контейнери | `docker run -d -p 80:80 nginx` | Запустити контейнер фоново   |
| Контейнери | `docker ps`                    | Список запущених контейнерів |
| Контейнери | `docker stop/start/rm <id>`    | Зупинити/запустити/видалити  |
| Контейнери | `docker exec -it <id> bash`    | Увійти в контейнер           |
| Логи       | `docker logs <id>`             | Переглянути логи             |

### 2.5 Docker Compose

**Docker Compose** — інструмент для визначення та запуску багатоконтейнерних застосунків через YAML-конфігурацію:

```yaml
version: "3.8"
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_PASSWORD=secret

volumes:
  pgdata:
```

```bash
docker compose up -d    # Запустити всі сервіси
docker compose down     # Зупинити та видалити
```

---

## 3. Реєстри контейнерів

### 3.1 Концепція Container Registry

**Реєстр контейнерів (Container Registry)** — централізоване сховище Docker-образів, звідки вони можуть бути завантажені на сервери або в K8s-кластери.

Аналогія: якщо Docker Hub — це GitHub для коду, то Container Registry — це GitHub для контейнерних образів.

### 3.2 Amazon ECR (Elastic Container Registry)

**Amazon ECR** — приватний реєстр контейнерних образів AWS:

- Інтегрований з IAM: авторизація через AWS-ролі
- Автоматичне сканування образів на вразливості (ECR Image Scanning + Amazon Inspector)
- **Lifecycle Policies**: автоматичне видалення старих образів
- Реплікація між регіонами
- Приватна пропускна здатність при роботі з ECS/EKS (без плати за трафік)

**Workflow з ECR:**

```bash
# Авторизація
aws ecr get-login-password | docker login --username AWS \
  --password-stdin 123456789.dkr.ecr.eu-central-1.amazonaws.com

# Tag та push
docker tag myapp:1.0 123456789.dkr.ecr.eu-central-1.amazonaws.com/myapp:1.0
docker push 123456789.dkr.ecr.eu-central-1.amazonaws.com/myapp:1.0
```

### 3.3 Інші реєстри

| Реєстр                             | Тип                   | Особливості                             |
| ---------------------------------- | --------------------- | --------------------------------------- |
| **Docker Hub**                     | Публічний + приватний | Найбільший публічний; безкоштовний tier |
| **AWS ECR**                        | Приватний             | Глибока інтеграція з AWS                |
| **Azure Container Registry (ACR)** | Приватний             | Інтеграція з AKS та Azure DevOps        |
| **Google Artifact Registry**       | Приватний             | Замінив GCR; підтримує npm, Maven, PyPI |
| **GitHub Container Registry**      | Публічний + приватний | Інтеграція з GitHub CI/CD               |

---

## 4. Оркестрація контейнерів: Kubernetes

### 4.1 Навіщо потрібна оркестрація?

Docker чудово запускає один або кілька контейнерів на одному хості. Але у production-середовищі:

- Потрібно запускати сотні контейнерів на **кількох хостах**
- Забезпечити **автоматичне відновлення** при відмові контейнера або хоста
- **Масштабувати** кількість контейнерів залежно від навантаження
- Здійснювати **rolling updates** без downtime
- Управляти **мережею** між контейнерами на різних хостах
- Розподіляти навантаження між контейнерами (**load balancing**)

Саме ці завдання вирішує **оркестратор контейнерів**.

### 4.2 Kubernetes: архітектура

**Kubernetes (K8s)** — відкрита (open-source) система оркестрації контейнерів, спочатку розроблена Google на основі внутрішньої системи Borg, передана CNCF у 2014 році.

**Архітектура K8s-кластера:**

```
┌────────────────────── Kubernetes Cluster ────────────────────────────┐
│                                                                       │
│  ┌────────────── Control Plane (Master) ───────────────────────────┐ │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐  │ │
│  │  │ API Server│  │ etcd (DB) │  │ Scheduler  │  │ Controller │  │ │
│  │  └───────────┘  └───────────┘  └────────────┘  │  Manager   │  │ │
│  │                                                  └────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────── Worker Node 1 ──────┐  ┌──────── Worker Node 2 ─────────┐ │
│  │  ┌──────┐ ┌──────┐         │  │  ┌──────┐ ┌──────┐            │ │
│  │  │ Pod  │ │ Pod  │         │  │  │ Pod  │ │ Pod  │            │ │
│  │  └──────┘ └──────┘         │  │  └──────┘ └──────┘            │ │
│  │  ┌──────────────────────┐   │  │  ┌──────────────────────────┐ │ │
│  │  │ kubelet + kube-proxy │   │  │  │ kubelet + kube-proxy     │ │ │
│  │  └──────────────────────┘   │  │  └──────────────────────────┘ │ │
│  └─────────────────────────────┘  └────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

**Компоненти Control Plane:**

- **API Server**: вхідна точка для всіх запитів до кластера (kubectl, CI/CD); RESTful API
- **etcd**: розподілена база даних «ключ-значення», що зберігає стан всього кластера
- **Scheduler**: вирішує, на якому Worker Node запустити новий Pod (враховує ресурси, affinity)
- **Controller Manager**: контролює стан кластера (забезпечує, що кількість Pod відповідає бажаному)

**Компоненти Worker Node:**

- **kubelet**: агент, що запускає та моніторить Pod на вузлі
- **kube-proxy**: мережева проксі для маршрутизації трафіку між Pod
- **Container Runtime**: containerd або Docker

### 4.3 Основні об'єкти Kubernetes

**Pod** — мінімальна одиниця розгортання K8s. Містить один або кілька контейнерів, що розділяють мережу та сховище.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

**Deployment** — декларативне управління кількома Pod (rolling updates, rollback):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: myapp:1.0
          ports:
            - containerPort: 8000
```

**Service** — стабільний мережевий endpoint для доступу до групи Pod:

- **ClusterIP**: доступний лише всередині кластера
- **NodePort**: доступний через порт кожного Node
- **LoadBalancer**: автоматично виділяє хмарний Load Balancer (ALB/NLB в AWS)

**ConfigMap та Secret:**

- ConfigMap: налаштування (конфіги, env-змінні) у форматі key-value
- Secret: конфіденційні дані (токени, паролі) у як base64-encoded

**Ingress:** правила маршрутизації HTTP(S)-трафіку до різних Services (аналог ALB з path-based routing).

### 4.4 Управління ресурсами

**Requests та Limits:**

- `requests`: мінімальні ресурси, що гарантуються Pod (використовується Scheduler)
- `limits`: максимальні ресурси, що Pod може використати (контейнер зупиняється при перевищенні RAM)

**HPA (Horizontal Pod Autoscaler):**
Автоматично масштабує кількість Pod залежно від навантаження:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-deployment
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

### 4.5 Rolling Updates та Rollbacks

**Rolling Update** — поступова заміна Pod із старою версією на нові без downtime:

```bash
# Оновити образ
kubectl set image deployment/web-deployment web=myapp:2.0

# Статус розгортання
kubectl rollout status deployment/web-deployment

# Відкат до попередньої версії
kubectl rollout undo deployment/web-deployment
```

Під час rolling update K8s одночасно замінює лише частину Pod (налаштовано через `maxSurge` та `maxUnavailable`), гарантуючи, що сервіс залишається доступним.

---

## 5. Хмарні керовані Kubernetes-сервіси

### 5.1 Навіщо керований K8s?

Самостійне розгортання та обслуговування Kubernetes-кластера вимагає значних зусиль:

- Встановлення та оновлення control plane
- Налаштування etcd-кластера з резервуванням
- Управління сертифікатами
- Оновлення K8s-версії

**Керовані K8s-сервіси** (EKS, AKS, GKE) беруть на себе управління control plane (API Server, etcd, Scheduler) — клієнт управляє лише Worker Nodes та робочими навантаженнями.

### 5.2 Amazon EKS (Elastic Kubernetes Service)

**Amazon EKS** — керований Kubernetes від AWS:

- AWS управляє Control Plane із garantованою доступністю 99.95%
- Клієнт управляє Worker Nodes (EC2-інстанси або EC2 Auto Scaling Groups)
- **EKS Managed Node Groups**: AWS автоматично оновлює та масштабує EC2-вузли
- **EKS Fargate**: запуск Pod без управління EC2 (serverless K8s)
- Інтеграція з AWS IAM, VPC, ELB, EBS, ECR

**EKS Fargate:**

```yaml
# Pod запускається на Fargate (без EC2-вузлів)
annotations:
  eks.amazonaws.com/fargate-profile: default
```

### 5.3 Azure AKS (Azure Kubernetes Service)

**Azure AKS** — керований Kubernetes від Azure:

- Безкоштовний Control Plane (оплачуються лише Worker VM)
- **Azure KEDA** (Kubernetes Event-Driven Autoscaling): масштабування на основі подій (черги, топіки)
- Інтеграція з Azure AD, ACR, Azure Monitor
- **AKS Virtual Nodes** (serverless режим через Azure Container Instances)

### 5.4 Google GKE (Google Kubernetes Engine)

**GKE** — «рідний» K8s-сервіс від творців Kubernetes:

- **Autopilot mode**: повністю автоматизоване управління кластером (Google оптимізує розміщення Pod)
- **Standard mode**: більше контролю над Worker Nodes
- GKE безперервно отримує нові K8s-функції першим
- **Workload Identity**: безпечний механізм IAM для Pod
- Найкраща інтеграція з K8s-екосистемою

### 5.5 Порівняльний аналіз EKS / AKS / GKE

| Критерій               |      EKS       |         AKS          |                     GKE                      |
| ---------------------- | :------------: | :------------------: | :------------------------------------------: |
| Вартість Control Plane |   $0.10/год    |     Безкоштовно      | $0.10/год (Standard) / $0.10/год (Autopilot) |
| Serverless режим       |  EKS Fargate   |    Virtual Nodes     |                  Autopilot                   |
| Зрілість K8s           |     Висока     |        Висока        |                   Найвища                    |
| Автооновлення          |    Частково    |         Так          |                     Так                      |
| Найкраще для           | AWS-екосистема | Microsoft-екосистема |             K8s-нативні проєкти              |

### 5.6 AWS ECS — альтернатива Kubernetes

**Amazon ECS (Elastic Container Service)** — власний (не K8s) оркестратор контейнерів AWS:

- Простіше, ніж K8s (менша крутизна кривої навчання)
- **ECS on EC2**: запуск на власних EC2-вузлах (більше контролю)
- **ECS on Fargate**: повністю serverless, без управління VM
- Глибша інтеграція з AWS-екосистемою, ніж EKS

_Коли ECS кращий за EKS:_ якщо потрібні контейнери в AWS без складності K8s; невеликі команди; використання Fargate як основного режиму.

---

## Висновки

1. **Контейнери** вирішують проблему середовищ та залежностей, упаковуючи застосунок з усіма залежностями в портативний, ізольований пакет. Вони набагато легші за VM (мегабайти vs гігабайти, секунди vs хвилини).

2. **Docker** є стандартом де-факто для побудови та запуску контейнерів. Dockerfile та шарова архітектура образів забезпечують відтворювані, ефективні та безпечні пакети.

3. **Kubernetes** є стандартом оркестрації для production-середовищ. Його декларативна модель, автовідновлення, rolling updates та HPA роблять його ідеальним для мікросервісних архітектур.

4. **Керовані сервіси** (EKS/AKS/GKE) значно спрощують роботу з K8s, беручи на себе управління Control Plane. GKE — лідер за K8s-зрілістю, AKS — безкоштовний control plane, EKS — кращий для AWS-екосистеми.

5. **ECS (Fargate)** є спрощеною альтернативою K8s для команд, що використовують AWS і не потребують повної складності Kubernetes.

---

## Джерела

1. Kubernetes Documentation. (2024). _Kubernetes Official Documentation_. https://kubernetes.io/docs/
2. Docker Documentation. (2024). _Docker Overview_. https://docs.docker.com/
3. AWS Documentation. (2024). _Amazon EKS User Guide_. https://docs.aws.amazon.com/eks/
4. Burns, B., Beda, J., & Hightower, K. (2022). _Kubernetes: Up and Running_ (3rd ed.). O'Reilly Media.
5. Rice, L. (2020). _Container Security_. O'Reilly Media.
6. CNCF. (2024). _Cloud Native Landscape_. https://landscape.cncf.io/
7. Google Cloud. (2024). _GKE Documentation_. https://cloud.google.com/kubernetes-engine/docs

---

## Запитання для самоперевірки

1. У чому ключова різниця між VM та контейнером з погляду ізоляції, розміру та часу запуску?
2. Які функції Linux-ядра (namespaces, cgroups) забезпечують роботу контейнерів?
3. Що таке Docker Image і як реалізована пошарова архітектура? Яку перевагу дає кешування шарів?
4. Для чого використовується `docker-compose`? Наведіть приклад застосунку, що складається з кількох сервісів.
5. Що таке Container Registry? Чим Amazon ECR відрізняється від Docker Hub з погляду безпеки?
6. Поясніть навіщо потрібна оркестрація. Які завдання вирішує Kubernetes, що неможливо вирішити одним Docker?
7. Назвіть та опишіть компоненти Control Plane Kubernetes. Яку роль виконує etcd?
8. Що таке Pod, Deployment та Service в Kubernetes? Якими є відносини між ними?
9. Як HPA (Horizontal Pod Autoscaler) масштабує застосунки? Що є метрикою масштабування?
10. Порівняйте EKS Fargate та ECS Fargate. Для яких команд і проєктів підходить кожен?
