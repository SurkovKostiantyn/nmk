# Лабораторна робота №3 (2 години)

**Тема:** Інтеграція системи фільтрації та пошуку. Робота з локальним станом для забезпечення миттєвого відгуку інтерфейсу на дії користувача.

**Мета:** Навчитися використовувати хук `useState` для керування станом додатку; реалізувати функціонал фільтрації масивів даних у реальному часі; опанувати концепцію "керованих компонентів" (controlled components) при роботі з формами.

**Технологічний стек:** React, Vite, CSS Modules, Hooks (``).

## Завдання

1. Додати до існуючої стрічки новин (з Лабораторної №2) поле пошуку для фільтрації постів за вмістом або автором.
2. Реалізувати систему категорій (тегів) для швидкої фільтрації контенту.
3. Використати хук `useState` для збереження поточного запиту пошуку та обраної категорії.
4. Забезпечити відображення "порожнього стану" (Empty State), якщо за заданими фільтрами нічого не знайдено.

## Хід виконання роботи

### Крок 1. Створення компонента SearchBar (Molecule)

Створимо кероване поле вводу, яке буде передавати дані у батьківський компонент.

1. Створіть `src/components/molecules/SearchBar/SearchBar.jsx` та `SearchBar.module.css`.
2. Компонент має приймати `value` та функцію `onChange` через `props`.

`SearchBar.jsx`:

```jsx
import styles from "./SearchBar.module.css";

const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <div className={styles.searchWrapper}>
      <input
        type="text"
        placeholder="Пошук постів..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
    </div>
  );
};

export default SearchBar;
```

### Крок 2. Додавання фільтрації за категоріями

Додамо можливість фільтрувати пости за категоріями (наприклад: "Усі", "Новини", "Робота").

1. Оновіть дані, додавши поле `category` до кожного об'єкта.
2. В `App.jsx` створіть стан для активної категорії:

```jsx
const [activeCategory, setActiveCategory] = useState("All");
```

### Крок 3. Поєднання логіки в App.jsx

Тепер необхідно об'єднати пошуковий запит та фільтр категорій перед рендерингом списку.

`App.jsx`:

```jsx
import { useState } from "react";
import { postsData } from "./data";
import Post from "./components/molecules/Post/Post";
import SearchBar from "./components/molecules/SearchBar/SearchBar";
import styles from "./App.module.css";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Логіка фільтрації
  const filteredPosts = postsData.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || post.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={styles.appContainer}>
      <h1>Стрічка з фільтрацією</h1>

      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <div className={styles.filters}>
        {["All", "News", "Updates"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? styles.active : ""}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.feed}>
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <Post key={post.id} {...post} />)
        ) : (
          <p className={styles.empty}>Нічого не знайдено за вашим запитом.</p>
        )}
      </div>
    </div>
  );
}

export default App;
```

### Контрольні запитання

1. Що таке "підняття стану" (lifting state up) і чому ми використовуємо його для `SearchBar`?
2. Поясніть асинхронну природу оновлення стану в `useState`.
3. Чому для фільтрації ми створюємо нову змінну `filteredPosts`, а не змінюємо оригінальний масив `postsData` у стані?
4. У чому перевага використання керованих компонентів над некерованими при реалізації пошуку?

### Вимоги до звіту

1. Посилання на GitHub-репозиторій з оновленим кодом.
2. Посилання на розгорнуту версію (GitHub Pages/Vercel).
3. У файл `lab_03.md` додати:
   - Фрагмент коду з логікою роботи пошуку.
   - Фрагмент коду з логікою фільтрації.
   - Пояснення, як реалізовано обробку "порожнього результату".
   - Відповіді на контрольні запитання.
