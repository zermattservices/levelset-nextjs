FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Copy package.json files for all workspaces the agent needs
COPY apps/agent/package.json ./apps/agent/
COPY packages/shared/package.json ./packages/shared/
COPY packages/supabase-client/package.json ./packages/supabase-client/
COPY packages/permissions/package.json ./packages/permissions/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source files
COPY apps/agent/ ./apps/agent/
COPY packages/ ./packages/

# Build the agent
RUN pnpm --filter agent build

FROM base AS runtime
WORKDIR /app

# Copy built output and production dependencies
COPY --from=build /app/apps/agent/dist ./dist
COPY --from=build /app/apps/agent/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

EXPOSE 3000

CMD ["node", "dist/index.js"]
