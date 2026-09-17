from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from children.models import Child
from tags.models import Tag, ScanLog
from tags.serializers import RecordScanSerializer
from .serializers import PublicEmergencyProfileSerializer


class EmergencyProfileView(APIView):
    """
    GET /api/emergency/<child_id>/
    Public — no authentication required.

    Query param: ?tag=<tag_id>  (optional, used for scan logging)

    Returns the child's emergency profile respecting all privacy flags.
    Automatically creates a ScanLog entry.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # skip JWT entirely for this endpoint

    def get(self, request, child_id):
        try:
            child = Child.objects.prefetch_related("emergency_contacts").get(
                child_id=child_id, is_active=True
            )
        except Child.DoesNotExist:
            return Response(
                {"detail": "Profile not found or no longer active."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Resolve tag if provided (for scan logging)
        tag_id_param = request.query_params.get("tag")
        tag = None
        if tag_id_param:
            tag = Tag.objects.filter(tag_id=tag_id_param, child=child).first()

        # If the specific tag is deactivated, deny access
        if tag and tag.status in ("deactivated", "lost"):
            return Response(
                {"detail": "This tag has been deactivated. Please contact local authorities."},
                status=status.HTTP_410_GONE,
            )

        # Log the scan (IP only; location added separately via /record-scan/)
        ip = _get_client_ip(request)
        ScanLog.objects.create(
            tag=tag,
            child=child,
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        serializer = PublicEmergencyProfileSerializer(child, context={"request": request})
        return Response(serializer.data)


class RecordScanView(APIView):
    """
    POST /api/emergency/record-scan/
    Public — called from the browser after the user opts in to share location.
    Attaches lat/lng to the most recent ScanLog for this child/tag.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RecordScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Only update if the user explicitly consented to share location
        if not data.get("location_consent"):
            return Response({"message": "Location not recorded (no consent)."})

        tag_id = data.get("tag_id")
        if not tag_id:
            return Response({"message": "No tag ID provided."})

        # Update the most recent scan log for this tag
        log = ScanLog.objects.filter(tag__tag_id=tag_id).order_by("-scanned_at").first()
        if log:
            log.latitude = data.get("latitude")
            log.longitude = data.get("longitude")
            log.location_consent = True
            log.save()

        return Response({"message": "Location recorded. Thank you for helping."})


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
