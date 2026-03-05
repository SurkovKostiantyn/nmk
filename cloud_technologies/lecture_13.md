# Лекція №13 (2 години). CI/CD та DevOps-практики у хмарі

## План лекції

1. Концепція DevOps та культура безперервної доставки
2. CI (Continuous Integration) та пайплайн автоматизації
3. CD (Continuous Delivery та Continuous Deployment)
4. Хмарні CI/CD-сервіси: AWS CodePipeline, Azure DevOps, Google Cloud Build
5. Стратегії деплойменту: Rolling, Blue/Green, Canary

## Перелік умовних скорочень

Списком

- **CI** — Continuous Integration — безперервна інтеграція
- **CD** — Continuous Delivery / Deployment — безперервна доставка/розгортання
- **DevOps** — Development + Operations — методологія розробки
- **IaC** — Infrastructure as Code — інфраструктура як код
- **DORA** — DevOps Research and Assessment — дослідницька організація
- **PR** — Pull Request — запит на злиття гілки
- **VCS** — Version Control System — система контролю версій
- **SAST** — Static Application Security Testing — статичний аналіз безпеки
- **DAST** — Dynamic Application Security Testing — динамічний аналіз безпеки
- **SCA** — Software Composition Analysis — аналіз залежностей
- **ECR** — Elastic Container Registry — реєстр контейнерів AWS
- **ECS** — Elastic Container Service
- **EKS** — Elastic Kubernetes Service
- **MTTR** — Mean Time To Recovery — середній час відновлення
- **DF** — Deployment Frequency — частота деплойментів

---

## Вступ

DevOps — це культура, що зближує розробку (Dev) та операції (Ops) для прискорення доставки програмного забезпечення без жертви якістю та надійністю. CI/CD є технологічним втіленням DevOps: автоматизований пайплайн, що перетворює кожну зміну коду на Production-готовий артефакт. Хмарні провайдери пропонують повністю інтегровані CI/CD-платформи, що усувають потребу у самостійному хостингу Jenkins та подібних інструментів.

---

## 1. DevOps: концепція та метрики

### 1.1 Визначення DevOps

**DevOps** — культурний та технічний рух, що об'єднує практики розробки, безпеки та операційної діяльності з метою скорочення циклу доставки програмного забезпечення при збереженні або підвищенні його надійності.

**Ключові принципи DevOps:**

- **Flow**: всебічне прискорення потоку змін від ідеї до Production
- **Feedback**: швидкий зворотній зв'язок про якість та роботоздатність
- **Continuous Learning**: культура постійного вдосконалення, що базується на даних

### 1.2 DORA Metrics — чотири ключові метрики

Організація DORA (DevOps Research and Assessment, тепер частина Google) визначила 4 ключові показники ефективності DevOps:

| Метрика                       | Elite performers  |        High        |       Medium       |         Low         |
| ----------------------------- | :---------------: | :----------------: | :----------------: | :-----------------: |
| **Deployment Frequency (DF)** | Кілька разів/день | Раз/тиждень–місяць | Раз/місяць–квартал | Раз/квартал і рідше |
| **Lead Time for Changes**     |    < 1 години     |  1 день–1 тиждень  | 1 тиждень–1 місяць |     > 6 місяців     |
| **Change Failure Rate (CFR)** |       0–15%       |       16–30%       |       16–30%       |       46–60%        |
| **MTTR**                      |    < 1 години     |      < 1 дня       |  1 день–1 тиждень  |     > 6 місяців     |

_Висновок DORA:_ Elite DevOps-команди випускають **46× частіше** і відновлюються після інцидентів **2604× швидше**, ніж Low-performers.

---

## 2. Continuous Integration (CI)

### 2.1 Концепція CI

**Continuous Integration (CI)** — практика, за якої розробники **часто** (кілька разів на день) інтегрують свій код у спільну гілку, а кожна інтеграція автоматично перевіряється збіркою та тестами.

**CI Pipeline — типові кроки:**

```
git push → Trigger
  │
  ├── 1. Source Checkout (клонування репозиторію)
  ├── 2. Install Dependencies (npm install / pip install)
  ├── 3. Lint & Code Style (ESLint, flake8, gofmt)
  ├── 4. SAST (static security: SonarQube, Semgrep, Snyk)
  ├── 5. Unit Tests (pytest, JUnit, Jest)
  ├── 6. Integration Tests
  ├── 7. Build (docker build, maven package)
  ├── 8. Container Scanning (Trivy, ECR Scan)
  └── 9. Push Artifact to Registry (ECR, DockerHub)
```

**«Fail Fast» принцип:** швидкі перевірки (lint, unit tests) виконуються першими. Якщо вони впали — не витрачаємо час на повільні інтеграційні тести.

### 2.2 GitHub Actions

**GitHub Actions** — найпопулярніша CI/CD платформа, інтегрована у GitHub.

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run linting
        run: flake8 src/ tests/

      - name: Run tests with coverage
        run: pytest --cov=src tests/ --cov-report=xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          docker build -t $ECR_REGISTRY/myapp:$GITHUB_SHA .
          docker push $ECR_REGISTRY/myapp:$GITHUB_SHA
```

---

## 3. Continuous Delivery та Deployment (CD)

### 3.1 Continuous Delivery vs Continuous Deployment

**Continuous Delivery (CD):**

- Кожна зміна **автоматично** проходить через всі тести та готова до Production
- Деплоймент у Production потребує **ручного підтвердження**

**Continuous Deployment:**

- Кожна зміна **автоматично деплоїться в Production** без ручного втручання
- Вищий рівень автоматизації та довіри до тестового покриття

### 3.2 AWS Developer Tools — повний CI/CD стек

**AWS CodePipeline** — оркестратор пайплайну:

```
Source (CodeCommit/Github)
  │
  ▼ CodeBuild (build & test)
  │
  ▼ Manual Approval (опціонально)
  │
  ▼ CodeDeploy (deploy to EC2/ECS/Lambda)
```

**AWS CodeBuild** — керований сервіс збірки:

- Виконує команди у Docker-контейнерах (налаштовуються через `buildspec.yml`)
- Автоматично масштабує та не вимагає управління серверами збірки
- Підтримує кеш залежностей (npm, maven, pip)

**AWS CodeDeploy** — автоматизований деплоймент на EC2, Lambda або ECS:

- Rolling, Blue/Green деплоймент
- Автоматичний rollback при перевищенні порогу помилок

### 3.3 Azure DevOps

**Azure DevOps** — повна DevOps-платформа Microsoft (Boards, Repos, Pipelines, Artifacts, Test Plans):

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]

pool:
  vmImage: "ubuntu-latest"

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: Docker@2
            inputs:
              command: "buildAndPush"
              repository: "myapp"
              containerRegistry: "myACR"

  - stage: Deploy
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: "production"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@1
                  inputs:
                    action: "deploy"
                    manifests: "$(Pipeline.Workspace)/drop/*.yaml"
```

### 3.4 Google Cloud Build

**Google Cloud Build** — серверний CI/CD-сервіс GCP.

Особливість: кожен крок пайплайну — Docker-образ. Можна використовувати будь-який Docker-образ як кроку.

---

## 4. Стратегії деплойменту

### 4.1 Rolling Deployment (Поступовий)

```
v1 v1 v1 v1 v1  →  v2 v1 v1 v1 v1  →  v2 v2 v1 v1 v1  →  v2 v2 v2 v2 v2
```

- Поступово замінює старі інстанси новими
- Мінімальне додаткове споживання ресурсів
- Недолік: одночасно у production є дві версії → потребує backward-compatible API

### 4.2 Blue/Green Deployment

```
Blue (v1) ────── prod traffic ──── [ALB]
Green (v2) ────── тестування       [ALB]
                                     │
                     Switch traffic  ▼
Blue (v1) ────── (резерв для rollback)
Green (v2) ────── prod traffic ──── [ALB]
```

- Нульовий downtime
- Швидкий rollback (переключення назад)
- Недолік: подвоєна вартість інфраструктури під час деплойменту

### 4.3 Canary Deployment

```
Canary: v2 (5% трафіку) ──► моніторинг: error rate, latency
Main:   v1 (95% трафіку)

Якщо метрики OK:
Canary: v2 (25% трафіку)
Canary: v2 (50% трафіку)
Canary: v2 (100% трафіку) → деплоймент завершено
```

- Мінімальний ризик: новий код бачить лише мала частина користувачів
- AWS CodeDeploy, Argo Rollouts підтримують canary деплоймент
- Feature Flags (LaunchDarkly, AWS AppConfig) — альтернативний підхід до canary

### 4.4 GitOps — деклараційне управління деплойментом

**GitOps** — підхід, за якого Git-репозиторій є єдиним джерелом істини для стану інфраструктури та застосунку:

1. Розробник робить PR із зміною K8s-маніфесту
2. Після approve + merge → GitOps-агент (ArgoCD, Flux) автоматично синхронізує кластер
3. Відкочення = revert Git-комітa

**ArgoCD** — найпопулярніший GitOps-оператор для Kubernetes.

---

## Висновки

1. **DevOps** — культура та набір практик, що прискорює доставку при збереженні надійності. DORA Metrics дозволяють об'єктивно виміряти ефективність DevOps-трансформації.

2. **CI Pipeline** автоматично перевіряє якість кожної зміни: lint, тести, security scanning, збірка артефакту. «Fail Fast» принцип мінімізує час отримання зворотного зв'язку.

3. **CD Pipeline** автоматизує доставку верифікованих артефактів у середовища. Continuous Delivery (з ручним підтвердженням Production) та Continuous Deployment (повністю автоматично) — два рівні зрілості.

4. **Стратегії деплойменту** (Rolling, Blue/Green, Canary) дозволяють знизити ризик під час оновлень. Canary є найбезпечнішим, але найскладнішим; Blue/Green — простим і передбачуваним.

5. **GitOps** (ArgoCD) робить Git єдиним джерелом істини для стану K8s-кластера — будь-яка «дрейф» конфігурації автоматично виправляється.

---

## Джерела

1. Kim, G., Humble, J., Debois, P., & Willis, J. (2016). _The DevOps Handbook_. IT Revolution Press.
2. Humble, J., & Farley, D. (2010). _Continuous Delivery_. Addison-Wesley.
3. DORA Research Program. (2023). _State of DevOps Report_. Google Cloud.
4. AWS Documentation. (2024). _AWS CodePipeline User Guide_. https://docs.aws.amazon.com/codepipeline/
5. Weaveworks. (2020). _Guide to GitOps_. https://www.weave.works/technologies/gitops/
6. GitHub. (2024). _GitHub Actions Documentation_. https://docs.github.com/en/actions

---

## Запитання для самоперевірки

1. Що таке DevOps і які три ключові принципи він включає?
2. Назвіть чотири DORA-метрики. Що вони вимірюють і чому вони важливі?
3. Що таке CI? Опишіть типовий CI Pipeline (5+ кроків) із прикладом.
4. Чим Continuous Delivery відрізняється від Continuous Deployment?
5. Що таке `buildspec.yml` в AWS CodeBuild та `azure-pipelines.yml`?
6. Поясніть стратегію Blue/Green Deployment. Яку перевагу вона дає над Rolling?
7. Що таке Canary Deployment? Як 5% трафіку на нову версію допомагає знизити ризик?
8. Що таке GitOps? Яку роль виконує ArgoCD в GitOps-workflow?
9. Як security scanning (SAST, Container Scanning) інтегрується в CI Pipeline?
10. Що таке Feature Flags? Чим вони відрізняються від Canary Deployment?
