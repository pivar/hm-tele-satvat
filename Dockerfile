# ---- Stage 1: Build ----
FROM python:3.11-slim-bookworm AS builder

# Install Node.js 20 + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml /app/
RUN pip install --no-cache-dir -e .

# Install all Node deps (dev + prod) for build
COPY package.json package-lock.json* /app/
RUN npm ci

# Copy source and build
COPY . /app/
RUN npm run build

# ---- Stage 2: Production ----
FROM python:3.11-slim-bookworm AS production

# Install Node.js 20 runtime only (no build tools needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy only production Node deps
COPY package.json package-lock.json* /app/
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets and source
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/server /app/server
COPY --from=builder /app/client /app/client
COPY --from=builder /app/uploads /app/uploads
COPY --from=builder /app/pyproject.toml /app/pyproject.toml

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
