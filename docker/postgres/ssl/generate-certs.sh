#!/bin/bash
# Run this script on the server to generate SSL certificates for PostgreSQL.
# Usage: bash docker/postgres/ssl/generate-certs.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Generating self-signed SSL certificate for PostgreSQL..."

openssl req -new -x509 -days 365 -nodes \
  -keyout "$SCRIPT_DIR/server.key" \
  -out "$SCRIPT_DIR/server.crt" \
  -subj "/CN=aiwritedb.aitorsr.es"

# PostgreSQL requires the key to be owned by the postgres user (uid 70 in alpine)
# and have permissions 600. Since Docker mounts preserve host ownership,
# we set the owner to uid 70 on the host so it matches inside the container.
chmod 600 "$SCRIPT_DIR/server.key"
chmod 644 "$SCRIPT_DIR/server.crt"
sudo chown 70:70 "$SCRIPT_DIR/server.key" "$SCRIPT_DIR/server.crt"

echo "Done. Certificates created:"
ls -la "$SCRIPT_DIR/server.crt" "$SCRIPT_DIR/server.key"
