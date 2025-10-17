#!/bin/bash

# Laravel Deployment Script
# This script handles common deployment tasks for Laravel applications

echo "Starting Laravel deployment..."

# Install/Update Composer dependencies
echo "Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader

# Install/Update NPM dependencies and build assets
echo "Installing NPM dependencies and building assets..."
npm install
npm run build

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Clear and cache configuration
echo "Clearing and caching configuration..."
php artisan config:clear
php artisan config:cache

# Clear and cache routes
echo "Clearing and caching routes..."
php artisan route:clear
php artisan route:cache

# Clear and cache views
echo "Clearing and caching views..."
php artisan view:clear
php artisan view:cache

# Clear application cache
echo "Clearing application cache..."
php artisan cache:clear

# Create storage link (IMPORTANT for image access)
echo "Creating storage link..."
php artisan storage:link

# Set proper permissions
echo "Setting proper permissions..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache

echo "Deployment completed successfully!"
echo "IMPORTANT: Make sure to run 'php artisan storage:link' if images are not displaying correctly."
