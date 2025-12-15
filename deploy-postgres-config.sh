#!/bin/bash

# PostgreSQL Configuration Deployment Script
# Run this script on your Digital Ocean server

echo "🚀 Deploying PostgreSQL configuration for external access..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker compose down

# Backup uploads folder before git pull
echo "💾 Backing up uploads folder..."
if [ -d "uploads" ]; then
    # Create a temporary backup
    TEMP_BACKUP=$(mktemp -d)
    cp -r uploads/* "$TEMP_BACKUP/" 2>/dev/null || true
    UPLOADS_BACKED_UP=true
    echo "✅ Uploads folder backed up"
else
    UPLOADS_BACKED_UP=false
    echo "ℹ️  Uploads folder doesn't exist, will create structure after pull"
fi

# Pull latest changes from Git
echo "📥 Pulling latest changes from Git..."
git pull origin main

# Restore uploads folder after git pull
if [ "$UPLOADS_BACKED_UP" = true ]; then
    echo "📂 Restoring uploads folder..."
    # Ensure uploads directory exists
    mkdir -p uploads
    # Restore files if backup has content
    if [ "$(ls -A $TEMP_BACKUP 2>/dev/null)" ]; then
        cp -r "$TEMP_BACKUP"/* uploads/ 2>/dev/null || true
    fi
    # Clean up temporary backup
    rm -rf "$TEMP_BACKUP"
    echo "✅ Uploads folder restored"
else
    # Create uploads directory structure if it doesn't exist
    echo "📁 Creating uploads directory structure..."
    mkdir -p uploads/{drivers/{id_photos,licenses,passports,psv},ecommerce/{categories,products,suppliers},jf/{active-debts,audited-financials,borrowers,crb-consents,credit-applications,customer-logos,directors,enrollment-verifications,fee-plans,minders,mpesa-bank-statements,other-supporting-docs,school-logos,vendor-disbursement-details}}
    echo "✅ Uploads directory structure created"
fi

# Start containers with new configuration
echo "🔄 Starting containers with new PostgreSQL configuration..."
docker compose up -d

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 10

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL status..."
docker compose ps

# Test PostgreSQL connection
echo "🧪 Testing PostgreSQL connection..."
docker exec -it postgres_container psql -U postgres -d nest -c "SELECT version();"

# Show PostgreSQL logs
echo "📋 PostgreSQL logs:"
docker compose logs postgres

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
