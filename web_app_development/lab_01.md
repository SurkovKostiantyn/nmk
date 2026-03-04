# Лабораторна робота №1 (2 години)

**Тема:** Створення каркаса додатка та базових UI-компонентів
Проєктування архітектури React-додатка, використання методології Atomic Design та стилізація через CSS Modules.

**Мета:** Створити каркас майбутнього веб-застосунку (соціальна мережа або таск-менеджер), розробити набір перевикористовуваних "атомарних" компонентів (Button, Input, Card) та налаштувати їх стилізацію.

**Технологічний стек:** React, Vite, CSS Modules.

## Завдання

1. Розгорнути порожній проєкт на Vite.
2. Налаштувати структуру папок згідно з методологією Atomic Design.
3. Створити базові UI-компоненти (атоми): `Button`, `Input`, `Typography`.
4. Створити компонент-обгортку (молекулу): `Card`.
5. Зібрати з компонентів статичну сторінку (наприклад, форму входу або картку профілю) в `App.jsx`.

## Хід виконання роботи

### Крок 1. Ініціалізація та очищення проєкту

Використовуючи навички з Практичного заняття 1, створіть новий проєкт або використайте існуючий.

1. Переконайтеся, що проєкт створено через Vite:
   npm create vite@latest lab1-react -- --template react
2. Очистка (Cleanup):
   Видаліть файли `src/assets/react.svg`, `src/App.css`.
   Очистіть `src/index.css` (або залиште лише базовий скидання стилів).
   У `src/App.jsx` видаліть весь код і залиште лише порожній `div` або фрагмент.

### Крок 2. Архітектура Atomic Design

Для організації файлів ми використаємо підхід Atomic Design, який передбачає поділ інтерфейсу на дрібні незалежні частини.
Створіть у папці `src` наступну структуру:
src/
|-- components/
| |-- atoms/ (Кнопки, інпути, іконки, текст)
| |-- molecules/ (Поля форм, картки, списки)
| |-- organisms/ (Хедер, футер, складні форми)
| |-- pages/ (Сторінки цілком)

### Крок 3. Створення компонентів (Atoms) з CSS Modules

React фокусується на компонентній архітектурі, де кожен елемент містить свою логіку та розмітку. Ми також використаємо CSS Modules для ізоляції стилів, щоб уникнути конфліктів імен.

#### 3.1. Компонент Button

Створіть файли `src/components/atoms/Button/Button.jsx` та `Button.module.css`.

Button.jsx:

```jsx
import styles from './Button.module.css';
// Використовуємо деструктуризацію пропсів
const Button = ({ children, onClick, variant = 'primary' }) => {
return (
<button
className={`${styles.button} ${styles[variant]}`}
onClick={onClick}

> {children}
> </button>
> );
> };

export default Button;
```

Button.module.css:

```css
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: opacity 0.3s;
}

.button:hover {
  opacity: 0.8;
}

.primary {
  background-color: #007bff;
  color: white;
}

.secondary {
  background-color: #6c757d;
  color: white;
}
```

#### 3.2. Компонент Input

Створіть `src/components/atoms/Input/Input.jsx` та `Input.module.css`. Компонент має приймати пропси `type`, `placeholder` та `label`.
Завдання: Реалізуйте `Input` самостійно.
Він має рендерити тег `<input>` та опціональний `<label>`, загорнуті у `div`. Стилізуйте його, щоб він мав відступи та рамку.

### Крок 4. Створення компонента Card (Molecule)

Компонент `Card` слугуватиме контейнером для іншого контенту. Він використовує спеціальний проп `children`, щоб відобразити все, що передано всередину нього.

Card.jsx:

```jsx
import styles from "./Card.module.css";

const Card = ({ children }) => {
  return <div className={styles.card}>{children}</div>;
};

export default Card;
```

Card.module.css:

```css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  max-width: 400px;
  margin: 20px auto;
}
```

### Крок 5. Складання інтерфейсу в App.jsx

Тепер, використовуючи декларативний підхід React, зберіть сторінку "Входу в систему" (Login UI) у головному файлі.

App.jsx:

```jsx
import Button from "./components/atoms/Button/Button";
import Input from "./components/atoms/Input/Input"; // Ваш компонент
import Card from "./components/molecules/Card/Card";

function App() {
  const handleLogin = () => {
    alert("Логіка входу буде реалізована пізніше");
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Card>
        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
          Ласкаво просимо
        </h2>

        <div style={{ marginBottom: "15px" }}>
          {/* Використовуйте ваш компонент Input тут */}
          <Input type="email" placeholder="Email" />
        </div>

        <div style={{ marginBottom: "20px" }}>
          {/* Використовуйте ваш компонент Input тут */}
          <Input type="password" placeholder="Пароль" />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Button onClick={handleLogin} variant="primary">
            Увійти
          </Button>
          <Button variant="secondary">Реєстрація</Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
```

### Крок 6. Фіксація в Git

1. Зробіть коміт зі структурою папок: `git commit -m "Setup Atomic Design structure"`.
2. Зробіть коміт з готовими компонентами: `git commit -m "Add basic atoms and molecules"`.

### Контрольні запитання

1. Що таке Atomic Design і навіщо ми розділяємо компоненти на атоми та молекули?
2. Як працюють CSS Modules і як вони вирішують проблему глобальних імен класів?
3. Що таке `props.children` і в якому компоненті цієї лабораторної роботи ми його використали?
4. Чому атрибут HTML `class` у JSX записується як `className`?

### Вимоги до звіту

1. Посилання на GitHub-репозиторій надіслати в Classroom 2. В файл lab1.md винести фрагмент коду 3. В файлі lab1.md дати відповіді на контрольні питання
