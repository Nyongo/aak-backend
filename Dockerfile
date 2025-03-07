# Base image for dependency installation and building
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy application files, including the Prisma schema
COPY . .

# Ensure Prisma Schema is available before generating the client
RUN ls -la prisma/  # Debugging step (optional)
RUN npx prisma generate

# Build the application
RUN npm run build


# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy Prisma schema before running `npm ci`
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma  
COPY --from=builder /app/.env ./.env

# ✅ Create directory for SSL certs
RUN mkdir -p /app/ssl

# ✅ Copy SSL certificates into the container
COPY ssl/server.key /app/ssl/server.key
COPY ssl/server.cert /app/ssl/server.cert

# ✅ Expose both HTTP (3000) and HTTPS (443)
EXPOSE 3000

ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "run", "start:prod"]
