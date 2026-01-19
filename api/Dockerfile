FROM node:20-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json* ./
RUN npm install --omit=dev
COPY api/src ./src
COPY emails ./emails
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","start"]
