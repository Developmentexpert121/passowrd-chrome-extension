# api/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from .models import AppUser


class AppUserJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            # Pull the claim name from settings (default: "user_id")
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            return AppUser.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except AppUser.DoesNotExist:
            raise AuthenticationFailed("AppUser not found", code="user_not_found")
