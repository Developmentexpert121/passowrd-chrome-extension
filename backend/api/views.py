from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.permissions import IsAuthenticated
from .models import AppUser, Credential, Assignment
from .serializers import AppUserSerializer, CredentialSerializer, AssignmentSerializer
from .permissions import IsSuperAdmin, IsAdmin, IsUser


# ---------------- USER VIEWS ----------------


class LoginView(generics.GenericAPIView):
    serializer_class = AppUserSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        try:
            user = AppUser.objects.get(email=email)
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


class SignupView(generics.CreateAPIView):
    serializer_class = AppUserSerializer
    queryset = AppUser.objects.all()
    permission_classes = [IsSuperAdmin]


class ForgetPasswordView(generics.UpdateAPIView):
    queryset = AppUser.objects.all()
    serializer_class = AppUserSerializer
    permission_classes = [IsSuperAdmin]

    def update(self, request, *args, **kwargs):
        user_id = kwargs.get("pk")
        password = request.data.get("password")
        try:
            user = AppUser.objects.get(pk=user_id)
            user.password = make_password(password)
            user.save()
            return Response({"message": "Password updated successfully"})
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)


class AppUserView(viewsets.ModelViewSet):
    serializer_class = AppUserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_queryset(self):
        user = self.request.user

        if not isinstance(user, AppUser):
            return AppUser.objects.none()

        role_filter = self.request.query_params.get('role')
        if role_filter and user.role == "super_admin":
            return AppUser.objects.filter(role=role_filter)

        if user.role == "super_admin":
            return AppUser.objects.all()

        elif user.role == "admin":
            return AppUser.objects.filter(team=user.team, role="user")

        else:  # normal user
            return AppUser.objects.filter(id=user.id)

    def perform_create(self, serializer):
        if self.request.user.role != "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Not authorized")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != "super_admin" or serializer.instance.role == "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Not authorized")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != "super_admin" or instance.role == "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Not authorized")
        instance.delete()

    @action(detail=False, methods=['get'])
    def export_users(self, request):
        if request.user.role != "super_admin":
            return Response({"error": "Not authorized"}, status=403)
        users = self.get_queryset().exclude(role="super_admin")
        serializer = AppUserSerializer(users, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response({"message": "User updated successfully"})


class AppUserDetailView(generics.RetrieveAPIView):
    queryset = AppUser.objects.all()
    serializer_class = AppUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return AppUser.objects.all()
        elif user.role == "admin":
            return AppUser.objects.filter(team=user.team, role="user")
        else:
            return AppUser.objects.filter(id=user.id)


class MeView(generics.RetrieveAPIView):
    serializer_class = AppUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ---------------- CREDENTIAL VIEWS ----------------


class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        print("Authorization header:", request.headers.get("Authorization"))
        print("Request user:", request.user, type(request.user))
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user

        # Handle unauthenticated
        if not user or not user.is_authenticated:
            return Credential.objects.none()

        # Only handle AppUser (avoid errors if it's a Django default User)
        from .models import AppUser

        if isinstance(user, AppUser):
            if user.role == "super_admin":
                return Credential.objects.all()
            elif user.role == "admin":
                return Credential.objects.filter(
                    assignments__user__team=user.team
                ).distinct()
            else:  # normal user
                return Credential.objects.filter(assignments__user=user)

        # Fallback: if it's a default Django User, return nothing or restrict
        return Credential.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only super admin can create credentials")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only super admin can update credentials")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != "super_admin":
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only super admin can delete credentials")
        instance.delete()


# ---------------- ASSIGNMENT VIEWS ----------------


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]  # add this!

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return Assignment.objects.all()
        elif user.role == "admin":
            return Assignment.objects.filter(user__team=user.team).distinct()
        else:  # user
            return Assignment.objects.filter(user=user)

    @action(detail=True, methods=["get"])
    def credentials_for_user(self, request, pk=None):
        user = AppUser.objects.get(pk=pk)
        credentials = Credential.objects.filter(assignments__user=user)
        serializer = CredentialSerializer(credentials, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def users_for_credential(self, request, pk=None):
        credential = Credential.objects.get(pk=pk)
        users = AppUser.objects.filter(assignments__credential=credential)
        serializer = AppUserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_user_access(self, request, pk=None):
        credential = Credential.objects.get(pk=pk)
        user_id = request.data.get("user_id")
        try:
            user = AppUser.objects.get(pk=user_id)
            assignment, created = Assignment.objects.get_or_create(user=user, credential=credential)
            if created:
                return Response({"message": "User access added"}, status=201)
            else:
                return Response({"message": "User already has access"}, status=200)
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=True, methods=["post"])
    def remove_user_access(self, request, pk=None):
        credential = Credential.objects.get(pk=pk)
        user_id = request.data.get("user_id")
        try:
            user = AppUser.objects.get(pk=user_id)
            assignment = Assignment.objects.filter(user=user, credential=credential).first()
            if assignment:
                assignment.delete()
                return Response({"message": "User access removed"}, status=200)
            else:
                return Response({"error": "User access not found"}, status=404)
        except AppUser.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
