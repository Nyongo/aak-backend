#!/bin/bash

# PostgreSQL Configuration Deployment Script
# Run this script on your Digital Ocean server

echo "🚀 Deploying PostgreSQL configuration for external access..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Pull latest changes from Git
echo "📥 Pulling latest changes from Git..."
git pull origin main

# Start containers with new configuration
echo "🔄 Starting containers with new PostgreSQL configuration..."
docker-compose up -d

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 10

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL status..."
docker-compose ps

# Test PostgreSQL connection
echo "🧪 Testing PostgreSQL connection..."
docker exec -it postgres_container psql -U postgres -d nest -c "SELECT version();"

# Show PostgreSQL logs
echo "📋 PostgreSQL logs:"
docker-compose logs postgres

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure firewall to allow port 5432:"
echo "   sudo ufw allow 5432/tcp"
echo ""
echo "2. Test connection from your local machine:"
echo "   telnet YOUR_DROPLET_IP 5432"
echo ""
echo "3. Use these connection details in pgAdmin:"
echo "   Host: YOUR_DROPLET_IP"
echo "   Port: 5432"
echo "   Database: nest"
echo "   Username: postgres"
echo "   Password: NyNj92"
