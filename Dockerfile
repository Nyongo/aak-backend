# Base image for dependency installation and building
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies separately to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy application files
COPY . .

# Generate Prisma Client before building
RUN npx prisma generate

# Build the application
RUN npm run build



# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built application and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./.env

EXPOSE 3000
ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "run", "start:prod"]
