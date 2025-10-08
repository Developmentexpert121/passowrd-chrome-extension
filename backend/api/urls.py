from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AppUserView,
    LoginView,
    RegisterView,
    MeView,
    TokenRefreshView,
    CredentialViewSet,
    TeamViewSet,
)

router = DefaultRouter()
router.register("credentials", CredentialViewSet, basename="credentials")
router.register("teams", TeamViewSet, basename="teams")
router.register("users", AppUserView, basename="users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include(router.urls)),
]