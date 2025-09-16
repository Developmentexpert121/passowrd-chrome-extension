from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from .models import User, Credential, Assignment
from .serializers import UserSerializer, CredentialSerializer, AssignmentSerializer
from .permissions import IsSuperAdmin, IsAdmin, IsUser


# ---------------- USER VIEWS ----------------

class LoginView(generics.GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        try:
            user = User.objects.get(email=email)
            if check_password(password, user.password):
                refresh = RefreshToken.for_user(user)
                return Response({
                    "message": "Login successful",
                    "role": user.role,
                    "id": user.id,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }, status=200)
            return Response({"error": "Invalid password"}, status=400)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)


class SignupView(generics.CreateAPIView):
    serializer_class = UserSerializer
    queryset = User.objects.all()
    permission_classes = [IsSuperAdmin]


class ForgetPasswordView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]

    def update(self, request, *args, **kwargs):
        user_id = kwargs.get("pk")
        password = request.data.get("password")
        try:
            user = User.objects.get(pk=user_id)
            user.password = make_password(password)
            user.save()
            return Response({"message": "Password updated successfully"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)


# ---------------- CREDENTIAL VIEWS ----------------

class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    permission_classes = [IsAuthenticated]  # add this!

    def list(self, request, *args, **kwargs):
        print("Authorization header:", request.headers.get("Authorization"))
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        print("Request user:", user, type(user))
        if not user.is_authenticated:
            print("Headers:", self.request.headers)
        if user.role == "super_admin":
            return Credential.objects.all()
        elif user.role == "admin":
            return Credential.objects.filter(assignments__user__team=user.team).distinct()
        else:  # normal user
            return Credential.objects.filter(assignments__user=user)


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
        user = User.objects.get(pk=pk)
        credentials = Credential.objects.filter(assignments__user=user)
        serializer = CredentialSerializer(credentials, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def users_for_credential(self, request, pk=None):
        credential = Credential.objects.get(pk=pk)
        users = User.objects.filter(assignments__credential=credential)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
