FROM node:20-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm install -g corepack@0.24.1 && corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter backend build

EXPOSE 3001

CMD ["pnpm", "--filter", "backend", "start"]
