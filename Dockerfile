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
RUN npm ci --omit=dev

# Copy built application, Prisma client, and schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma  
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 
COPY --from=builder /app/.env ./.env

# Ensure Prisma Client is generated in the final image
RUN npx prisma generate

EXPOSE 3000
ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "run", "start:prod"]
