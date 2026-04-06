# Шаблон для генерації технічних ілюстрацій

Цей файл містить детальний промпт для нейромережі, що дозволяє створювати професійні та зрозумілі ілюстрації для навчальних матеріалів (CSS, Flexbox, Grid, Box Model тощо).

## Детальний Промпт (Template)

**Копіюйте та адаптуйте цей текст:**

> "Create a professional technical illustration for text. 
> **TEXT:** [ВСТАВИТИ_ТЕКСТ]
> **Style:** Minimalist, flat vector, modern UI/UX design diagram.
> **Background:** Dark theme, deep charcoal or navy blue (#1a1a1a).
> **Details:** [ВСТАВИТИ_ДОДАТКОВІ_ДЕТАЛІ]
> **Color Palette:** High contrast. Main elements in bright blue (#3b82f6) and emerald green (#10b981). Text in clean white.
> **Composition:** 16:9 aspect ratio, centered, clean margins, no cluttered background. 
> **Quality:** 4k, crisp lines, no shadows or gradients unless necessary for depth."

---

## Робочий процес (Flow)

Кожного разу, коли потрібно додати ілюстрацію до лекції або лабораторної роботи:

1. **Виберіть тему**: Визначте, який саме фрагмент коду або концепцію потрібно візуалізувати.
2. **Адаптуйте промпт**: Підставте потрібні значення у квадратні дужки `[ ]` у шаблоні вище.
3. **Генерація**:
   - Надішліть цей файл (`illustrations.md`) та файл з текстом лекції/лаби в чат.
   - Попросіть ШІ згенерувати картинку за цим промптом.
4. **Збереження**:
   - Ші збереже картинку в папку `media` відповідного курсу (наприклад, `web_technology/media/`).
   - Назва файлу має бути лаконічною та описовою (наприклад, `flexbox_align.png`).
5. **Впровадження**:
   - ШІ автоматично оновить ваш `.md` файл, вставивши посилання на картинку: `![Опис](media/filename.png)`.

---

## Приклади тем
- **Box Model**: Візуалізація content, padding, border, margin.
- **Grid Layout**: Візуалізація колонок, рядів та gap.
- **Position Absolute/Relative**: Взаємодія елементів у координатах.
- **CSS Cascade**: Вага селекторів у вигляді діаграми.
