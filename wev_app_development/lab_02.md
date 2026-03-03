# Лабораторна робота №2 (2 години)

**Тема:** Реалізація стрічки новин або списку об'єктів. Робота з реальними даними, впровадження списків та ключів.

**Мета:** Реалізувати компонент "Стрічка новин" (News Feed) або "Список товарів", використовуючи масив об'єктів (JSON). Навчитися використовувати метод `map()` для генерації інтерфейсу та зрозуміти важливість пропа `key` для алгоритму Reconciliation.

**Технологічний стек:** React, Vite, CSS Modules, JSON.

## Завдання

1. Створити масив "мок-даних" (mock data), що імітує відповідь від сервера (список постів, коментарів або товарів).
2. Створити компонент-молекулу `Post` (або `ProductCard`), використовуючи базові атоми з Лабораторної №1 (`Card`, `Button`, `Typography`).
3. Реалізувати рендеринг списку цих компонентів в `App.jsx` за допомогою методу масивів `.map()`.
4. Забезпечити унікальність ключів (`key`) для кожного елемента списку.
5. Додати базову інтерактивність (наприклад, лічильник лайків) для демонстрації локального стану (опціонально, підготовка до наступних лаб).

## Хід виконання роботи

### Крок 1. Підготовка даних (Mock Data)

Оскільки ми ще не підключаємо зовнішній API (це тема Лабораторної №6), ми створимо локальний файл з даними.

1. У папці `src` створіть файл `data.js`.
2. Додайте масив об'єктів. Кожен об'єкт повинен мати унікальний `id`.

`src/data.js`:

```javascript
export const postsData = [
  {
    id: 1,
    author: "User123",
    avatar: "https://placehold.co/50",
    content: "Це мій перший пост у новій соціальній мережі! React - це круто.",
    date: "2 год тому",
    likes: 5,
  },
  {
    id: 2,
    author: "Admin",
    avatar: "https://placehold.co/50",
    content:
      "Сьогодні ми вивчаємо Lists & Keys. Не забувайте про унікальні ключі!",
    date: "4 год тому",
    likes: 12,
  },
  {
    id: 3,
    author: "Student_KP",
    avatar: "https://placehold.co/50",
    content: "Лабораторна робота №2 виконується успішно.",
    date: "1 день тому",
    likes: 2,
  },
];
```

### Крок 2. Створення компонента Post (Molecule)

Використаємо компонент `Card` з попередньої роботи як контейнер.

1. Створіть `src/components/molecules/Post/Post.jsx` та `Post.module.css`.
2. Компонент має приймати дані через `props` (`author`, `content`, `date` тощо).

`Post.jsx`:

```jsx
import Button from "../../atoms/Button/Button"; // З Лаб 1
import Card from "../Card/Card"; // З Лаб 1
import styles from "./Post.module.css";

const Post = ({ author, content, date, avatar }) => {
  return (
    <Card>
      <div className={styles.header}>
        <img src={avatar} alt="avatar" className={styles.avatar} />
        <div className={styles.info}>
          <span className={styles.author}>{author}</span>
          <span className={styles.date}>{date}</span>
        </div>
      </div>

      <p className={styles.content}>{content}</p>

      <div className={styles.actions}>
        {/* Використовуємо кнопку з Лаб 1 */}
        <Button variant="secondary">Лайк</Button>
        <Button variant="primary">Коментувати</Button>
      </div>
    </Card>
  );
};

export default Post;
```

`Post.module.css`:

```css
.header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.avatar {
  border-radius: 50%;
  margin-right: 10px;
}
.info {
  display: flex;
  flex-direction: column;
}
.author {
  font-weight: bold;
}
.date {
  font-size: 0.8em;
  color: #666;
}
.content {
  margin-bottom: 16px;
  line-height: 1.5;
}
.actions {
  display: flex;
  gap: 10px;
  border-top: 1px solid #eee;
  padding-top: 10px;
}
```

### Крок 3. Рендеринг списку в App.jsx

Імпортуємо масив даних і використаємо метод `.map()`.

`App.jsx`:

```jsx
import Post from "./components/molecules/Post/Post";
import { postsData } from "./data";
import styles from "./App.module.css"; // Припустимо, що ви створили контейнер для стрічки

function App() {
  return (
    <div className={styles.appContainer}>
      <h1 style={{ textAlign: "center" }}>Стрічка новин</h1>

      <div className={styles.feed}>
        {postsData.map((post) => (
          <Post
            key={post.id} // КРИТИЧНО ВАЖЛИВО!
            author={post.author}
            content={post.content}
            date={post.date}
            avatar={post.avatar}
          />
          // Або можна використати spread operator: <Post key={post.id} {...post} />
        ))}
      </div>
    </div>
  );
}

export default App;
```

### Контрольні запитання

1. Навіщо потрібен проп `key` у списках React? (Відповідь пов'язана з ідентифікацією елементів при Reconciliation).
2. Чому не рекомендується використовувати індекс масиву (`index`) як ключ? (Це може призвести до помилок при зміні порядку елементів або їх видаленні).
3. У чому різниця між імперативним створенням списку (цикл `for`) та декларативним (`map`)?
4. Як передати всі властивості об'єкта в компонент одним рядком? (Spread attributes: `{...item}`).

### Вимоги до звіту

1. Посилання на GitHub-репозиторій надіслати в Classroom.
2. Обов’язково налаштувати Github pages за інструкцією:
   https://vite.dev/guide/static-deploy#github-pages  
   або Github Actions:
   https://github.com/SurkovKostiantyn/kn22reactvite/blob/master/instructions/ghactions.md
3. В файл `lab_02.md` винести фрагмент коду з `App.jsx`, де використовується метод `.map()`.
4. В файлі `lab_02.md` дати пояснення, що станеться, якщо видалити атрибут `key` (перевірте в консолі розробника).
5. В файлі `lab_02.md` дати відповіді на контрольні питання.
