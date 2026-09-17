from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TagViewSet, RequestTagView, OrderViewSet

router = DefaultRouter()
router.register(r"", TagViewSet, basename="tag")

order_router = DefaultRouter()
order_router.register(r"", OrderViewSet, basename="order")

urlpatterns = [
    path("request/", RequestTagView.as_view(), name="tag-request"),
    path("", include(router.urls)),
]
