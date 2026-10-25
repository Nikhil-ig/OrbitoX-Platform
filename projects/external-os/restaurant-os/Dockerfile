# syntax=docker/dockerfile:1.7
# 🪐 RestaurantOS — Production Hospitality Runtime Container
# Build from monorepo root: docker build -f projects/external-os/restaurant-os/Dockerfile -t restaurant-os .

ARG NODE_VERSION=22

# ---- 1. deps: install dependencies and compile prisma ----
FROM node:${NODE_VERSION}-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /workspace

# Copy SDK dependency and RestaurantOS package manifests
COPY orbitox/packages/external-runtime-sdk /workspace/orbitox/packages/external-runtime-sdk
COPY orbitox/packages/plugin-engine /workspace/orbitox/packages/plugin-engine
COPY orbitox/packages/types /workspace/orbitox/packages/types
COPY orbitox/plugins/pos /workspace/orbitox/plugins/pos
COPY projects/external-os/restaurant-os/package.json projects/external-os/restaurant-os/pnpm-lock.yaml projects/external-os/restaurant-os/pnpm-workspace.yaml /workspace/projects/external-os/restaurant-os/
COPY projects/external-os/restaurant-os/prisma /workspace/projects/external-os/restaurant-os/prisma

WORKDIR /workspace/projects/external-os/restaurant-os
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm exec prisma generate

# ---- 2. build: verify type safety ----
FROM deps AS build
COPY projects/external-os/restaurant-os/tsconfig.json /workspace/projects/external-os/restaurant-os/
COPY projects/external-os/restaurant-os/src /workspace/projects/external-os/restaurant-os/src
COPY projects/external-os/restaurant-os/packages /workspace/projects/external-os/restaurant-os/packages
COPY projects/external-os/restaurant-os/orbitox.project.json /workspace/projects/external-os/restaurant-os/
RUN pnpm exec tsc --noEmit

# ---- 3. runtime: lightweight production runtime ----
FROM node:${NODE_VERSION}-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

ENV NODE_ENV=production \
    PORT=4010 \
    HOST=0.0.0.0

WORKDIR /app

RUN groupadd --system restaurantos && useradd --system --gid restaurantos restaurantos \
    && mkdir -p /app/data && chown -R restaurantos:restaurantos /app

COPY --from=build --chown=restaurantos:restaurantos /workspace/orbitox /workspace/orbitox
COPY --from=build --chown=restaurantos:restaurantos /workspace/projects/external-os/restaurant-os /app

USER restaurantos
VOLUME ["/app/data"]
EXPOSE 4010

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:4010/health || exit 1

CMD ["npx", "tsx", "src/server.ts"]
