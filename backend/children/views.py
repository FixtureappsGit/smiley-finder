from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Child, EmergencyContact
from .serializers import (
    ChildSerializer,
    ChildListSerializer,
    EmergencyContactSerializer,
    PrivacySettingsSerializer,
)


class ChildViewSet(ModelViewSet):
    """
    CRUD for children belonging to the authenticated parent.

    list   GET  /api/children/
    create POST /api/children/
    retrieve GET /api/children/<id>/
    update   PUT/PATCH /api/children/<id>/
    destroy  DELETE /api/children/<id>/

    Extra actions:
    privacy  PATCH /api/children/<id>/privacy/
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return (
            Child.objects.filter(parent=self.request.user, is_active=True)
            .prefetch_related("emergency_contacts", "tags")
            .order_by("first_name")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ChildListSerializer
        return ChildSerializer

    def perform_create(self, serializer):
        serializer.save(parent=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete — set is_active=False instead of deleting the row."""
        child = self.get_object()
        child.is_active = False
        child.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="privacy")
    def privacy(self, request, pk=None):
        """PATCH /api/children/<id>/privacy/ — update visibility flags only."""
        child = self.get_object()
        serializer = PrivacySettingsSerializer(child, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmergencyContactViewSet(ModelViewSet):
    """
    Manage individual emergency contacts for a child.

    Nested under: /api/children/<child_pk>/contacts/
    """
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return EmergencyContact.objects.filter(
            child__parent=self.request.user,
            child__id=self.kwargs["child_pk"],
        ).order_by("order")

    def get_child(self):
        return Child.objects.get(
            id=self.kwargs["child_pk"], parent=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(child=self.get_child())
