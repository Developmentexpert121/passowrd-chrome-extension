# management/commands/createadmin.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = 'Create superuser for Render deployment'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Get credentials from environment variables with defaults
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        email = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
        password = os.environ.get('ADMIN_PASSWORD', 'changeme123')
        
        # Create superuser only if it doesn't exist
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, email, password)
            self.stdout.write(
                self.style.SUCCESS(f'Superuser {username} created successfully!')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Superuser {username} already exists.')
            )