# Dockerfile
FROM node:20-alpine

# Метадані
LABEL maintainer="lab06-student"
LABEL version="1.0"

# Робоча директорія
WORKDIR /app

# Копіювання залежностей окремо (кешування шарів)
COPY package*.json ./
RUN npm install --production

# Копіювання коду застосунку
COPY . .

# Відкриття порту
EXPOSE 3000

# Змінна оточення
ENV APP_VERSION=1.0.0
ENV NODE_ENV=production

# Команда запуску
CMD ["node", "server.js"]
