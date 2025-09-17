from django.db import models
from django.contrib.auth.hashers import make_password


class AppUser(models.Model):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("admin", "Admin"),
        ("user", "User"),
    ]

    TEAM_CHOICES = [
        ("designing", "Designing"),
        ("marketing", "Marketing"),
        ("php", "PHP"),
        ("fullstack", "Fullstack"),
    ]

    email = models.EmailField(unique=True, blank=False, null=False)
    password = models.CharField(max_length=200, blank=False, null=False)
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, blank=False, null=False
    )
    team = models.CharField(
        max_length=20, choices=TEAM_CHOICES, blank=False, null=False
    )

    # ✅ Add these so DRF/Django treats it like an auth user
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def save(self, *args, **kwargs):
        # Hash password before saving if it's not already hashed
        if self.password and not self.password.startswith('pbkdf2_sha256$'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.role})"


class Credential(models.Model):
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=False, null=False)
    password = models.CharField(max_length=200, blank=False, null=False)

    def __str__(self):
        return f"{self.email} @ {self.website or 'N/A'}"


class Assignment(models.Model):
    user = models.ForeignKey(
        AppUser, on_delete=models.CASCADE, related_name="assignments"
    )
    credential = models.ForeignKey(
        Credential, on_delete=models.CASCADE, related_name="assignments"
    )

    def __str__(self):
        return f"{self.user.email} -> {self.credential.email}"
