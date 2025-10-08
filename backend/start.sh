#!/usr/bin/env bash
# start.sh - Render start script

# Start Gunicorn server
gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT