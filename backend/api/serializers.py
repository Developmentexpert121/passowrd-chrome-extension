from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import AppUser, Credential, Team
import json
import ast


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "admins", "members"]


class AppUserSerializer(serializers.ModelSerializer):
    team = serializers.SerializerMethodField()

    class Meta:
        model = AppUser
        fields = [
            "id",
            "email",
            "password",
            "role",
            "team_id",
            "team",
            "public_key",
            "encrypted_private_key",
            "kdf",
            "kdf_salt",
            "kdf_nonce",
            "devices",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            # "encrypted_private_key": {"write_only": True},
            # "kdf_salt": {"write_only": True},
            # "kdf_nonce": {"write_only": True},
            "devices": {"required": False},
        }

    def get_team(self, obj):
        if obj.team_id:
            try:
                team = Team.objects.get(id=obj.team_id)
                return team.name
            except Team.DoesNotExist:
                return None
        return None

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "password" in validated_data:
            validated_data["password"] = make_password(validated_data["password"])
        return super().update(instance, validated_data)


class CredentialAclEntrySerializer(serializers.Serializer):
    grantee_user_id = serializers.UUIDField()
    enc_dek = serializers.CharField()
    wrap_algo = serializers.CharField()
    key_version = serializers.CharField()
    granted_by = serializers.UUIDField()
    granted_at = serializers.DateTimeField()
    ephemeral_pub = serializers.CharField()
    wrap_nonce = serializers.CharField()


class JSONListField(serializers.Field):
    def to_representation(self, value):
        if isinstance(value, str):
            return json.loads(value)
        return value

    def to_internal_value(self, data):
        return json.dumps(data)


class CredentialSerializer(serializers.ModelSerializer):
    acl = JSONListField(required=False)
    assigned_to_team_ids = JSONListField(required=False)
    meta = serializers.JSONField(required=False)

    website = serializers.CharField(write_only=True, required=False)
    email = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Credential
        fields = [
            "id",
            "owner_id",
            "title",
            "meta",
            "cipher_algo",
            "ciphertext",
            "acl",
            "assigned_to_team_ids",
            "website",
            "email",
            "password",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "owner_id": {"read_only": True},
            "cipher_algo": {"required": False, "allow_blank": True},
            "ciphertext": {"required": False, "allow_blank": True},
        }

    def create(self, validated_data):
        website = validated_data.pop("website", None)
        email = validated_data.pop("email", None)
        password = validated_data.pop("password", None)
        meta = validated_data.get("meta", {})
        if website:
            meta["url"] = website
        if email:
            meta["email"] = email
        validated_data["meta"] = meta
        if password:
            # Do not store plaintext password, raise error or handle encryption here
            raise serializers.ValidationError(
                "Plaintext password storage is not allowed."
            )
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add website and email from meta for reading
        meta = instance.meta
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                try:
                    meta = ast.literal_eval(meta)
                except (ValueError, SyntaxError):
                    meta = {}
        data["website"] = meta.get("url") if meta else None
        data["email"] = meta.get("email") if meta else None
        # Do not expose plaintext password in API response
        data["password"] = None
        return data
