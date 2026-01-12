#!/bin/bash

# General Deployment Script for Digital Ocean
# This script preserves the uploads folder during git pulls

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Backup uploads folder before git pull
echo "💾 Backing up uploads folder..."
if [ -d "uploads" ] && [ "$(ls -A uploads 2>/dev/null)" ]; then
    # Create a temporary backup
    TEMP_BACKUP=$(mktemp -d)
    cp -r uploads/* "$TEMP_BACKUP/" 2>/dev/null || true
    UPLOADS_BACKED_UP=true
    echo "✅ Uploads folder backed up"
else
    UPLOADS_BACKED_UP=false
    echo "ℹ️  Uploads folder is empty or doesn't exist"
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
fi

# Ensure uploads directory structure exists (in case .gitkeep files are missing)
echo "📁 Ensuring uploads directory structure exists..."
mkdir -p uploads/{drivers/{id_photos,licenses,passports,psv},ecommerce/{categories,products,suppliers},jf/{active-debts,audited-financials,borrowers,crb-consents,credit-applications,customer-logos,directors,enrollment-verifications,fee-plans,minders,mpesa-bank-statements,other-supporting-docs,school-logos,vendor-disbursement-details}}

# Rebuild and restart containers if docker-compose.yml exists
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Rebuilding and restarting containers..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo "🔄 Running database migrations..."
    # Wait a bit more for the app to be fully ready
    sleep 5
    docker compose exec nestjs_app npx prisma migrate deploy || {
        echo "⚠️  Migration command failed. Trying alternative approach..."
        docker compose exec nestjs_app sh -c "cd /app && npx prisma migrate deploy" || echo "⚠️  Migrations failed, but continuing..."
    }
    
    echo "🔍 Checking container status..."
    docker compose ps
fi

echo "✅ Deployment complete!"

