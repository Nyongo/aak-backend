# Base image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .


# Build the application
RUN npm run build

# Final stage: production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the generated Prisma Client and application files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./.env

# Run prisma generate before starting the app
RUN npx prisma generate

EXPOSE 3000

ENV HOST=0.0.0.0

CMD ["npm", "run", "start:prod"]
