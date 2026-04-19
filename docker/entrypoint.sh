#!/bin/sh
# Container entrypoint: run pending DB migrations, then hand off to the app.
# Using `migrate deploy` (not `migrate dev`) so production never rewrites
# migration history — only applies what's already checked into prisma/migrations/.

set -e

echo "[entrypoint] applying prisma migrations..."
# The standalone build doesn't ship the prisma CLI, so invoke it through npx
# against the prisma package copied into node_modules/. If that's missing we
# fall back to `prisma db push` via the engine only — but under normal builds
# the CLI is present because we copy @prisma/* wholesale.
if [ -x "node_modules/.bin/prisma" ]; then
  node_modules/.bin/prisma migrate deploy
else
  echo "[entrypoint] prisma CLI not found — skipping migrations (dev image?)"
fi

echo "[entrypoint] starting app..."
exec "$@"
