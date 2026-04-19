# syntax=docker/dockerfile:1.7

# Multi-stage build for the DFR Next.js app.
# - `deps` installs all deps (incl. dev) so the build can run next + prisma.
# - `build` generates the Prisma client and produces the standalone server.
# - `runner` is the slim runtime image — copies only what's needed to boot.

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
# openssl is required by Prisma's query engine at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# `npm ci` runs the postinstall `prisma generate` — prisma/ must be in place.
RUN npm ci

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/app/data/dfr.db"

# Non-root user for the runtime. UID/GID 1001 matches common conventions.
RUN groupadd --system --gid 1001 nodejs \
    && useradd  --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/data /app/firmware \
    && chown -R nextjs:nodejs /app

# Standalone output ships its own minimal node_modules, but Prisma engines and
# migrations aren't traced by nft, so copy those explicitly.
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI is needed at startup for `migrate deploy` — copy the package and
# wire its bin stub so the entrypoint can invoke it.
COPY --from=build --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
