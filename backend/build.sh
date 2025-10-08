#!/usr/bin/env bash
# build.sh - Render build script

# Exit on any error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create admin superuser
python manage.py createadmin

# Collect static files (THIS FIXES THE CSS/JS 404 ERRORS)
python manage.py collectstatic --noinput

echo "✅ Build completed successfully!"