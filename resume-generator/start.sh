#!/bin/sh
set -e

echo "Running database migrations..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss || echo "Migration warning: continuing anyway"

echo "Starting server..."
exec node server.js

