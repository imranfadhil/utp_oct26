# ── Dockerfile for AWS EC2 Deployment ────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application code
COPY server.js ./
COPY public ./public

# Create data directory for SQLite (persistent volume)
RUN mkdir -p /data
VOLUME /data

EXPOSE 3000

# Use /data for database so it persists across restarts
ENV PORT=3000
ENV DB_PATH=/data/lecture.db
ENV PORT=3000
CMD ["node", "server.js"]