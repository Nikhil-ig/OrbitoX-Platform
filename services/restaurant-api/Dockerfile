# syntax=docker/dockerfile:1.7
# 🪐 RestaurantOS — Production Hospitality Runtime Container
# Build from monorepo root: docker build -f services/restaurant-api/Dockerfile -t restaurant-os .

ARG NODE_VERSION=22

# ---- 1. deps: install workspace deps, build shared OrbitoX libs, generate Prisma client ----
FROM node:${NODE_VERSION}-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.prod.json turbo.json ./
COPY apps/platform/package.json ./apps/platform/package.json
COPY services/restaurant-api/package.json ./services/restaurant-api/package.json
COPY packages ./packages
COPY plugins ./plugins
COPY tools ./tools
COPY services/restaurant-api/prisma ./services/restaurant-api/prisma

RUN --mount=type=cache,id=pnpm-restaurantos,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @orbitox-io/bridge... --filter @orbitox-io/external-runtime-sdk... --filter @orbitox-io/pos... --filter @orbitox-io/plugin-engine... run build
RUN pnpm --filter restaurant-os run prisma:generate

# ---- 2. build: verify type safety ----
FROM deps AS build
COPY services/restaurant-api/tsconfig.json ./services/restaurant-api/tsconfig.json
COPY services/restaurant-api/src ./services/restaurant-api/src
COPY services/restaurant-api/packages ./services/restaurant-api/packages
COPY services/restaurant-api/orbitox.project.json ./services/restaurant-api/orbitox.project.json
RUN pnpm --filter restaurant-os exec tsc --noEmit

# ---- 3. runtime: lightweight production runtime ----
FROM node:${NODE_VERSION}-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

ENV NODE_ENV=production \
    PORT=4010 \
    HOST=0.0.0.0

WORKDIR /workspace/services/restaurant-api

RUN groupadd --system restaurantos && useradd --system --gid restaurantos restaurantos \
    && mkdir -p /workspace/services/restaurant-api/data /app/data \
    && chown -R restaurantos:restaurantos /workspace /app

COPY --from=build --chown=restaurantos:restaurantos /workspace /workspace

USER restaurantos
VOLUME ["/workspace/services/restaurant-api/data"]
EXPOSE 4010

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:4010/health || exit 1

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
