# Лабораторна робота №5 (2 години)

**Тема:** Створення системи автентифікації. Реалізація форм входу/реєстрації та захищених маршрутів (Protected Routes) за допомогою Context API.

**Мета:** Навчитися вирішувати проблему "prop drilling" за допомогою глобального керування станом (Context API); реалізувати логіку авторизації (вхід, реєстрація, вихід); опанувати патерн Higher-Order Component (HOC) для створення захищених маршрутів, що обмежують доступ неавторизованих користувачів до приватних сторінок додатку.

**Технологічний стек:** React, Vite, React Router v6, Context API, CSS Modules, Hooks (`useState`, `useContext`, `useNavigate`).

## Завдання

1. Створити `AuthContext` та компонент-провайдер `AuthProvider` для зберігання глобального стану користувача.
2. Розробити сторінки з формами входу (Login) та реєстрації (Register), використовуючи базові атоми та молекули з попередніх робіт.
3. Створити компонент-обгортку `ProtectedRoute` для захисту маршрутів.
4. Інтегрувати створену систему автентифікації у багатосторінкову навігацію (з Лабораторної роботи №4).
5. Забезпечити автоматичне перенаправлення (redirect) користувачів після успішного входу або при спробі доступу до захищених сторінок без авторизації.

## Хід виконання роботи

### Крок 1. Створення глобального стану через Context API

Для того, щоб стан авторизації (наприклад, ім'я користувача або статус логіну) був доступний у будь-якому компоненті без необхідності прокидати пропси через багато рівнів (prop drilling), ми використаємо Context API.
Створіть папку `src/context` та файл `AuthContext.jsx`.

Реалізуйте створення контексту та провайдера:

```jsx
import { createContext, useState } from "react";

// Створення контексту
export const AuthContext = createContext();

// Компонент-провайдер
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Крок 2. Обгортання додатку в Провайдер

Щоб контекст запрацював, необхідно огорнути ним головний компонент вашого додатку (бажано на рівні `main.jsx` або `App.jsx`).

У `src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext"; // Імпорт Провайдера

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

### Крок 3. Реалізація захищеного маршруту (ProtectedRoute)

В архітектурі SPA безпека та обмеження доступу реалізуються через патерн "HOC" (Higher-Order Component). Він перевіряє стан авторизації перед відображенням контенту.

Створіть файл `src/components/hoc/ProtectedRoute.jsx`:

```jsx
import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ redirectPath = "/login", children }) => {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    // replace: true є критично важливим для чистоти історії браузера
    return <Navigate to={redirectPath} replace />;
  }

  // Якщо компонент має children, рендеримо їх, інакше рендеримо Outlet для вкладених маршрутів
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
```

### Крок 4. Створення сторінки входу (Login)

Використайте керовані компоненти для створення форми. При успішному вході викличте функцію `login` з контексту та перенаправте користувача.

`Login.jsx`:

```jsx
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
// Імпортуйте ваші Input та Button з попередніх лаб

const Login = () => {
  const [email, setEmail] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Імітація перевірки даних (у Лаб №6 тут буде запит до API)
    if (email) {
      login({ email });
      navigate("/profile", { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Вхід в систему</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <button type="submit">Увійти</button>
    </form>
  );
};

export default Login;
```

### Крок 5. Налаштування маршрутизації в App.jsx

Оновіть ваш файл `App.jsx`, щоб захистити певні маршрути (наприклад, Профіль та налаштування).

```jsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/templates/MainLayout/MainLayout";
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Profile from "./pages/Profile/Profile";
import ProtectedRoute from "./components/hoc/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />

        {/* Захищений маршрут */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile/*" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
```

## Контрольні запитання

1. Яку архітектурну проблему (пов'язану з передачею пропсів) вирішує використання Context API?
2. Чому для глобального управління станом у складних додатках іноді обирають Redux/Zustand замість вбудованого Context API?
3. Яка роль патерна Higher-Order Component (HOC) при реалізації захищених маршрутів (Protected Routes)?
4. Чому при перенаправленні неавторизованого користувача використовується властивість `replace: true` у компоненті `Navigate`? (Поясніть вплив на стек історії браузера).

## Вимоги до звіту

1. Актуальне посилання на GitHub-репозиторій з кодом надіслати в Classroom.
2. Посилання на розгорнуту версію додатку (Vercel або GitHub Pages).
3. У файл `lab_05.md` винести фрагменти коду:
   - Конфігурацію вашого `AuthContext.jsx`.
   - Реалізацію компонента `ProtectedRoute.jsx`.
4. В файлі `lab_05.md` дати вичерпні відповіді на контрольні запитання.
