# BACKEND/Dockerfile
FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x ./docker-entrypoint.sh || true
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
