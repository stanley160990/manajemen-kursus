# Multi-stage Dockerfile for Portal Pembekalan Mahasiswa
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . ./

# Build frontend and compile backend bundle
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built distribution from builder
COPY --from=builder /app/dist ./dist

# Copy init sql for fallback
COPY --from=builder /app/init.sql ./init.sql

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
