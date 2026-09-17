from rest_framework import serializers
from .models import Tag, TagEvent, ScanLog, Order


class TagSerializer(serializers.ModelSerializer):
    child_name = serializers.CharField(source="child.first_name", read_only=True)
    child_id = serializers.CharField(source="child.child_id", read_only=True)
    qr_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = (
            "id", "tag_id", "child", "child_name", "child_id",
            "tag_type", "placement", "status",
            "qr_image_url", "emergency_url", "nfc_uid",
            "notes", "activated_at", "deactivated_at",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "tag_id", "child_name", "child_id",
            "qr_image_url", "emergency_url",
            "activated_at", "deactivated_at",
            "created_at", "updated_at",
        )

    def get_qr_image_url(self, obj):
        request = self.context.get("request")
        if obj.qr_image and request:
            return request.build_absolute_uri(obj.qr_image.url)
        return None


class RequestTagSerializer(serializers.Serializer):
    """Used by the parent to request a new tag for a child."""
    child_id = serializers.UUIDField()
    tag_type = serializers.ChoiceField(choices=Tag.TAG_TYPE_CHOICES)
    placement = serializers.ChoiceField(choices=Tag.PLACEMENT_CHOICES, default="wristband")
    notes = serializers.CharField(required=False, allow_blank=True)

    # Optional shipping details (for physical tag orders)
    address_line1 = serializers.CharField(required=False, allow_blank=True)
    address_line2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    pincode = serializers.CharField(required=False, allow_blank=True)

    def validate_child_id(self, value):
        from children.models import Child
        request = self.context["request"]
        try:
            child = Child.objects.get(id=value, parent=request.user, is_active=True)
        except Child.DoesNotExist:
            raise serializers.ValidationError("Child not found or does not belong to you.")
        return child


class TagStatusUpdateSerializer(serializers.Serializer):
    """Used by parent to update tag status (e.g. report lost, deactivate)."""
    status = serializers.ChoiceField(choices=["lost", "deactivated"])
    notes = serializers.CharField(required=False, allow_blank=True)


class TagEventSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(
        source="performed_by.full_name", read_only=True
    )

    class Meta:
        model = TagEvent
        fields = ("id", "event", "performed_by_name", "notes", "created_at")
        read_only_fields = fields


class ScanLogSerializer(serializers.ModelSerializer):
    tag_id = serializers.CharField(source="tag.tag_id", read_only=True)
    child_name = serializers.CharField(source="child.first_name", read_only=True)

    class Meta:
        model = ScanLog
        fields = (
            "id", "tag_id", "child_name",
            "ip_address", "latitude", "longitude", "location_consent",
            "user_agent", "scanned_at",
        )
        read_only_fields = fields


class RecordScanSerializer(serializers.Serializer):
    """Payload sent from the public emergency page when a QR/NFC is scanned."""
    tag_id = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    location_consent = serializers.BooleanField(default=False)


class OrderSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.full_name", read_only=True)
    child_name = serializers.CharField(source="child.first_name", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "order_number", "parent_name", "child_name",
            "tag_type", "status",
            "address_line1", "address_line2", "city", "state", "pincode",
            "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "order_number", "parent_name", "child_name", "created_at", "updated_at")
