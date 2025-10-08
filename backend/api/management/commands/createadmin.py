from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create a Django superuser if none exists'

    def handle(self, *args, **options):
        User = get_user_model()
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write('Superuser already exists.')
        else:
            User.objects.create_superuser('admin', 'admin@example.com', 'yourpassword')
            self.stdout.write('Superuser created successfully.')
