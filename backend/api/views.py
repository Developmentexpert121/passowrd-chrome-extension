from rest_framework import viewsets, generics, status, serializers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from django.contrib.auth.hashers import check_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.settings import api_settings
from .models import AppUser, Credential, Team
from .serializers import AppUserSerializer, CredentialSerializer, TeamSerializer
from .permissions import IsSuperAdmin, IsAdmin, IsUser
from django.utils import timezone
import uuid


# ---------------- USER VIEWS ----------------


class LoginView(generics.GenericAPIView):
    serializer_class = AppUserSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        try:
            user = AppUser.objects.get(email__iexact=email)
            if check_password(password, user.password):
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "message": "Login successful",
                        "role": user.role,
                        "id": user.id,
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                    status=200,
                )
            return Response({"error": "Invalid password"}, status=400)
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)


class RegisterView(generics.CreateAPIView):
    serializer_class = AppUserSerializer
    queryset = AppUser.objects.all()
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Handle key setup during registration
        data = request.data.copy()
        # Handle team name to team_id conversion
        if "team" in data and not data.get("team_id"):
            team_name = data.pop("team")
            team = Team.objects.filter(name__iexact=team_name).first()
            if not team:
                team = Team.objects.create(name=team_name)
            data["team_id"] = team.id
        # Assume public_key, encrypted_private_key, kdf_salt are provided
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # If the new user is a super admin, add them to all existing credentials
        if user.role == "super_admin":
            import json

            # Get all existing credentials
            all_credentials = Credential.objects.all()

            for credential in all_credentials:
                try:
                    # Get the current ACL list
                    acl_list = json.loads(credential.acl) if credential.acl else []

                    # Check if super admin is already in ACL (more robust check)
                    is_already_in_acl = False
                    for entry in acl_list:
                        if isinstance(entry, dict) and entry.get("grantee_user_id") == str(user.id):
                            is_already_in_acl = True
                            break

                    if not is_already_in_acl:
                        acl_entry = {
                            "grantee_user_id": str(user.id),
                            "enc_dek": None,  # Will be set when they first access the credential
                            "wrap_algo": "ecdh-x25519",
                            "key_version": "v1",
                            "granted_by": str(user.id),  # Self-granted for registration
                            "granted_at": timezone.now().isoformat(),
                            "ephemeral_pub": None,
                            "wrap_nonce": None,
                        }
                        acl_list.append(acl_entry)

                        # Update the credential with the new ACL
                        credential.acl = json.dumps(acl_list)
                        credential.save()
                        print(f"Added super admin {user.id} to credential {credential.id} (registration)")
                    else:
                        print(f"Super admin {user.id} already in credential {credential.id} ACL (registration)")

                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    print(f"Error processing credential {credential.id} ACL during registration: {e}")
                    # Try to fix corrupted ACL
                    try:
                        credential.acl = json.dumps([])
                        credential.save()
                        print(f"Fixed corrupted ACL for credential {credential.id} during registration")
                    except Exception as fix_error:
                        print(f"Could not fix ACL for credential {credential.id} during registration: {fix_error}")

        return Response(
            {"message": "User registered successfully", "user_id": user.id}, status=201
        )


class AppUserView(viewsets.ModelViewSet):
    serializer_class = AppUserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "put", "patch", "delete"]

    def get_queryset(self):
        user = self.request.user
        if not isinstance(user, AppUser):
            return AppUser.objects.none()

        role_filter = self.request.query_params.get("role")
        if role_filter and user.role == "super_admin":
            return AppUser.objects.filter(role=role_filter)

        for_sharing = self.request.query_params.get("for_sharing")
        if for_sharing:
            if user.role == "super_admin":
                return AppUser.objects.filter(role__in=["admin", "user"])
            elif user.role == "admin":
                return AppUser.objects.filter(
                    team_id=user.team_id, role__in=["admin", "user"]
                )
            else:
                return AppUser.objects.none()

        if user.role == "super_admin":
            return AppUser.objects.filter(role__in=["admin","user"])
        elif user.role == "admin":
            return AppUser.objects.filter(team_id=user.team_id, role="user")
        else:
            return AppUser.objects.filter(id=user.id)

    def perform_create(self, serializer):
        if self.request.user.role != "super_admin":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not authorized")

        # Save the user first
        user = serializer.save()

        # If the new user is a super admin, add them to all existing credentials
        if user.role == "super_admin":
            import json

            # Get all existing credentials
            all_credentials = Credential.objects.all()

            for credential in all_credentials:
                try:
                    # Get the current ACL list
                    acl_list = json.loads(credential.acl) if credential.acl else []

                    # Check if super admin is already in ACL (more robust check)
                    is_already_in_acl = False
                    for entry in acl_list:
                        if isinstance(entry, dict) and entry.get("grantee_user_id") == str(user.id):
                            is_already_in_acl = True
                            break

                    if not is_already_in_acl:
                        acl_entry = {
                            "grantee_user_id": str(user.id),
                            "enc_dek": None,  # Will be set when they first access the credential
                            "wrap_algo": "ecdh-x25519",
                            "key_version": "v1",
                            "granted_by": str(self.request.user.id),
                            "granted_at": timezone.now().isoformat(),
                            "ephemeral_pub": None,
                            "wrap_nonce": None,
                        }
                        acl_list.append(acl_entry)

                        # Update the credential with the new ACL
                        credential.acl = json.dumps(acl_list)
                        credential.save()
                        print(f"Added super admin {user.id} to credential {credential.id}")
                    else:
                        print(f"Super admin {user.id} already in credential {credential.id} ACL")

                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    print(f"Error processing credential {credential.id} ACL: {e}")
                    # Try to fix corrupted ACL
                    try:
                        credential.acl = json.dumps([])
                        credential.save()
                        print(f"Fixed corrupted ACL for credential {credential.id}")
                    except Exception as fix_error:
                        print(f"Could not fix ACL for credential {credential.id}: {fix_error}")

    def perform_update(self, serializer):
        if (
            self.request.user.role != "super_admin"
            or serializer.instance.role == "super_admin"
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not authorized")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != "super_admin" or instance.role == "super_admin":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not authorized")
        instance.delete()

    def get_object(self):
        if self.request.user.role == "super_admin":
            return AppUser.objects.get(pk=self.kwargs["pk"])
        return super().get_object()

    @action(detail=True, methods=["get"])
    def pubkey(self, request, pk=None):
        try:
            user = AppUser.objects.get(pk=pk)
            return Response({"public_key": user.public_key})
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=True, methods=["get"])
    def credentials(self, request, pk=None):
        user = self.get_object()
        # Get credentials where user has ACL entry
        credentials = Credential.objects.filter(acl__contains=str(user.id))
        serializer = CredentialSerializer(credentials, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        users = self.get_queryset()
        data = list(users.values("id", "email", "role", "team_id"))
        # Replace team_id with team name
        for user in data:
            team = Team.objects.get(id=user["team_id"])
            user["team"] = team.name
            del user["team_id"]
        return Response(data)


class MeView(generics.RetrieveAPIView):
    serializer_class = AppUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ---------------- TEAM VIEWS ----------------


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsSuperAdmin]


# ---------------- CREDENTIAL VIEWS ----------------


class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not isinstance(user, AppUser):
            return Credential.objects.none()

        if user.role == "super_admin":
            return Credential.objects.all()
        elif user.role == "admin":
            # Credentials assigned to user's team or owned by admin or shared with admin
            queryset = Credential.objects.filter(owner_id=user.id)
            if user.team_id:
                queryset = queryset | Credential.objects.filter(
                    assigned_to_team_ids__contains=user.team_id.hex
                )
            queryset = queryset | Credential.objects.filter(acl__contains=str(user.id))
            return queryset
        else:
            # Credentials where user has ACL entry
            return Credential.objects.filter(acl__contains=str(user.id))

    def perform_create(self, serializer):
        # Only super_admin or admin can create
        if self.request.user.role not in ["super_admin", "admin"]:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not authorized")

        # Save the credential first
        credential = serializer.save(owner_id=self.request.user.id)

        # Get all super admins to add to ACL
        super_admins = AppUser.objects.filter(role="super_admin")

        if super_admins.exists():
            import json

            # Get the ACL list (should be empty for new credentials)
            acl_list = json.loads(credential.acl) if credential.acl else []

            # Add each super admin to the ACL
            for super_admin in super_admins:
                # Check if super admin is already in ACL (shouldn't be for new credentials)
                if not any(entry.get("grantee_user_id") == str(super_admin.id) for entry in acl_list):
                    acl_entry = {
                        "grantee_user_id": str(super_admin.id),
                        "enc_dek": None,  # Will be set when they first access the credential
                        "wrap_algo": "ecdh-x25519",
                        "key_version": "v1",
                        "granted_by": str(self.request.user.id),
                        "granted_at": timezone.now().isoformat(),
                        "ephemeral_pub": None,
                        "wrap_nonce": None,
                    }
                    acl_list.append(acl_entry)

            # Update the credential with the ACL containing super admins
            credential.acl = json.dumps(acl_list)
            credential.save()

    def perform_update(self, serializer):
        # Check if user can update this credential
        user = self.request.user
        credential = serializer.instance

        # Super admin can always update
        if user.role == "super_admin":
            serializer.save()
            return

        # Owner can always update
        if credential.owner_id == user.id:
            serializer.save()
            return

        # Admin can update if they have access to the credential (ACL entry)
        if user.role == "admin":
            import json
            try:
                acl_list = json.loads(credential.acl)
                # Check if user has an ACL entry for this credential
                user_acl_entry = next(
                    (entry for entry in acl_list if entry.get("grantee_user_id") == str(user.id)),
                    None
                )
                if user_acl_entry:
                    serializer.save()
                    return
            except (json.JSONDecodeError, KeyError):
                pass

        # If none of the above conditions are met, deny access
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Not authorized")

    def perform_destroy(self, instance):
        if (
            self.request.user.role != "super_admin"
            and instance.owner_id != self.request.user.id
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Not authorized")
        instance.delete()

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        import json

        credential = self.get_object()
        grantee_user_id = request.data.get("user_id")
        enc_dek = request.data.get("enc_dek")
        # Assume other fields provided
        # Add to ACL
        acl_list = json.loads(credential.acl)
        acl_entry = {
            "grantee_user_id": str(grantee_user_id),
            "enc_dek": enc_dek,
            "wrap_algo": request.data.get("wrap_algo", "ecdh-x25519"),
            "key_version": request.data.get("key_version", "v1"),
            "granted_by": str(self.request.user.id),
            "granted_at": timezone.now().isoformat(),
            "ephemeral_pub": request.data.get("ephemeral_pub"),
            "wrap_nonce": request.data.get("wrap_nonce"),
        }
        acl_list.append(acl_entry)
        credential.acl = json.dumps(acl_list)
        credential.save()
        return Response({"message": "Credential shared"})

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        import json

        credential = self.get_object()
        grantee_user_id = request.data.get("user_id")
        # Remove from ACL
        acl_list = json.loads(credential.acl)
        acl_list = [
            entry
            for entry in acl_list
            if entry["grantee_user_id"] != str(grantee_user_id)
        ]
        credential.acl = json.dumps(acl_list)
        credential.save()
        return Response({"message": "Access revoked"})

    @action(detail=True, methods=["get"])
    def users(self, request, pk=None):
        import json

        credential = self.get_object()
        # Parse ACL JSON string to list of dicts
        acl_list = json.loads(credential.acl)
        user_ids = [entry["grantee_user_id"] for entry in acl_list]
        users = AppUser.objects.filter(id__in=user_ids)
        serializer = AppUserSerializer(users, many=True)
        return Response(serializer.data)


class AppUserTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        from .models import AppUser

        refresh = RefreshToken(attrs["refresh"])
        data = {"access": str(refresh.access_token)}
        if api_settings.UPDATE_LAST_LOGIN:
            from django.utils import timezone

            user_id = refresh.payload.get("user_id")
            try:
                user = AppUser.objects.get(id=user_id)
                user.last_login = timezone.now()
                user.save()
            except AppUser.DoesNotExist:
                raise serializers.ValidationError("User not found")
        return data


class TokenRefreshView(generics.GenericAPIView):
    serializer_class = AppUserTokenRefreshSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
