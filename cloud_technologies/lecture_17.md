# Лекція №17 (2 години). Штучний інтелект та машинне навчання як хмарні сервіси (AIaaS/MLaaS)

## План лекції

1. AI/ML у хмарі: концепція та рівні абстракції
2. Готові AI-сервіси (AI APIs): Vision, NLP, Speech
3. Платформи MLOps: SageMaker, Azure ML, Vertex AI
4. Генеративний AI та великі мовні моделі (LLM) у хмарі
5. Відповідальний AI: етика та регулювання

## Перелік умовних скорочень

Списком

- **AI** — Artificial Intelligence — штучний інтелект
- **ML** — Machine Learning — машинне навчання
- **DL** — Deep Learning — глибоке навчання
- **LLM** — Large Language Model — велика мовна модель
- **NLP** — Natural Language Processing — обробка природньої мови
- **MLOps** — Machine Learning Operations — операції ML
- **GPU** — Graphics Processing Unit — графічний процесор
- **API** — Application Programming Interface
- **SageMaker** — AWS-платформа ML
- **SDK** — Software Development Kit
- **CV** — Computer Vision — комп'ютерний зір
- **OCR** — Optical Character Recognition — оптичне розпізнавання символів
- **RAG** — Retrieval-Augmented Generation — пошуково-доповнена генерація
- **FinOps** — Financial Operations — фінансові операції (у хмарі)
- **GDPR** — General Data Protection Regulation

---

## Вступ

Штучний інтелект перестав бути виключно академічним предметом і увійшов у повсякденну інженерну практику. Хмарні провайдери зробили потужні AI/ML-можливості доступними через прості API, усунувши необхідність у спеціалізованій експертизі з математики чи доступу до надпотужного GPU-обладнання. Три рівні абстракції дозволяють організаціям будь-якого розміру інтегрувати AI у своїх продуктах: від виклику готового API до тренування власних фундаментальних моделей.

---

## 1. AI/ML у хмарі: рівні абстракції

### 1.1 Піраміда AI-сервісів

```
          ┌─────────────────────────────────────────┐
          │   Готові AI-API (Rekognition, Translate)│   Найпростіше
          │   Потребує: API Key                      │
          ├─────────────────────────────────────────┤
          │   AutoML (Vertex AutoML, SageMaker AP)   │
          │   Потребує: дані + кілька кліків         │
          ├─────────────────────────────────────────┤
          │   ML Frameworks (TensorFlow, PyTorch)    │
          │   + Managed Training (SageMaker, Vertex) │
          │   Потребує: ML-розробник                 │
          ├─────────────────────────────────────────┤
          │   Custom Hardware (GPU/TPU instances)    │
          │   Foundation Model Training              │   Найскладніше
          └─────────────────────────────────────────┘
```

**Рівень 1 — Готові AI API:** звертаємось до REST API → отримуємо результат. Тренування не потрібне.Ідеальне для розробників без ML-досвіду.

**Рівень 2 — AutoML:** завантажуємо власні дані → провайдер автоматично тренує модель. Потребує розмічені дані, але не знає ML-алгоритмів.

**Рівень 3 — ML Platforms:** повний контроль над вибором алгоритму, гіперпараметрами, архітектурою. Потребує ML-інженера.

**Рівень 4 — Custom Foundation Models:** тренування власних LLM на сотнях GPU тижнями. Доступно лише великим організаціям з бюджетними мільйонами.

---

## 2. Готові AI-сервіси

### 2.1 Комп'ютерний зір (Computer Vision)

**Amazon Rekognition:**

- **Object Detection**: розпізнавання об'єктів (автомобілі, люди, тварини) з confidence score
- **Facial Recognition**: ідентифікація та верифікація облич; пошук у базі облич
- **Facial Analysis**: вік, емоції, наявність масок/окулярів
- **Text in Image (OCR)**: витягування тексту з зображень
- **Content Moderation**: автоматичне виявлення небажаного контенту (насилля, 18+)
- **Video Analysis**: аналіз відео в реальному часі з Kinesis Video Streams

```python
import boto3

rekognition = boto3.client('rekognition')
response = rekognition.detect_labels(
    Image={'S3Object': {'Bucket': 'my-bucket', 'Name': 'photo.jpg'}},
    MaxLabels=10, MinConfidence=80
)
for label in response['Labels']:
    print(f"{label['Name']}: {label['Confidence']:.1f}%")
# Output: Person: 99.8%, Car: 95.2%, Tree: 87.5%
```

**Azure Computer Vision та Google Vision AI** — аналогічні CV-сервіси з додатковими можливостями:

- Google Vision AI: унікальна можливість розпізнавання логотипів та об'єктів із Google Shopping

### 2.2 Обробка природньої мови (NLP)

**Amazon Comprehend:**

- Sentiment Analysis (позитивний/негативний/нейтральний)
- Entity Recognition (особи, організації, місця, дати)
- Key Phrase Extraction
- Language Detection (98 мов)
- PII Detection: автоматичне виявлення персональних даних у тексті

**Amazon Translate:** нейромашинний переклад між 75 мовами; Custom Terminology для спеціалізованих термінів.

**Amazon Lex:** побудова розмовних інтерфейсів (чат-боти, голосові боти) — та сама технологія, що живить Alexa.

**Azure Text Analytics та Google Natural Language AI** — аналогічні NLP-сервіси у відповідних хмарах.

### 2.3 Мовленнєві сервіси

**Amazon Transcribe (Speech-to-Text):**

- Транскрипція аудіо/відео у текст (в реальному часі та batch)
- Ідентифікація спікерів (speaker diarization)
- Кастомний словник (специфічні терміни, назви)
- Підтримка 45+ мов

**Amazon Polly (Text-to-Speech):**

- Синтез мовлення у 60 голосах та 29 мовах
- **Neural TTS**: природнє, виразне мовлення з правильними паузами та наголосами
- SSML: контроль вимови, тону, швидкості

---

## 3. Платформи MLOps

### 3.1 Концепція MLOps

**MLOps (Machine Learning Operations)** — набір практик, що об'єднують ML-розробку та операції для надійного, масштабованого розгортання та підтримки ML-моделей у production.

**ML Lifecycle:**

```
Business    Data         Model        Evaluation  Deployment  Monitoring
Problem  →  Collection → Training   → Testing   → Serving   → & Retraining
  │           │             │            │           │           │
  └───────────┴─────────────┴────────────┴───────────┴───────────┘
                     MLOps автоматизує цей цикл
```

**Проблема без MLOps:**

- Data Science team тренує модель у Jupyter Notebook
- Передає `.pkl` файл у Engineering team
- Engineering не знає, як відтворити середовище → «Reproducibility crisis»
- Модель деградує з часом (data drift) → ніхто не помічає

### 3.2 Amazon SageMaker

**Amazon SageMaker** — найбільш повна ML-платформа у хмарі:

**SageMaker Studio:** IDE для ML (Jupyter-based) з інтегрованими інструментами.

**SageMaker Training:**

- Запуск тренування у керованих контейнерах (PyTorch, TensorFlow, Scikit-learn)
- Підтримка GPU інстансів (p3, p4, trn1)
- **Distributed Training**: тренування на кількох GPU/instances
- **Spot Training**: до 90% знижки при тренуванні на Spot Instances

**SageMaker Autopilot (AutoML):**

- Завантажте CSV → SageMaker автоматично: очищує дані, вибирає алгоритм, тренує, оцінює
- На виході — best model + notebook із поясненням підходу

**SageMaker Model Registry:** каталог версій моделей з метаданими та статусами (Staging/Production).

**SageMaker Pipelines:** MLOps-пайплайн для автоматизації тренування, оцінки та розгортання:

```
Data Processing → Feature Engineering → Model Training → Evaluation
                                                              │
                                            Accuracy > 90%   │
                                                 ├── YES → Register → Deploy
                                                 └── NO  → Alert
```

**SageMaker Endpoints:**

- Real-time inference: постійно доступний REST endpoint (автомасштабування)
- Serverless Inference: масштабується до нуля (дешевше для рідких запитів)
- Batch Transform: обробка великих датасетів

### 3.3 Azure Machine Learning та Google Vertex AI

**Azure Machine Learning:**

- Designer: GUI-конструктор ML-пайплайнів
- AutoML: автоматичний вибір моделі
- Глибока інтеграція з Azure DevOps → CI/CD для ML (MLOps)
- **Responsible AI dashboard**: аналіз справедливості, помилок та інтерпретованості

**Google Vertex AI:**

- **AutoML**: найкраще у галузі AutoML (Image, Text, Video, Tables)
- **Workbench**: Jupyter-середовище з GPU
- **Vertex AI Experiments**: MLflow-сумісне відстеження експериментів
- **Model Garden**: каталог фундаментальних моделей (Gemini, PaLM, Llama, тощо)
- **Vertex AI Pipelines**: Kubeflow-based ML-пайплайни

---

## 4. Генеративний AI та LLM у хмарі

### 4.1 Великі мовні моделі (LLM)

**Large Language Models (LLM)** — нейронні мережі-трансформери з мільярдами параметрів, навчені на величезних текстових корпусах:

- **GPT-4** (OpenAI): 1,8 трлн параметрів (оцінка)
- **Claude** (Anthropic): фокус на безпеці та точності
- **Gemini** (Google): мультимодальний (текст + зображення + відео + аудіо)
- **Llama 3** (Meta): відкритий (open weights)

### 4.2 Amazon Bedrock

**Amazon Bedrock** — єдиний сервіс доступу до foundation models від різних провайдерів через єдиний AWS API:

| Провайдер    | Моделі в Bedrock                       |
| ------------ | -------------------------------------- |
| Anthropic    | Claude 3 (Haiku, Sonnet, Opus)         |
| Meta         | Llama 3 (8B, 70B, 405B)                |
| Mistral      | Mistral 7B, Mixtral 8x7B               |
| Amazon       | Titan (Text, Embeddings, Image)        |
| Stability AI | Stable Diffusion (генерація зображень) |

```python
import boto3
import json

bedrock = boto3.client('bedrock-runtime')

response = bedrock.invoke_model(
    modelId='anthropic.claude-3-sonnet-20240229-v1:0',
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {"role": "user", "content": "Поясни різницю між TCP та UDP"}
        ]
    })
)
result = json.loads(response['body'].read())
print(result['content'][0]['text'])
```

**Bedrock Agents:** AI-агент, що може автономно виконувати дії (Lambda, DB, API) для досягнення мети.

**Bedrock Knowledge Bases (RAG):** вбудована реалізація RAG (Retrieval-Augmented Generation):

1. Завантажуємо документи в S3
2. Bedrock векторизує їх та зберігає у vector store
3. При запиті → пошук релевантних фрагментів → передача в LLM як контекст

### 4.3 Azure OpenAI Service та Google Vertex AI (Generative AI)

**Azure OpenAI Service:** ексклюзивний доступ до GPT-4, DALL-E, Whisper від OpenAI через Azure:

- Корпоративна безпека (дані не передаються в OpenAI)
- Azure Active Directory інтеграція
- Content filtering та responsible AI guardrails

**Google Vertex AI Generative AI:**

- **Gemini 1.5 Pro/Flash**: мультимодальна модель з вікном контексту 1M токенів
- **Imagen**: генерація та редагування зображень
- **Codey**: генерація та пояснення коду

---

## 5. Відповідальний AI

### 5.1 Принципи Responsible AI

Провідні організації (Google, Microsoft, AWS) декларують принципи Responsible AI:

| Принцип                               | Опис                                                |
| ------------------------------------- | --------------------------------------------------- |
| **Fairness (Справедливість)**         | Модель не дискримінує за расою, статтю, віком       |
| **Transparency (Прозорість)**         | Можна пояснити рішення моделі                       |
| **Privacy (Конфіденційність)**        | Захист персональних даних у тренуванні та inference |
| **Safety (Безпека)**                  | Модель не генерує шкідливий контент                 |
| **Reliability (Надійність)**          | Модель поводиться передбачувано                     |
| **Accountability (Відповідальність)** | Хтось відповідає за рішення AI                      |

### 5.2 Bias у ML-моделях

**Приклад упередженості:** Система найму навчена на résumé успішних менеджерів → більшість у навчальних даних — чоловіки → модель дискримінує жінок (Amazon AI-рекрутинг, 2018).

**Підходи до виявлення bias:**

- **Amazon Clarify**: аналіз упередженості у даних та моделях
- **Azure Responsible AI Toolbox**: fairness assessment
- **Fairlearn (Microsoft/open-source)**: бібліотека для вимірювання та зменшення bias

### 5.3 Регулювання AI

**EU AI Act (2024)** — перший у світі закон про AI:

- Класифікує AI-системи за рівнем ризику: Unacceptable → High → Limited → Minimal
- **Unacceptable**: соціальний рейтинг, маніпуляція → Заборонено
- **High risk**: системи найму, освіти, медицини, правосуддя → Строгі вимоги (transparency, human oversight)

---

## Висновки

1. **Три рівні AI-сервісів** (готові API, AutoML, custom training) дозволяють організаціям будь-якого розміру інтегрувати AI пропорційно своїм можливостям та потребам.

2. **Готові AI API** (Rekognition, Comprehend, Translate, Polly/Transcribe) надають потужні CV, NLP та мовленнєві можливості через простий REST-виклик — без ML-знань.

3. **Amazon SageMaker, Azure ML, Vertex AI** є повноцінними MLOps-платформами, що автоматизують весь ML-lifecycle від підготовки даних до моніторингу моделі в production.

4. **Генеративний AI** (Amazon Bedrock, Azure OpenAI, Vertex AI) увійшов в мейнстрим. RAG (Retrieval-Augmented Generation) дозволяє «навчити» LLM корпоративних знань без fine-tuning.

5. **Відповідальний AI** (EU AI Act, bias detection, explainability) стає обов'язковою складовою будь-якого AI-проєкту, особливо у regulated industries.

---

## Джерела

1. AWS Documentation. (2024). _Amazon SageMaker Developer Guide_. https://docs.aws.amazon.com/sagemaker/
2. AWS Documentation. (2024). _Amazon Bedrock User Guide_. https://docs.aws.amazon.com/bedrock/
3. Google Cloud. (2024). _Vertex AI Documentation_. https://cloud.google.com/vertex-ai/docs
4. Microsoft. (2024). _Azure Machine Learning Documentation_. https://learn.microsoft.com/en-us/azure/machine-learning/
5. Huyen, C. (2022). _Designing Machine Learning Systems_. O'Reilly Media.
6. European Parliament. (2024). _EU AI Act_. https://eur-lex.europa.eu/
7. OpenAI. (2023). _GPT-4 Technical Report_. https://arxiv.org/abs/2303.08774

---

## Запитання для самоперевірки

1. Назвіть чотири рівні абстракції AI-сервісів у хмарі. Який рівень підходить для розробника без ML-досвіду?
2. Що таке Amazon Rekognition? Перелічіть п'ять задач, які він вирішує.
3. Що таке MLOps? Яку проблему він вирішує порівняно з класичним підходом до ML-розробки?
4. Опишіть цикл ML-розробки в Amazon SageMaker: від даних до розгорнутої моделі.
5. Що таке SageMaker Autopilot? Що потрібно надати і що буде результатом?
6. Що таке LLM? Чим GPT-4 відрізняється від класичного ML-алгоритму (наприклад, Random Forest)?
7. Що таке Amazon Bedrock? Чим він відрізняється від прямого використання OpenAI API?
8. Що таке RAG (Retrieval-Augmented Generation)? Яку проблему LLM він вирішує?
9. Поясніть принцип Fairness у Responsible AI. Наведіть реальний приклад упередженості ML-моделі.
10. Що таке EU AI Act? Які AI-системи він забороняє?
