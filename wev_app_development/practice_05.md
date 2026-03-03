# Практичне заняття №5 (2 години)

**Тема:** Побудова ієрархії компонентів
Практична задача з декомпозиції складного макета на дрібні, перевикористовувані модулі.

**Мета**: Навчитися аналізувати макети інтерфейсу (UI) та розбивати їх на деревовидну структуру React-компонентів; зрозуміти принципи розподілу відповідальності (Separation of Concerns) між Smart (контейнерними) та Dumb (презентаційними) компонентами; опанувати механізм передачі даних зверху вниз (Prop Drilling).

**Необхідні інструменти**: Текстовий редактор (VS Code), Node.js, браузер з встановленим розширенням React Developer Tools.

## План заняття

1. Аналіз структури веб-сторінки та виділення логічних блоків.
2. Створення презентаційних (Dumb) компонентів без внутрішнього стану.
3. Розробка композиційних компонентів, що об'єднують дрібніші елементи.
4. Створення контейнерного (Smart) компонента для управління станом.
5. Налагодження передачі даних через систему Props.

## Хід виконання роботи

### 1. Аналіз структури веб-сторінки

Уявімо, що перед нами стоїть завдання розробити сторінку профілю користувача ("User Dashboard"). Дивлячись на типовий макет, ми маємо розбити його на компоненти:

- Навігаційна панель (Sidebar/Navbar).
- Головний контейнер профілю (ProfileContainer).
- Блок з інформацією про користувача (UserInfo).
- Блок зі списком останніх активностей (ActivityList).
- Окремий елемент активності (ActivityItem).

### 2. Створення презентаційних (Dumb) компонентів

Презентаційні компоненти відповідають виключно за те, ЯК виглядають речі (UI). Вони отримують дані через `props` і повертають JSX. Вони не роблять запитів до мережі і рідко мають власний стан.

Створимо найнижчий рівень структури — `ActivityItem`:

```jsx
// src/components/ActivityItem.jsx
import React from "react";

const ActivityItem = ({ action, date }) => {
  return (
    <div style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
      <p style={{ margin: 0, fontWeight: "bold" }}>{action}</p>
      <small style={{ color: "gray" }}>{date}</small>
    </div>
  );
};

export default ActivityItem;
```

Створимо ще один презентаційний компонент `UserInfo`:

```jsx
// src/components/UserInfo.jsx
import React from "react";

const UserInfo = ({ name, email, role }) => {
  return (
    <div
      style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}
    >
      <h2>{name}</h2>
      <p>Email: {email}</p>
      <p>
        Посада: <strong>{role}</strong>
      </p>
    </div>
  );
};

export default UserInfo;
```

### 3. Розробка композиційних компонентів

Наступний рівень ієрархії об'єднує дрібніші компоненти (рендер списку).
Створимо `ActivityList`:

```jsx
// src/components/ActivityList.jsx
import React from "react";
import ActivityItem from "./ActivityItem";

const ActivityList = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return <p>Немає останніх активностей.</p>;
  }

  return (
    <div>
      <h3>Остання активність</h3>
      {activities.map((item) => (
        <ActivityItem key={item.id} action={item.action} date={item.date} />
      ))}
    </div>
  );
};

export default ActivityList;
```

### 4. Створення контейнерного (Smart) компонента

Контейнерний компонент (часто це Сторінка) відповідає за те, ЩО роблять речі (Логіка, Стан). Він безпосередньо взаємодіє зі станом (`useState`) або хуками отримання даних.

Створимо `ProfilePage`:

```jsx
// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import UserInfo from "../components/UserInfo";
import ActivityList from "../components/ActivityList";

const ProfilePage = () => {
  // Контейнер тримає стан
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);

  // Імітація запиту на сервер
  useEffect(() => {
    // В реальному житті тут був би fetch() або axios
    setUserData({
      name: "Іван Бойко",
      email: "ivan.boyko@example.com",
      role: "Frontend Розробник",
    });

    setActivities([
      { id: 1, action: "Увійшов у систему", date: "Сьогодні, 10:00" },
      { id: 2, action: "Оновив профіль", date: "Вчора, 14:30" },
      { id: 3, action: "Завантажив звіт", date: "12 Вересня" },
    ]);
  }, []);

  // Поки дані "завантажуються"
  if (!userData) {
    return <div>Завантаження профілю...</div>;
  }

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <aside style={{ flex: 1 }}>
        <UserInfo
          name={userData.name}
          email={userData.email}
          role={userData.role}
        />
      </aside>
      <main style={{ flex: 2 }}>
        <ActivityList activities={activities} />
      </main>
    </div>
  );
};

export default ProfilePage;
```

Використання React Developer Tools на цьому етапі покаже вам дерево:
`ProfilePage -> [UserInfo, ActivityList -> [ActivityItem, ActivityItem, ActivityItem]]`.

## Завдання для самостійного виконання

1. Взяти макет картки товару інтернет-магазину (який містить: Зображення, Назву, Опис, Ціну, Блок з рейтингом (зірочки), Кнопку "Купити").
2. Самостійно декомпозувати цей макет мінімум на 3 рівні ієрархії (Наприклад: `ProductContainer` -> `ProductDetails`, `ProductActions` -> `StarRating`, `Button`).
3. Визначити, де саме в цій ієрархії повинен зберігатися стан "Кількості товару" (Quantity), яке обирає користувач перед тим як натиснути "Купити".
4. Написати код цих компонентів та продемонструвати передачу даних (назви товару, ціни тощо) з контейнера у презентаційні елементи через `props`.

## Контрольні запитання

1. Які основні відмінності між презентаційним (Dumb) та контейнерним (Smart) компонентами у React?
2. Поясніть принцип "Джерело істини" (Single Source of Truth) при побудові компонентної ієрархії. Де зазвичай має зберігатися спільний стан (State)?
3. Чому функція ітерації по масиву (`.map()`) зазвичай знаходиться на рівні проміжних композиційних компонентів (наприклад, `ActivityList`), а не всередині атомарних (наприклад, `ActivityItem`)?
4. Що таке явище Prop Drilling і коли воно стає проблемою при глибокій ієрархії компонентів?
5. Наведіть критерії, спираючись на які ви приймаєте рішення винести окремий шматок JSX-розмітки у новий незалежний файл компонента.
