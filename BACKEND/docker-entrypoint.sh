#!/bin/sh
set -e

printf "[entrypoint] waiting for database...\n"
# Wait until the DB is accepting connections by attempting a simple query
until node -e "const db=require('./src/config/db'); db.query('SELECT 1').then(()=>process.exit(0)).catch(()=>process.exit(1));"; do
  printf "[entrypoint] database not ready, sleeping 2s...\n"
  sleep 2
done

printf "[entrypoint] database ready. Running migrations...\n"
node src/migrations/init.js || true

printf "[entrypoint] starting app\n"
exec npm run start
