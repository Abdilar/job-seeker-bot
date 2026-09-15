# BUILD STAGE
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://user:password@localhost:5432/job_seeker" \
    npx prisma generate

RUN npm run build



# RUNNER STAGE
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json .

RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

RUN DATABASE_URL="postgresql://user:password@localhost:5432/job_seeker" \
    npx prisma generate

RUN npx playwright install --with-deps chromium