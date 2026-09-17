from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet, ModelViewSet

from .models import Tag, TagEvent, ScanLog, Order
from .serializers import (
    TagSerializer,
    RequestTagSerializer,
    TagStatusUpdateSerializer,
    TagEventSerializer,
    ScanLogSerializer,
    RecordScanSerializer,
    OrderSerializer,
)


class TagViewSet(ReadOnlyModelViewSet):
    """
    Parent-facing read + status-update endpoints for tags.

    list     GET  /api/tags/                  — all my tags
    retrieve GET  /api/tags/<id>/
    report   POST /api/tags/<id>/report/       — mark lost / deactivate
    events   GET  /api/tags/<id>/events/       — audit trail
    download GET  /api/tags/<id>/qr-download/  — redirect to QR image
    """
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Tag.objects.filter(child__parent=self.request.user)
            .select_related("child")
            .order_by("-created_at")
        )

    @action(detail=True, methods=["post"], url_path="report")
    def report(self, request, pk=None):
        """POST /api/tags/<id>/report/ — parent reports tag as lost or deactivates it."""
        tag = self.get_object()
        serializer = TagStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")

        tag.status = new_status
        if new_status == "deactivated":
            tag.deactivated_at = timezone.now()
        tag.save()

        TagEvent.objects.create(
            tag=tag,
            event=new_status,
            performed_by=request.user,
            notes=notes,
        )

        return Response({"message": f"Tag marked as {new_status}.", "tag_id": tag.tag_id})

    @action(detail=True, methods=["get"], url_path="events")
    def events(self, request, pk=None):
        """GET /api/tags/<id>/events/ — full lifecycle audit trail."""
        tag = self.get_object()
        qs = tag.events.all()
        serializer = TagEventSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="scans")
    def scans(self, request, pk=None):
        """GET /api/tags/<id>/scans/ — scan history for this tag."""
        tag = self.get_object()
        qs = tag.scans.all()[:50]
        serializer = ScanLogSerializer(qs, many=True)
        return Response(serializer.data)


class RequestTagView(APIView):
    """
    POST /api/tags/request/
    Parent requests a new tag for a child. Creates Tag + Order records
    and generates the QR code immediately.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RequestTagSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        child = data["child_id"]  # already resolved to Child instance in validate_child_id

        # Create the tag
        tag = Tag.objects.create(
            child=child,
            tag_type=data["tag_type"],
            placement=data.get("placement", "wristband"),
            notes=data.get("notes", ""),
            status="requested",
        )

        # Log the request event
        TagEvent.objects.create(tag=tag, event="requested", performed_by=request.user)

        # Generate QR code immediately
        base_url = getattr(settings, "SITE_BASE_URL", "https://smileyid.in")
        tag.generate_qr(base_url)

        tag.status = "generated"
        tag.save()
        TagEvent.objects.create(tag=tag, event="generated", performed_by=request.user)

        # Create an order if shipping address is provided
        has_address = any([
            data.get("address_line1"),
            data.get("city"),
            data.get("pincode"),
        ])
        order = None
        if has_address:
            order = Order.objects.create(
                parent=request.user,
                child=child,
                tag=tag,
                tag_type=data["tag_type"],
                address_line1=data.get("address_line1", ""),
                address_line2=data.get("address_line2", ""),
                city=data.get("city", ""),
                state=data.get("state", ""),
                pincode=data.get("pincode", ""),
            )

        response_data = TagSerializer(tag, context={"request": request}).data
        if order:
            response_data["order_number"] = order.order_number

        return Response(response_data, status=status.HTTP_201_CREATED)


class ChildTagListView(generics.ListAPIView):
    """GET /api/children/<child_pk>/tags/ — all tags for a specific child."""
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(
            child__id=self.kwargs["child_pk"],
            child__parent=self.request.user,
        ).order_by("-created_at")


class OrderViewSet(ReadOnlyModelViewSet):
    """GET /api/orders/ — parent's order history."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(parent=self.request.user).order_by("-created_at")
