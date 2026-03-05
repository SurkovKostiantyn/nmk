# Лекція №13 (2 години). CI/CD та DevOps-практики у хмарі

## План лекції

1. Концепція DevOps та культура безперервної доставки
2. CI (Continuous Integration) та пайплайн автоматизації
3. CD (Continuous Delivery та Continuous Deployment)
4. Хмарні CI/CD-сервіси: AWS CodePipeline, Azure DevOps, Google Cloud Build
5. Makefile як стандартизований інтерфейс DevOps
6. Стратегії деплойменту: Rolling, Blue/Green, Canary

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
- **Make** — утиліта автоматизації збірки (GNU Make)
- **Makefile** — файл з правилами для утиліти make
- **Phony target** — Make-ціль, що не є файлом (псевдоціль)

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

## 5. Makefile як стандартизований інтерфейс DevOps

### 5.1 Що таке Makefile і чому він актуальний у DevOps

**Make** — утиліта автоматизації збірки, що існує з 1976 року. Попри вік, вона стала **де-факто стандартом DevOps-інтерфейсу** для проєктів будь-якого розміру. Причина проста: Makefile дозволяє будь-якому новому розробнику або CI-системі запустити складну послідовність команд одним словом — `make build`, `make deploy`, `make test` — без необхідності читати README.

**Чому Makefile у CI/CD:**

- Єдиний point of entry: CI-пайплайн викликає `make ci`, а не десятки окремих команд
- Самодокументований: `make help` показує всі доступні цілі
- Незалежний від CI-платформи: однакові команди у GitHub Actions, Jenkins, локально
- Підтримує залежності між кроками: `make deploy` → спочатку `make build`

### 5.2 Синтаксис Makefile

```makefile
# Базовий синтаксис:
<ціль>: [залежності]
[TAB]<команда 1>
[TAB]<команда 2>
```

> ⚠️ **Критично важливо:** відступ перед командою — це **символ TAB** (не пробіли). Це найпоширеніша помилка при написанні Makefile.

**Ключові конструкції:**

```makefile
# Змінні
APP_NAME    := myapp
IMAGE_NAME  := $(APP_NAME):$(shell git rev-parse --short HEAD)
REGISTRY    := 123456789.dkr.ecr.us-east-1.amazonaws.com

# .PHONY — оголошення псевдоцілей (не файлів)
# Без .PHONY: якщо є файл з іменем 'build' — make не виконає ціль
.PHONY: build test deploy clean help

# Ціль з залежністю
deploy: build test
	$(MAKE) push
	$(MAKE) rollout

# Ціль з умовою
check-env:
	@test -n "$(AWS_REGION)" || (echo "ERROR: AWS_REGION не встановлено" && exit 1)

# Автодокументування через коментарі ##
help: ## Показати доступні команди
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	 awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

### 5.3 Makefile для DevOps-проєкту

**Повний Makefile для хмарного проєкту (Terraform + Docker + K8s):**

```makefile
# =============================================================================
# Налаштування
# =============================================================================
APP_NAME    := myapp
ENV         ?= dev                  # можна перевизначити: make deploy ENV=prod
AWS_REGION  ?= us-east-1
ACCOUNT_ID  := $(shell aws sts get-caller-identity --query Account --output text)
REGISTRY    := $(ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
IMAGE_TAG   := $(shell git rev-parse --short HEAD)
FULL_IMAGE  := $(REGISTRY)/$(APP_NAME):$(IMAGE_TAG)

.PHONY: help build test lint push deploy destroy clean fmt validate plan apply

# =============================================================================
# Документація
# =============================================================================
help: ## Показати всі доступні команди
	@echo "\nДоступні команди для проєкту $(APP_NAME):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	 awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Якість коду
# =============================================================================
lint: ## Запустити linting (eslint / flake8)
	@echo "→ Linting..."
	npx eslint src/

test: ## Запустити unit-тести
	@echo "→ Testing..."
	npm test -- --coverage

security-scan: ## Сканування вразливостей (Trivy)
	trivy image $(FULL_IMAGE)

# =============================================================================
# Docker
# =============================================================================
build: ## Зібрати Docker-образ
	@echo "→ Building $(FULL_IMAGE)..."
	docker build \
		--build-arg GIT_COMMIT=$(IMAGE_TAG) \
		--build-arg BUILD_DATE=$(shell date -u +%Y-%m-%dT%H:%M:%SZ) \
		-t $(FULL_IMAGE) \
		-t $(REGISTRY)/$(APP_NAME):latest \
		.

push: build ## Завантажити образ в ECR
	@echo "→ Logging into ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(REGISTRY)
	@echo "→ Pushing $(FULL_IMAGE)..."
	docker push $(FULL_IMAGE)
	docker push $(REGISTRY)/$(APP_NAME):latest

# =============================================================================
# Terraform
# =============================================================================
TF_DIR := terraform/envs/$(ENV)

fmt: ## Форматувати Terraform-файли
	terraform -chdir=$(TF_DIR) fmt -recursive

validate: fmt ## Перевірити коректність Terraform-конфігурації
	terraform -chdir=$(TF_DIR) init -backend=false
	terraform -chdir=$(TF_DIR) validate

plan: ## Переглянути зміни (terraform plan)
	terraform -chdir=$(TF_DIR) init
	terraform -chdir=$(TF_DIR) plan -var="image_tag=$(IMAGE_TAG)" -out=tfplan

apply: plan ## Застосувати зміни (terraform apply)
	terraform -chdir=$(TF_DIR) apply tfplan

destroy: ## Знищити інфраструктуру
	@echo "⚠️  ПОПЕРЕДЖЕННЯ: видалення $(ENV) інфраструктури!"
	@read -p "Введіть назву середовища для підтвердження: " confirm; \
	 test "$$confirm" = "$(ENV)" || (echo "Скасовано" && exit 1)
	terraform -chdir=$(TF_DIR) destroy -var="image_tag=$(IMAGE_TAG)"

# =============================================================================
# Kubernetes
# =============================================================================
rollout: ## Оновити K8s Deployment
	kubectl set image deployment/$(APP_NAME) \
		$(APP_NAME)=$(FULL_IMAGE) \
		--namespace=$(ENV)
	kubectl rollout status deployment/$(APP_NAME) --namespace=$(ENV)

rollback: ## Відкотити попередню версію
	kubectl rollout undo deployment/$(APP_NAME) --namespace=$(ENV)

# =============================================================================
# Повний CI pipeline (використовується у GitHub Actions)
# =============================================================================
ci: lint test build security-scan ## Повний CI pipeline
	@echo "✓ CI pipeline завершено успішно"

# =============================================================================
# Очищення
# =============================================================================
clean: ## Видалити локальні артефакти
	@echo "→ Cleaning..."
	rm -rf node_modules dist coverage .terraform tfplan
	docker image prune -f
```

### 5.4 Інтеграція Makefile з GitHub Actions

Makefile і CI-пайплайн доповнюють одне одного: CI викликає Make-цілі, а не окремі команди. Це гарантує, що CI та локальне середовище поводяться **ідентично**:

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      # Замість окремих команд — одна Make-ціль:
      - name: Run CI pipeline
        run: make ci # ← lint + test + build + security-scan

      - name: Push to ECR
        if: github.ref == 'refs/heads/main'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: make push # ← build + ecr-login + docker push

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: make deploy ENV=prod # ← terraform apply + kubectl rollout
```

**Переваги такого підходу:**

- Розробник може відтворити CI локально командою `make ci`
- При зміні CI-платформи (GitHub Actions → GitLab CI → Jenkins) — змінюється тільки YAML-обгортка, а бізнес-логіка збірки залишається у Makefile
- Onboarding нового розробника: `git clone` → `make help` → `make ci`

### 5.5 Практичні поради

**Найкращі практики написання Makefile:**

| Практика                                 | Приклад                   | Чому важливо                         |
| ---------------------------------------- | ------------------------- | ------------------------------------ |
| Завжди оголошувати `.PHONY`              | `.PHONY: build test`      | Уникнути конфліктів з файлами        |
| Використовувати `@` для тихих команд     | `@echo "→ Building..."`   | Чистий output без дублювання команди |
| Параметризувати через змінні             | `ENV ?= dev`              | `make deploy ENV=prod`               |
| `?=` для змінних за замовчуванням        | `AWS_REGION ?= us-east-1` | Можна перевизначити з оточення       |
| Ціль `help` з `##`-коментарями           | Автодокументування        | Новий розробник одразу розуміє API   |
| Перевіряти обов'язкові змінні            | `test -n "$(VAR)"`        | Fail fast з зрозумілим повідомленням |
| Підтвердження для деструктивних операцій | `read -p "Підтвердіть: "` | Захист від `make destroy` у prod     |

---

## 6. Стратегії деплойменту

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

4. **Makefile** є стандартизованим DevOps-інтерфейсом, що забезпечує єдиний point of entry для CI-систем і розробників. Інтеграція Makefile з GitHub Actions гарантує ідентичне виконання пайплайну локально та в CI.

5. **Стратегії деплойменту** (Rolling, Blue/Green, Canary) дозволяють знизити ризик під час оновлень. Canary є найбезпечнішим, але найскладнішим; Blue/Green — простим і передбачуваним.

6. **GitOps** (ArgoCD) робить Git єдиним джерелом істини для стану K8s-кластера — будь-яка «дрейф» конфігурації автоматично виправляється.

---

## Джерела

1. Kim, G., Humble, J., Debois, P., & Willis, J. (2016). _The DevOps Handbook_. IT Revolution Press.
2. Humble, J., & Farley, D. (2010). _Continuous Delivery_. Addison-Wesley.
3. DORA Research Program. (2023). _State of DevOps Report_. Google Cloud.
4. AWS Documentation. (2024). _AWS CodePipeline User Guide_. https://docs.aws.amazon.com/codepipeline/
5. Weaveworks. (2020). _Guide to GitOps_. https://www.weave.works/technologies/gitops/
6. GitHub. (2024). _GitHub Actions Documentation_. https://docs.github.com/en/actions
7. GNU Project. (2024). _GNU Make Manual_. https://www.gnu.org/software/make/manual/make.html

---

## Запитання для самоперевірки

1. Що таке DevOps і які три ключові принципи він включає?
2. Назвіть чотири DORA-метрики. Що вони вимірюють і чому вони важливі?
3. Що таке CI? Опишіть типовий CI Pipeline (5+ кроків) із прикладом.
4. Чим Continuous Delivery відрізняється від Continuous Deployment?
5. Що таке `buildspec.yml` в AWS CodeBuild та `azure-pipelines.yml`?
6. Що таке Makefile? Чому він є стандартизованим інтерфейсом DevOps-проєктів?
7. Що означає директива `.PHONY` у Makefile? Що відбудеться, якщо її не вказати?
8. Поясніть стратегію Blue/Green Deployment. Яку перевагу вона дає над Rolling?
9. Що таке Canary Deployment? Як 5% трафіку на нову версію допомагає знизити ризик?
10. Що таке GitOps? Яку роль виконує ArgoCD в GitOps-workflow?
11. Як security scanning (SAST, Container Scanning) інтегрується в CI Pipeline?
12. Поясніть, чому виклик `make ci` у GitHub Actions краще, ніж прямий виклик команд у YAML.
