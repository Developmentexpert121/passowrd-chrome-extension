from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AppUserDetailView,
    AppUserView,
    LoginView,
    MeView,
    SignupView,
    ForgetPasswordView,
    TokenRefreshView,
    CredentialViewSet,
    AssignmentViewSet,
)

router = DefaultRouter()
router.register("credentials", CredentialViewSet, basename="credentials")
router.register("assignments", AssignmentViewSet, basename="assignments")
router.register("users", AppUserView, basename="users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    # 👇 new user endpoints
    path("signup/", SignupView.as_view(), name="signup"),
    path(
        "forget-password/<int:pk>/",
        ForgetPasswordView.as_view(),
        name="forget-password",
    ),
    path("me/", MeView.as_view(), name="me"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include(router.urls)),
]
