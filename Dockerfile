FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

RUN DATABASE_URL="postgresql://user:password@localhost:5432/job_seeker" \
    npx prisma generate

RUN npm run build

RUN npx playwright install --with-deps chromium
