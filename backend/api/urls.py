from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, SignupView, ForgetPasswordView, CredentialViewSet, AssignmentViewSet

router = DefaultRouter()
router.register("credentials", CredentialViewSet, basename="credentials")
router.register("assignments", AssignmentViewSet, basename="assignments")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("forget-password/<int:pk>/", ForgetPasswordView.as_view(), name="forget-password"),
    path("", include(router.urls)),
]
