# Лабораторна робота №1 (2 години). Ініціалізація та побудова архітектури React-проєкту на Vite та TypeScript

## Методичний зв'язок із навчальним планом

- відповідність темам лекцій - робота спирається на теоретичний базис Лекції 1 (декларативна парадигма `UI = f(state)`, SPA-архітектура, чистота компонентів) та Лекції 2 (інструментарій Vite, модульна екосистема Node.js, стандарти організації коду);
- місце в курсовому проєкті - створення базового технологічного фундаменту та початкової архітектури наскрізного навчального веб-додатка, який розвиватиметься протягом усього семестру.

## Мета роботи

Опанувати процес розгортання сучасного React-застосунку за допомогою збирача нового покоління Vite з підтримкою TypeScript; спроєктувати модульну файлову структуру, налаштувати безпечні шляхи імпорту через аліаси та створити перші типізовані базові компоненти інтерфейсу без використання застарілих бібліотек і шаблонів.

## Технологічний стек

- платформа виконання - Node.js (версія LTS 20+);
- бібліотека інтерфейсу - React 19;
- мова програмування - TypeScript 5+;
- інструмент збірки та локальний сервер - Vite 6+;
- стилізація - сучасний модульний CSS із застосуванням системних скидань стилів (CSS Reset).

---

## Завдання лабораторної роботи

- розгортання проєкту - ініціалізація нового застосунку за допомогою Vite з використанням офіційного шаблону `react-ts`;
- очищення та конфігурація - видалення демонстраційного бойлерплейту, оптимізація базових файлів та налаштування метаданих;
- конфігурація аліасів шляхів (Path Aliases) - налаштування розпізнавання шляху `@/*` у конфігураціях Vite та TypeScript;
- модульне зонування архітектури - створення професійної ієрархії каталогів для масштабованого проєкту;
- розробка типізованих компонентів - створення базових структурних елементів інтерфейсу із суворою типізацією пропсів та дочірніх елементів;
- збирання стартового екрана - композиція створених компонентів у головному файлі застосунку відповідно до принципу чистоти `UI = f(state)`;
- верифікація збірки - перевірка роботи локального dev-сервера та запуск повної типізованої збірки проєкту на рівні production.

---

## Хід виконання роботи

### Крок 1. Ініціалізація проєкту за допомогою Vite та TypeScript

Відмовтеся від застарілих інструментів (Create React App) на користь сучасного стандарту індустрії — Vite. Відкрийте термінал у вашій робочій директорії та виконайте команду генерації:

```bash
npm create vite@latest devflow-app -- --template react-ts
```

Перейдіть до створеного каталогу та встановіть початкові пакети:

```bash
cd devflow-app
npm install
```

Ознайомтеся зі структурою створеного проєкту:
- `package.json` - маніфест проєкту, перелік залежностей та скриптів запуску;
- `vite.config.ts` - конфігураційний файл збирача Vite;
- `tsconfig.json` - коренева конфігурація компілятора TypeScript, яка посилається на `tsconfig.app.json` (налаштування коду застосунку) та `tsconfig.node.json` (налаштування середовища збірки);
- `index.html` - єдина вхідна точка односторінкового застосунку (SPA), яка містить контейнер `<div id="root"></div>` та безпосередній імпорт модуля `src/main.tsx`.

Запустіть середовище розробки:

```bash
npm run dev
```

Переконайтеся у швидкому старті сервера та відкрийте запропоновану локальну адресу у веббраузері (зазвичай `http://localhost:5173`).

---

### Крок 2. Очищення шаблонного коду та налаштування базових стилів

Перед побудовою власної архітектури необхідно видалити демонстраційні файли, що постачаються з шаблоном:
- видаліть демонстраційну іконку `src/assets/react.svg`;
- видаліть файл стилів `src/App.css`;
- очистіть вміст `src/index.css` та замініть його на сучасне базове скидання стилів (CSS Reset):

```css
/* src/index.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #1a1a1a;
  background-color: #f8fafc;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

---

### Крок 3. Налаштування аліасів абсолютних імпортів (`@/*`)

Використання відносних шляхів на кшталт `../../../components/Button` є антипатерном, що ускладнює рефакторинг. Необхідно налаштувати лаконічний аліас `@`, який вказує на кореневу папку `src`.

Встановіть типи для системного модуля `node`:

```bash
npm install --save-dev @types/node
```

Оновіть конфігураційний файл `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Додайте конфігурацію шляхів до файлу `tsconfig.app.json` всередину секції `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Тепер будь-який файл із папки `src` можна імпортувати через зручний префікс, наприклад: `import { Button } from '@/components/common/Button'`.

---

### Крок 4. Організація модульної архітектури каталогів

Для наскрізного проєкту створимо масштабовану структуру за принципом розподілу обов'язків:
- `src/components/common` - загальні UI-елементи, які не містять бізнес-логіки (кнопки, інпути, модальні вікна, картки);
- `src/layouts` - шаблони розмітки сторінок (шапка, сайдбар, підвал, центральний контейнер);
- `src/types` - загальносистемні типи даних та інтерфейси TypeScript;
- `src/features` - модулі бізнес-функціоналу (каталог, кошик, авторизація, замовлення);
- `src/utils` - чисті утилітарні функції (форматування цін, робота з датами, валідатори).

Створіть відповідні папки всередині директорії `src`:

```bash
mkdir -p src/components/common src/layouts src/types src/features src/utils
```

---

### Крок 5. Створення типів та базових презентаційних компонентів

Створимо моделі даних та компоненти для відображення інформаційної панелі навчального проєкту.

Створіть файл системних типів `src/types/index.ts`:

```typescript
// src/types/index.ts
export interface ProjectInfo {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'in-progress' | 'planned';
  createdAt: string;
}

export type CardVariant = 'default' | 'highlighted' | 'bordered';
```

Створіть компонент контейнера `src/layouts/Container.tsx` для централізації контенту на екрані:

```tsx
// src/layouts/Container.tsx
import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthMap = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

export const Container: React.FC<ContainerProps> = ({ children, maxWidth = 'lg' }) => {
  return (
    <div
      style={ {
        width: '100%',
        maxWidth: maxWidthMap[maxWidth],
        margin: '0 auto',
        padding: '0 20px',
      } }
    >
      {children}
    </div>
  );
};
```

Створіть компонент шапки додатка `src/layouts/Header.tsx`:

```tsx
// src/layouts/Header.tsx
import React from 'react';
import { Container } from './Container';

interface HeaderProps {
  appName: string;
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, version }) => {
  return (
    <header
      style={ {
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 0',
        marginBottom: '32px',
      } }
    >
      <Container>
        <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
          <div>
            <h1 style={ { fontSize: '20px', fontWeight: 700, color: '#0f172a' } }>{appName}</h1>
            <p style={ { fontSize: '13px', color: '#64748b' } }>Навчальний семестровий проєкт</p>
          </div>
          <span
            style={ {
              fontSize: '12px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontWeight: 600,
            } }
          >
            v{version}
          </span>
        </div>
      </Container>
    </header>
  );
};
```

Створіть перевикористовувану карточку `src/components/common/Card.tsx`:

```tsx
// src/components/common/Card.tsx
import React from 'react';
import { CardVariant } from '@/types';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  variant?: CardVariant;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  variant = 'default',
  onClick,
}) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'highlighted':
        return '#3b82f6';
      case 'bordered':
        return '#cbd5e1';
      default:
        return 'transparent';
    }
  };

  return (
    <div
      onClick={onClick}
      style={ {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: variant === 'highlighted' ? '0 10px 15px -3px rgba(59, 130, 246, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        border: `1px solid ${getBorderColor()}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      } }
    >
      {title && (
        <h3
          style={ {
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '12px',
            color: '#1e293b',
          } }
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
```

---

### Крок 6. Збирання головного компонента `App.tsx`

Відкрийте `src/App.tsx` та зберіть головну сторінку застосунку відповідно до декларативної парадигми:

```tsx
// src/App.tsx
import React, { useState } from 'react';
import { Header } from '@/layouts/Header';
import { Container } from '@/layouts/Container';
import { Card } from '@/components/common/Card';
import { ProjectInfo } from '@/types';

const INITIAL_PROJECTS: ProjectInfo[] = [
  {
    id: '1',
    title: 'Модуль каталогу продуктів',
    description: 'Декларативне відображення списків, фільтрація та сортування за критеріями.',
    status: 'in-progress',
    createdAt: '2026-10-13',
  },
  {
    id: '2',
    title: 'Клієнтський кошик замовлень',
    description: 'Управління локальним станом за допомогою хука useReducer та іммутабельність.',
    status: 'planned',
    createdAt: '2026-10-20',
  },
  {
    id: '3',
    title: 'Інтеграція REST API та кешування',
    description: 'Асинхронний фетчинг даних через TanStack Query та мутація серверного стану.',
    status: 'planned',
    createdAt: '2026-11-05',
  },
];

export function App() {
  const [projects] = useState<ProjectInfo[]>(INITIAL_PROJECTS);

  const getStatusBadge = (status: ProjectInfo['status']) => {
    const isProgress = status === 'in-progress';
    return (
      <span
        style={ {
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: isProgress ? '#fef3c7' : '#f1f5f9',
          color: isProgress ? '#b45309' : '#475569',
        } }
      >
        {isProgress ? 'В роботі' : 'Заплановано'}
      </span>
    );
  };

  return (
    <>
      <Header appName="DevFlow Workspace" version="1.0.0" />
      <main style={ { flex: 1, paddingBottom: '40px' } }>
        <Container>
          <div style={ { marginBottom: '24px' } }>
            <h2 style={ { fontSize: '24px', fontWeight: 700, color: '#0f172a' } }>
              Архітектура та модулі проєкту
            </h2>
            <p style={ { color: '#64748b' } }>
              Усі модулі спроєктовано згідно з декларативною парадигмою React 19 та суворою типізацією TypeScript.
            </p>
          </div>

          <div
            style={ {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            } }
          >
            {projects.map((project) => (
              <Card
                key={project.id}
                title={project.title}
                variant={project.status === 'in-progress' ? 'highlighted' : 'bordered'}
              >
                <p style={ { color: '#475569', fontSize: '14px', marginBottom: '16px' } }>
                  {project.description}
                </p>
                <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                  {getStatusBadge(project.status)}
                  <small style={ { color: '#94a3b8' } }>{project.createdAt}</small>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </main>
    </>
  );
}

export default App;
```

---

### Крок 7. Перевірка статичної типізації та виробнича збірка

Зупиніть локальний сервер комбінацією `Ctrl + C` та запустіть команду компіляції та збірки проєкту:

```bash
npm run build
```

Зверніть увагу:
- команда викликає `tsc -b && vite build`;
- якщо у типах TypeScript є хоча б одна помилка або розбіжність, компілятор зупинить процес із детальним описом проблеми;
- при успішному виконанні у корені створюється оптимізована директорія `dist`, готова для деплою.

Запустіть попередній перегляд зібраного проєкту:

```bash
npm run preview
```

---

## Завдання для самостійної роботи

- створення компонента бейджа - винесіть логіку відображення статусів (`getStatusBadge`) у самостійний типізований компонент `Badge.tsx` всередині папки `src/components/common`;
- додавання варіантів кольору - додайте до компонента `Badge` типізований проп `variant: 'success' | 'warning' | 'info'` з відповідними колірними темами;
- розширення моделі даних - додайте до інтерфейсу `ProjectInfo` поле пріоритету `priority: 'low' | 'medium' | 'high'` та відобразіть його у картці;
- створення футера - створіть компонент `Footer.tsx` у папці `src/layouts` з інформацією про автора та навчальний рік, імпортуйте та відобразіть його у `App.tsx`.

---

## Контрольні запитання

- які технічні переваги забезпечує використання збирача Vite у порівнянні з класичним Create React App на базі Webpack;
- як конфігурація `paths` у `tsconfig.app.json` та секція `resolve.alias` у `vite.config.ts` забезпечують безпечну роботу аліасів імпорту `@/*`;
- поясніть значення використання пропу `children` типу `React.ReactNode` для створення гнучких компонентів-обгорток (Slot-патерн);
- чому в React суворо заборонено прямо мутувати масив `projects` (наприклад, через метод `.push()`), а натомість використовується функція оновлення стану;
- яка роль файлу `index.html` у структурі односторінкового застосунку (SPA) під час обробки браузером?

---

## Вимоги до оформлення звіту

- посилання на репозиторій - надати активне посилання на створений репозиторій проєкту на платформі GitHub;
- знімок екрана - додати скриншот успішного запуску локального dev-сервера у терміналі та зовнішнього вигляду сторінки у браузері;
- код створених модулів - навести у звіті код файлів `vite.config.ts`, `src/types/index.ts` та власноруч створеного компонента `Badge.tsx`;
- відповіді на питання - надати письмово розгорнуті та аргументовані відповіді на всі контрольні запитання.
