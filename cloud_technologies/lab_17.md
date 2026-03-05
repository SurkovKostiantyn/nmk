# Лабораторна робота №17 (2 години)

**Тема:** Інтеграція AI/ML-сервісів у хмарний застосунок.

Підключення готових когнітивних API (розпізнавання зображень, аналіз тексту) від AWS Rekognition, Azure Cognitive Services або Google Vision API; розробка простого застосунку з використанням AI-сервісів.

**Мета:** Набути практичні навички інтеграції готових хмарних AI-сервісів у власний застосунок без необхідності навчати моделі самостійно; оцінити вартість та можливості AIaaS-підходу.

**Технологічний стек:**

- **Google Cloud Vision API** (рекомендовано) — 1000 запитів/місяць безкоштовно
- **OpenAI API** (альтернатива) — GPT-4o для аналізу тексту (платно, але мінімальна вартість)
- **HuggingFace Inference API** (безкоштовно) — відкриті ML-моделі
- **Node.js / Python** — мова інтеграційного застосунку

---

## Завдання

1. Отримати API-ключ для обраного AI-сервісу
2. Реалізувати аналіз зображень (розпізнавання об'єктів / тексту на фото)
3. Реалізувати аналіз тексту (визначення тональності / мови)
4. Побудувати мінімальний веб-інтерфейс для демонстрації
5. Оцінити вартість сервісу для реального навантаження

---

## Хід виконання роботи

### Крок 1. HuggingFace Inference API (повністю безкоштовно)

1. Зареєструйтесь на [https://huggingface.co](https://huggingface.co)
2. **Profile** → **Settings** → **Access Tokens** → **New token** (Read)
3. Скопіюйте токен

```bash
mkdir lab17-ai && cd lab17-ai
npm init -y
npm install express multer node-fetch form-data dotenv
```

Створіть `.env`:

```
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

### Крок 2. Реалізація AI-сервісів через HuggingFace

```js
// ai-services.js
import fetch from "node-fetch";

const HF_API = "https://api-inference.huggingface.co/models";
const headers = { Authorization: `Bearer ${process.env.HF_TOKEN}` };

// 1. Класифікація зображень
export async function classifyImage(imageBuffer) {
  const response = await fetch(`${HF_API}/google/vit-base-patch16-224`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/octet-stream" },
    body: imageBuffer,
  });
  return response.json();
}

// 2. Аналіз тональності тексту (Sentiment Analysis)
export async function analyzeSentiment(text) {
  const response = await fetch(
    `${HF_API}/cardiffnlp/twitter-roberta-base-sentiment-latest`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text }),
    },
  );
  return response.json();
}

// 3. Визначення мови тексту
export async function detectLanguage(text) {
  const response = await fetch(
    `${HF_API}/papluca/xlm-roberta-base-language-detection`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text }),
    },
  );
  return response.json();
}

// 4. Підсумок тексту (Text Summarization)
export async function summarizeText(text) {
  const response = await fetch(`${HF_API}/facebook/bart-large-cnn`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: text, parameters: { max_length: 150 } }),
  });
  return response.json();
}
```

### Крок 3. Веб-сервер із AI-ендпоінтами

```js
// server.js
import "dotenv/config";
import express from "express";
import multer from "multer";
import {
  classifyImage,
  analyzeSentiment,
  detectLanguage,
  summarizeText,
} from "./ai-services.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Аналіз зображення
app.post("/api/classify-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });
    const result = await classifyImage(req.file.buffer);
    res.json({ results: result.slice(0, 5) }); // Топ-5 класів
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Аналіз тексту
app.post("/api/analyze-text", async (req, res) => {
  try {
    const { text, task } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    let result;
    switch (task) {
      case "sentiment":
        result = await analyzeSentiment(text);
        break;
      case "language":
        result = await detectLanguage(text);
        break;
      case "summarize":
        result = await summarizeText(text);
        break;
      default:
        return res.status(400).json({ error: "Unknown task" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`AI Lab running on port ${process.env.PORT}`),
);
```

### Крок 4. Веб-інтерфейс

Створіть `public/index.html`:

```html
<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <title>Lab 17 — Cloud AI Services</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
      }
      h1 {
        color: #2c3e50;
      }
      section {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      button {
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #2980b9;
      }
      pre {
        background: #f4f4f4;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
      }
      textarea {
        width: 100%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <h1>🤖 Cloud AI Services — Lab 17</h1>

    <section>
      <h2>📸 Класифікація зображення</h2>
      <input type="file" id="imageInput" accept="image/*" />
      <br /><br />
      <button onclick="classifyImage()">Аналізувати</button>
      <pre id="imageResult">—</pre>
    </section>

    <section>
      <h2>📝 Аналіз тексту</h2>
      <textarea id="textInput" placeholder="Введіть текст для аналізу...">
This product is absolutely amazing and I love it!</textarea
      >
      <br /><br />
      <select id="taskSelect">
        <option value="sentiment">Тональність (Sentiment)</option>
        <option value="language">Визначення мови</option>
        <option value="summarize">Коротке резюме</option>
      </select>
      <button onclick="analyzeText()">Аналізувати</button>
      <pre id="textResult">—</pre>
    </section>

    <script>
      async function classifyImage() {
        const file = document.getElementById("imageInput").files[0];
        if (!file) return alert("Оберіть зображення");
        document.getElementById("imageResult").textContent = "Аналізую...";
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/classify-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        document.getElementById("imageResult").textContent = JSON.stringify(
          data,
          null,
          2,
        );
      }

      async function analyzeText() {
        const text = document.getElementById("textInput").value;
        const task = document.getElementById("taskSelect").value;
        document.getElementById("textResult").textContent = "Аналізую...";
        const res = await fetch("/api/analyze-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, task }),
        });
        const data = await res.json();
        document.getElementById("textResult").textContent = JSON.stringify(
          data,
          null,
          2,
        );
      }
    </script>
  </body>
</html>
```

### Крок 5. Тестування через cURL

```bash
node server.js &

# Аналіз тональності
curl -X POST http://localhost:3000/api/analyze-text \
  -H "Content-Type: application/json" \
  -d '{"text": "This is absolutely fantastic!", "task": "sentiment"}'

# Визначення мови
curl -X POST http://localhost:3000/api/analyze-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Привіт, як справи?", "task": "language"}'

# Класифікація зображення
curl -X POST http://localhost:3000/api/classify-image \
  -F "image=@/path/to/photo.jpg"
```

### Крок 6. Google Vision API (альтернатива з більшими можливостями)

```python
# vision_demo.py
from google.cloud import vision
import io

client = vision.ImageAnnotatorClient()

def analyze_image(image_path):
    with io.open(image_path, 'rb') as f:
        content = f.read()

    image = vision.Image(content=content)

    # Розпізнавання об'єктів
    objects = client.object_localization(image=image).localized_object_annotations
    print("Об'єкти:")
    for obj in objects:
        print(f"  {obj.name}: {obj.score:.2f}")

    # Розпізнавання тексту (OCR)
    texts = client.text_detection(image=image).text_annotations
    if texts:
        print(f"\nЗнайдений текст: {texts[0].description[:200]}")

    # Визначення безпечного контенту
    safe = client.safe_search_detection(image=image).safe_search_annotation
    print(f"\nБезпека контенту: adult={safe.adult.name}")

analyze_image('test_image.jpg')
```

---

## Контрольні запитання

1. Що таке AIaaS (AI as a Service)? Назвіть 3 приклади готових когнітивних API від різних хмарних провайдерів.
2. Що таке трансфер-навчання (Transfer Learning)? Чому готові хмарні AI-сервіси будуються на його основі?
3. Поясніть різницю між класифікацією (classification), детекцією (detection) та сегментацією (segmentation) зображень.
4. Що таке Sentiment Analysis? Наведіть приклади бізнес-задач, де воно застосовується.
5. Які є обмеження готових AI-сервісів порівняно з навчанням власної моделі? Коли варто навчати модель самостійно?
6. Що таке Responsible AI? Назвіть основні принципи відповідального використання AI у хмарних рішеннях.

---

## Вимоги до звіту

1. Скриншот веб-інтерфейсу із результатом класифікації зображення
2. Вивід cURL-запиту аналізу тональності та визначення мови
3. Скриншот результату аналізу тексту через веб-форму
4. Код `ai-services.js` (або Python-аналог)
5. Оцінка вартості: скільки коштуватиме 10 000 запитів/місяць для обраного сервісу
6. Відповіді на контрольні запитання у файлі `lab17.md`
7. Посилання на GitHub з кодом надіслати в Classroom
