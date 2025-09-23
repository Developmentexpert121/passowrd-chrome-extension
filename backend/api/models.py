from django.db import models
from django.contrib.auth.hashers import make_password
import uuid
from django.utils import timezone
import json


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    admins = models.TextField(default="[]")  # JSON list of UUIDs
    members = models.TextField(default="[]")  # JSON list of UUIDs

    def __str__(self):
        return self.name


class AppUser(models.Model):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("user", "User"),
    ]

    email = models.EmailField(unique=True, blank=False, null=False)
    password = models.CharField(max_length=200, blank=False, null=False)
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, blank=False, null=False
    )
    team_id = models.UUIDField(blank=True, null=True)

    public_key = models.TextField(blank=True, null=True)  # base64 encoded
    encrypted_private_key = models.TextField(blank=True, null=True)  # base64 encoded
    kdf = models.CharField(max_length=50, default="argon2id")
    kdf_salt = models.TextField(blank=True, null=True)  # base64 encoded
    kdf_nonce = models.TextField(blank=True, null=True)  # base64 encoded

    devices = models.TextField(default="[]")  # JSON list of device dicts

    # ✅ Add these so DRF/Django treats it like an auth user
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def save(self, *args, **kwargs):
        # Hash password before saving if it's not already hashed
        if self.password and not self.password.startswith("pbkdf2_sha256$"):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.role})"


class Credential(models.Model):
    owner_id = models.UUIDField(default=uuid.uuid4)
    title = models.CharField(max_length=200, default="")
    meta = models.TextField(default="{}")  # JSON dict
    cipher_algo = models.CharField(max_length=50, default="xchacha20-poly1305")
    ciphertext = models.TextField(default="")  # base64 encoded iv|ct|tag

    acl = models.TextField(default="[]")  # JSON list of dicts

    assigned_to_team_ids = models.TextField(default="[]")  # JSON list of UUIDs

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} owned by {self.owner_id}"


# Remove Assignment model as ACL handles access control now
