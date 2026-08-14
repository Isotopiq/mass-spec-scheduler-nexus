# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/emailTemplatePresets.js ./emailTemplatePresets.js
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/package*.json ./

# Persist uploads and create the directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
