from django.contrib import admin
from .models import AppUser, Credential

# Register your models here.
admin.site.register(AppUser)
admin.site.register(Credential)
