from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChildViewSet, EmergencyContactViewSet

router = DefaultRouter()
router.register(r"", ChildViewSet, basename="child")

urlpatterns = [
    path("", include(router.urls)),
    # Manual nested route for contacts
    path(
        "<uuid:child_pk>/contacts/",
        EmergencyContactViewSet.as_view({"get": "list", "post": "create"}),
        name="child-contacts-list",
    ),
    path(
        "<uuid:child_pk>/contacts/<uuid:pk>/",
        EmergencyContactViewSet.as_view({
            "get": "retrieve",
            "put": "update",
            "patch": "partial_update",
            "delete": "destroy",
        }),
        name="child-contacts-detail",
    ),
]
