from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tags.views import OrderViewSet

router = DefaultRouter()
router.register(r"", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
]
