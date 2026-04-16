# Лабораторна робота №7 (2 години)

**Тема:** Оркестрація контейнерів у Kubernetes.

Розгортання Kubernetes-кластера (локально або в хмарі); опис розгортання у YAML-маніфестах (Deployment, Service, ConfigMap); масштабування подів та налаштування Horizontal Pod Autoscaler; оновлення застосунку без простою (Rolling Update).

**Мета:** Набути практичні навички розгортання контейнеризованих застосунків у Kubernetes, роботи з YAML-маніфестами, масштабування та виконання оновлень без простою сервісу.

**Технологічний стек:**

- **Minikube** або **kind** — локальний Kubernetes-кластер (рекомендовано для початку)
- **kubectl** — CLI-інструмент для управління Kubernetes
- **Docker** — для роботи з образами (або вже існуючий образ з Лаб. №6)
- **Kubernetes Playground** (альтернатива) — [play-with-k8s.com](https://labs.play-with-k8s.com/)

---

## Завдання

1. Встановити kubectl та розгорнути локальний кластер за допомогою Minikube
2. Розгорнути застосунок за допомогою YAML-маніфесту (Deployment)
3. Створити Service для доступу до застосунку
4. Масштабувати Deployment (збільшити кількість реплік)
5. Виконати Rolling Update (оновлення без простою)
6. Налаштувати ConfigMap та використати його у Pod'і

---

## Хід виконання роботи

### Крок 1. Встановлення kubectl та Minikube

**kubectl:**

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# macOS (Homebrew)
brew install kubectl

# Windows (winget)
winget install Kubernetes.kubectl
# або Chocolatey: choco install kubernetes-cli
# або Scoop: scoop install kubectl

# Перевірка встановлення
kubectl version --client

> **Примітка:** Якщо у вас встановлено **Docker Desktop**, `kubectl` зазвичай вже йде в комплекті, і додаткове встановлення не потрібне.
```

**Minikube** — це інструмент, який створює локальний Kubernetes-кластер на вашому комп'ютері. Він запускає однонодовий кластер всередині віртуальної машини або контейнера, що ідеально підходить для тестування маніфестів.

**Системні вимоги:**

- 2 або більше CPU.
- 2 ГБ вільної оперативної пам'яті (рекомендовано 4 ГБ+).
- 20 ГБ вільного місця на диску.
- Підтримка віртуалізації (має бути увімкнена в BIOS/UEFI).

**Встановлення:**

```bash
# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# macOS (Homebrew)
brew install minikube

# Windows (winget - рекомендовано)
winget install Kubernetes.minikube
# або Chocolatey:
choco install minikube
```

![alt text](media/lab7_screen1.png)

```bash
# Перевірка статусу
minikube status
```

> [!IMPORTANT]
> Після встановлення обов'язково **перезавантажте термінал**, щоб система побачила нові змінні оточення (PATH).
>
> Якщо ви не хочете перезавантажувати термінал або команда `minikube` не розпізнається, виконайте ці команди в PowerShell (це оновить шлях для поточної сесії та запустить кластер):
>
> ```powershell
> $env:Path += ";C:\Program Files\Kubernetes\Minikube"
> & "C:\Program Files\Kubernetes\Minikube\minikube.exe" start --driver=docker --cpus=2 --memory=2g
> ```

### Крок 2. П’ятнадцятихвилинний старт (Запуск кластера)

Для запуску ми використовуємо драйвер `docker`, оскільки він найшвидший і не потребує складної конфігурації віртуальних машин.

```bash
# Запуск кластера з обмеженням ресурсів
minikube start --driver=docker --cpus=2 --memory=2g

# Перевірка статусу
minikube status

# Перевірка
kubectl cluster-info
kubectl get nodes
minikube dashboard   # Відкриває веб-UI
```

> [!TIP]
> Для того, щоб у Dashboard відображалися графіки використання ресурсів (CPU, RAM), необхідно увімкнути аддон **metrics-server**:
> ```bash
> minikube addons enable metrics-server
> ```

![alt text](media/lab7_screen2.png)

### Крок 2. Перший YAML-маніфест — Deployment

Створіть файл `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lab07-app
  labels:
    app: lab07-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lab07-app
  template:
    metadata:
      labels:
        app: lab07-app
    spec:
      containers:
        - name: app
          image: <your-dockerhub-username>/lab06-app:1.0 # Образ з Лаб. №6
          # Або використайте готовий образ:
          # image: nginx:1.25-alpine
          ports:
            - containerPort: 3000
          env:
            - name: APP_VERSION
              value: "1.0.0"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

Застосуйте маніфест:

```bash
kubectl apply -f deployment.yaml

# Слідкуйте за розгортанням
kubectl get pods -w
kubectl rollout status deployment/lab07-app

# Деталі Deployment
kubectl describe deployment lab07-app
```

### Крок 3. Створення Service

Створіть `service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: lab07-service
spec:
  type: NodePort # або LoadBalancer у реальному хмарному кластері
  selector:
    app: lab07-app
  ports:
    - protocol: TCP
      port: 80 # порт Service
      targetPort: 3000 # порт контейнера
      nodePort: 30080 # зовнішній порт вузла (30000–32767)
```

```bash
kubectl apply -f service.yaml

# Переглянути Services
kubectl get svc

# Відкрити застосунок через Minikube
minikube service lab07-service

# або через тунель:
kubectl port-forward svc/lab07-service 8080:80
# Відкрийте http://localhost:8080
```

### Крок 4. Базові команди kubectl

```bash
# Pods
kubectl get pods
kubectl get pods -o wide       # З IP та нодою
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl exec -it <pod-name> -- /bin/sh    # Вхід у Pod

# Deployments
kubectl get deployments
kubectl get deploy lab07-app -o yaml      # Повний YAML

# Services
kubectl get services
kubectl get all                            # Всі ресурси
```

### Крок 5. Масштабування

```bash
# Збільшити кількість реплік до 4
kubectl scale deployment lab07-app --replicas=4

# Спостерігати за появою нових подів
kubectl get pods -w

# Зменшити до 1
kubectl scale deployment lab07-app --replicas=1

# Перевірити розподіл навантаження (кожен запит може йти до різного пода)
for i in {1..5}; do curl -s $(minikube service lab07-service --url) | grep Hostname; done
```

### Крок 6. Rolling Update (оновлення без простою)

```bash
# Оновити образ на нову версію
kubectl set image deployment/lab07-app app=<username>/lab06-app:latest

# Або — відредагуйте deployment.yaml (змініть image tag) та:
kubectl apply -f deployment.yaml

# Слідкуйте за ходом оновлення
kubectl rollout status deployment/lab07-app

# Переглянути історію оновлень
kubectl rollout history deployment/lab07-app

# Відкат до попередньої версії (якщо щось пішло не так)
kubectl rollout undo deployment/lab07-app
```

### Крок 7. ConfigMap

Створіть `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lab07-config
data:
  APP_VERSION: "2.0.0"
  LOG_LEVEL: "info"
  WELCOME_MSG: "Hello from ConfigMap!"
```

Оновіть `deployment.yaml` для використання ConfigMap:

```yaml
envFrom:
  - configMapRef:
      name: lab07-config
```

```bash
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml

# Переконайтесь, що змінні передані в Pod
kubectl exec -it <pod-name> -- env | grep APP_VERSION
```

---

## Контрольні запитання

1. Що таке Pod у Kubernetes? Чому Pod може містити кілька контейнерів?
2. Поясніть призначення Deployment у Kubernetes. Чим він відрізняється від простого запуску Pod'а?
3. Які типи Service існують у Kubernetes (ClusterIP, NodePort, LoadBalancer)? Коли який використовується?
4. Що таке Rolling Update? Як Kubernetes забезпечує відсутність простою сервісу під час оновлення?
5. Що таке ConfigMap та Secret у Kubernetes? Чому секрети не варто зберігати у ConfigMap?
6. Що таке Horizontal Pod Autoscaler (HPA)? На основі яких метрик він масштабує Deployment?

---

## Вимоги до звіту

1. Вміст файлів `deployment.yaml` та `service.yaml`
2. Вивід `kubectl get pods -o wide` після розгортання (2 репліки)
3. Скриншот браузера з відкритим застосунком через Minikube
4. Вивід `kubectl get pods` до та після масштабування (1→4→1 репліки)
5. Вивід `kubectl rollout history deployment/lab07-app`
6. Відповіді на контрольні запитання у файлі `lab07.md`
7. Посилання на GitHub з YAML-маніфестами надіслати в Classroom
