#!/bin/bash
# DigitalOcean cloud-init — UTP Lecture System
# The "docker-20-04" marketplace image already has Docker + Compose installed,
# so we just prepare the app directory. Code is pushed via do-sync.bat over SSH.

set -e -x

mkdir -p /root/lecture-system

# Ensure docker compose is callable as `docker-compose` (older scripts use that name).
if ! command -v docker-compose >/dev/null 2>&1; then
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

echo "Droplet ready for code sync."
