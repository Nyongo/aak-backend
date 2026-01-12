# Base image for dependency installation and building
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy application files, including the Prisma schema
COPY . .

# Ensure SSL directory exists (create if missing)
RUN mkdir -p ssl

# Ensure Prisma Schema is available before generating the client
RUN ls -la prisma/  # Debugging step (optional)
RUN npx prisma generate

# Build the application
RUN npm run build


# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy Prisma schema and migrations before running `npm ci`
# This includes schema.prisma and the migrations/ directory
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
# Note: prisma should be in dependencies (not devDependencies) for migrations to work
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma  
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/start-production.sh ./start-production.sh
RUN chmod +x ./start-production.sh

# ✅ Copy SSL certificates from builder stage
# Directory will exist (created in builder), but may be empty
# The app will gracefully fall back to HTTP if certificates are missing
COPY --from=builder /app/ssl/ /app/ssl/

# ✅ Expose both HTTP (3000) and HTTPS (443)
EXPOSE 3000

ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "run", "start:prod"]
