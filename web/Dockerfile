FROM node:20-alpine AS build
ARG YOUTUBE_VIDEO_ID
ENV YOUTUBE_VIDEO_ID=$YOUTUBE_VIDEO_ID
WORKDIR /app
COPY package.json ./
COPY astro.config.mjs tailwind.config.mjs postcss.config.cjs ./
COPY src ./src
COPY public ./public
# Проверка: какой index.astro попал в образ (видно в логе сборки)
RUN sha256sum /app/src/pages/index.astro || true
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
