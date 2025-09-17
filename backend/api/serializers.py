from rest_framework import serializers
from django.contrib.auth.hashers import check_password, make_password
from .models import AppUser, Credential, Assignment


class AppUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = ["id", "email", "password", "role", "team"]
        extra_kwargs = {"password": {"write_only": True}}


class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = "__all__"


class AssignmentSerializer(serializers.ModelSerializer):
    user = AppUserSerializer(read_only=True)
    credential = CredentialSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=AppUser.objects.all(), source="user", write_only=True
    )
    credential_id = serializers.PrimaryKeyRelatedField(
        queryset=Credential.objects.all(), source="credential", write_only=True
    )

    class Meta:
        model = Assignment
        fields = ["id", "user", "credential", "user_id", "credential_id"]
