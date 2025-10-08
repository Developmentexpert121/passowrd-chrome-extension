import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create superuser for production'

    def handle(self, *args, **options):
        User = get_user_model()
        
        username = os.environ.get('ADMIN_USERNAME', 'prince')
        email = os.environ.get('ADMIN_EMAIL', 'prince@devexhub.in')
        password = os.environ.get('ADMIN_PASSWORD', 'Admin@123')
        
        # Check if user exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Superuser {username} already exists')
            )
        else:
            # Create new superuser
            User.objects.create_superuser(username, email, password)
            self.stdout.write(
                self.style.SUCCESS(f'Superuser {username} created successfully!')
            )