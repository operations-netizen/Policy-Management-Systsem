FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DISABLE_BACKEND_VITE=true
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "_core/index.js"]
  