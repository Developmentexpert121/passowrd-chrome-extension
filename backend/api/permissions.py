from rest_framework.permissions import BasePermission
from .models import AppUser


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        # Case 1: Django default User (superuser in admin panel)
        if hasattr(user, "is_superuser") and user.is_superuser:
            return True

        # Case 2: AppUser with custom role
        if isinstance(user, AppUser) and user.role == "super_admin":
            return True

        return False


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if isinstance(user, AppUser) and user.role == "admin":
            return True

        return False


class IsUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if isinstance(user, AppUser) and user.role == "user":
            return True

        return False
