# FROM oven/bun:1-alpine AS base
# WORKDIR /app

# FROM base AS deps


# COPY package.json bun.lock ./
# COPY prisma ./prisma

# RUN bun install

# FROM oven/bun:1-alpine AS release
# WORKDIR /app

# COPY --from=deps /app/node_modules ./node_modules

# COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma


# COPY prisma ./prisma
# COPY src ./src
# COPY package.json ./
# COPY generated generated

# ENV NODE_ENV=production
# CMD ["bun", "start"]



FROM oven/bun:1-alpine AS base
WORKDIR /app


# ---------- Dependencies ----------
FROM base AS deps

COPY package.json bun.lock ./
COPY prisma ./prisma

RUN bun install
RUN bunx prisma generate


# ---------- Release ----------
FROM oven/bun:1-alpine AS release
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

COPY src ./src
COPY package.json ./
COPY generated ./generated

ENV NODE_ENV=production

CMD ["bun", "start"]
