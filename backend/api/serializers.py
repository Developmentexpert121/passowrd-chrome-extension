from rest_framework import serializers
from django.contrib.auth.hashers import check_password, make_password
from .models import User, Credential, Assignment


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "password", "role", "team"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)


class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = "__all__"


class AssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    credential = CredentialSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )
    credential_id = serializers.PrimaryKeyRelatedField(
        queryset=Credential.objects.all(), source="credential", write_only=True
    )

    class Meta:
        model = Assignment
        fields = ["id", "user", "credential", "user_id", "credential_id"]
