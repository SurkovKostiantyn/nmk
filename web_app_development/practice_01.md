# Практичне заняття №1 (2 години). Робота з Git, конфігурація лінтерів (ESLint, Prettier, Biome) та автоматизація перевірок

## Методичний зв'язок із навчальним планом

- відповідність темам лекцій - закріплює та поглиблює практичні навички Лекції 1 та Лекції 2 (інструментарій якості коду, сучасна екосистема збірки, стандартизація командного процесу);
- практична мета - побудова стандартизованого конвеєра контролю якості коду (Code Quality Pipeline), налаштування захисту репозиторію від некоректного коду та відпрацювання культури роботи з гілками.

## Мета заняття

Опанувати професійні інструменти автоматизованого контролю якості коду у фронтенді (ESLint 9, Prettier, Biome); налаштувати систему git-хуків через Husky та lint-staged для автоматичного лінтингу й перевірки типів перед комітом; відпрацювати командний робочий процес із гілками (Feature Branch Workflow) та стандартизацію комітів за конвенцією Conventional Commits.

## Необхідне програмне забезпечення

- розподілена система контролю версій - Git (версія 2.40+);
- середовище виконання - Node.js (LTS версія 20+) та пакетний менеджер npm;
- редактор коду - Visual Studio Code з розширеннями ESLint та Prettier;
- командний рядок - термінал VS Code (Git Bash / PowerShell / zsh).

---

## План практичного заняття

- налаштування та посилення правил ESLint 9 (новий формат Flat Config);
- інтеграція форматера Prettier та вирішення конфліктів із лінтером;
- аналіз альтернативного високопродуктивного інструментарію Biome;
- автоматизація перевірок якості за допомогою Husky та lint-staged;
- відпрацювання Feature Branch Workflow та складання комітів за правилами Conventional Commits.

---

## Хід виконання роботи

### Крок 1. Конфігурація та посилення правил ESLint 9 (Flat Config)

У сучасних проєктах на Vite використовується нова система конфігурації ESLint 9 — **Flat Config** (`eslint.config.js`). Вона дозволяє точно визначати правила перевірки для різних типів файлів без застарілих прихованих плагінів.

Відкрийте файл `eslint.config.js` у створеному на Лабораторній роботі №1 проєкті та ознайомтеся з його структурою.

Додамо суворі правила контролю якості коду, які запобігають типовим помилкам у React та TypeScript:

```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.husky'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Суворі інженерні правила для чистого коду
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  }
);
```

Перевірте роботу лінтера через термінал:

```bash
npm run lint
```

Якщо у проєкті є невикористані змінні без префікса `_` або змінні з типом `any`, ESLint заблокує процес із детальним зазначенням рядка коду.

---

### Крок 2. Інтеграція форматера Prettier та налаштування сумісності

Лінтер (ESLint) відповідає за **логіку та безпеку коду** (пошук невикористаних змінних, порушення хуків), тоді як форматер (Prettier) відповідає за **стиль оформлення** (довжина рядка, лапки, крапки з комою, відступи). Їх необхідно розділяти.

Встановіть Prettier та утиліту вимкнення конфліктних правил лінтера:

```bash
npm install --save-dev prettier eslint-config-prettier
```

Створіть конфігураційний файл `.prettierrc` у корені проєкту:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Створіть файл ігнорування `.prettierignore` для виключення системних файлів зі списку форматування:

```
dist
node_modules
package-lock.json
.husky
```

Додайте `eslint-config-prettier` у фінал масиву `eslint.config.js`, щоб вимкнути правила ESLint, які можуть конфліктувати з Prettier:

```javascript
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // попередні налаштування...
  eslintConfigPrettier,
);
```

Додайте скрипти форматування до файлу `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

Виконайте форматування всього проєкту однією командою:

```bash
npm run format
```

---

### Крок 3. Огляд високопродуктивного тулінгу нового покоління: Biome

Сучасна фронтенд-індустрія активно рухається до інструментів, написаних мовою Rust. Одним із лідерів є **Biome** (наступник Rome).

Переваги Biome над парою ESLint + Prettier:
- єдиний монолітний інструмент - поєднує форматування, лінтинг та аналіз імпортів в одному пакеті;
- екстремальна швидкість - виконує перевірки у 20–30 разів швидше за інструменти на JavaScript/Node.js;
- нульова конфігурація конфліктів - відсутність потреби у спеціальних пакетах сумісності.

*Примітка для практичного ознайомлення:* Для ініціалізації Biome достатньо виконати `npx @biomejs/biome init`. У нашому курсовому проєкті базовим стандартом залишається ESLint + Prettier через максимальну гнучкість плагінів для екосистеми React 19.

---

### Крок 4. Автоматизація контролю якості: налаштування Husky та lint-staged

Лінтери та форматери неефективні, якщо розробники забувають запускати їх перед створенням коміту. Для гарантії якості використовується інструмент **Husky** (керування git-хуками) та **lint-staged** (запуск перевірок виключно для файлів, які додані в індекс `git add`).

Встановіть необхідні пакети:

```bash
npm install --save-dev husky lint-staged
```

Ініціалізуйте Husky у вашому git-репозиторії:

```bash
npx husky init
```

Ця команда створить папку `.husky/` з базовим хуком `pre-commit` та додасть скрипт `"prepare": "husky"` у `package.json`.

Налаштуйте `lint-staged` у файлі `package.json`, додавши нову секцію на верхній рівень:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix"
  ],
  "*.{json,css,md}": [
    "prettier --write"
  ]
}
```

Оновіть вміст файлу `.husky/pre-commit`:

```bash
npx lint-staged
npx tsc --noEmit
```

Як тепер працює автоматизований захист:
- коли розробник виконує `git commit`, Git автоматично зупиняється і викликає файл `.husky/pre-commit`;
- `lint-staged` перевіряє лише змінені файли, автоматично форматує їх через Prettier та виправляє дрібні помилки ESLint;
- `tsc --noEmit` запускає повну статичну перевірку типів TypeScript без створення зайвих файлів збірки;
- якщо у коді є критична помилка або порушення типів, коміт буде скасовано з виведенням повідомлення про помилку у термінал. Зламаний код фізично не потрапить у репозиторій.

---

### Крок 5. Робота з Git: Feature Branch Workflow та Conventional Commits

У професійних командах заборонено вносити зміни безпосередньо у головну гілку `main`. Робота ведеться за моделлю ізольованих гілок (Feature Branches).

#### 5.1. Стандарт оформлення комітів (Conventional Commits)

Повідомлення комітів мають формуватися за стандартом: `<тип>: <короткий зміст дії>`:
- `feat:` - додавання нового функціоналу або компонента (наприклад, `feat: add user badge component`);
- `fix:` - виправлення помилки (наприклад, `fix: correct layout spacing on mobile`);
- `refactor:` - переписування коду без зміни функціоналу (наприклад, `refactor: extract container styles`);
- `style:` - правки форматування або стилю (наприклад, `style: format with prettier`);
- `chore:` - налаштування збірки, залежностей або конфігурацій (наприклад, `chore: configure husky pre-commit hook`);
- `docs:` - оновлення документації чи README.

#### 5.2. Практичний сценарій розробки фічі

Створіть нову гілку для додавання нового віджета:

```bash
git checkout -b feature/setup-code-quality
```

Перевірте статус:

```bash
git status
```

Зробіть навмисну помилку для перевірки хука: відкрийте `src/App.tsx` та додайте змінну з типом `any`:

```typescript
const brokenData: any = 'test';
```

Спробуйте додати файл та зафіксувати коміт:

```bash
git add src/App.tsx
git commit -m "feat: add broken variable test"
```

Переконайтеся, що Husky та ESLint перехопили дію, вивели помилку `@typescript-eslint/no-explicit-any` і скасували створення коміту.

Видаліть некоректний рядок із `src/App.tsx`. Збережіть файл і повторіть операцію:

```bash
git add .
git commit -m "chore: setup eslint, prettier and husky pre-commit hooks"
```

Коміт буде успішно створено після проходження всіх автоматичних перевірок.

#### 5.3. Публікація гілки та злиття (Merge)

Надішліть вашу гілку до віддаленого репозиторію на GitHub:

```bash
git push -u origin feature/setup-code-quality
```

Поверніться до гілки `main` та виконайте злиття:

```bash
git checkout main
git merge feature/setup-code-quality
```

Після успішного злиття видаліть локальну тимчасову гілку:

```bash
git branch -d feature/setup-code-quality
```

Оновіть віддалену гілку `main`:

```bash
git push origin main
```

---

## Завдання для самостійного виконання

- налаштування правила заборони консолі - перевірте дію правила `'no-console'`: додайте `console.log('test')` у файл `src/main.tsx` та спробуйте створити коміт; переконайтеся у виведенні попередження;
- додавання скрипта перевірки типів - додайте у `package.json` скрипт `"typecheck": "tsc --noEmit"` для швидкого ручного запуску аудиту типів;
- конфігурація VS Code - створіть у проєкті папку `.vscode` з файлом `settings.json`, що автоматично вмикає форматування при збереженні файлу:
  ```json
  {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  }
  ```
- створення функціональної гілки - створіть гілку `feature/project-readme`, створіть детальний файл `README.md` із описом проєкту, командами запуску та скриншотом, зафіксуйте за допомогою Conventional Commit (`docs: create project readme`) та злийте в `main`.

---

## Контрольні запитання

- у чому полягає фундаментальна різниця між задачами лінтера (ESLint) та форматера коду (Prettier);
- навіщо у конфігурації ESLint 9 використовувати `eslint-config-prettier` і до яких проблем може призвести його відсутність;
- як інструменти Husky та lint-staged оптимізують час перевірки коду порівняно з повним прогоном `npm run lint` по всьому репозиторію;
- яка мета використання специфікації Conventional Commits у сучасних інженерних командах;
- чому пряма робота та створення комітів у гілку `main` вважається неприпустимим антипатерном у командній розробці?

---

## Вимоги до оформлення звіту

- посилання на репозиторій - надати посилання на GitHub-репозиторій із налаштованим конвеєром контролю якості;
- історія комітів - надати скриншот журналу комітів (`git log --oneline` або вкладка Commits на GitHub), що демонструє дотримання конвенції Conventional Commits;
- підтвердження роботи хуків - надати знімок екрана термінала, який фіксує блокування коміту за допомогою Husky при спробі зберегти помилку ESLint;
- фрагменти конфігурацій - навести у звіті код файлів `eslint.config.js`, `.prettierrc` та секцію `lint-staged` із `package.json`;
- відповіді на питання - надати ґрунтовні письмові відповіді на всі контрольні запитання.
