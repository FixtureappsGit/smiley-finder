import json
from rest_framework import serializers
from .models import Child, EmergencyContact


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ("id", "name", "relationship", "mobile", "is_primary", "order")
        read_only_fields = ("id",)


class ChildSerializer(serializers.ModelSerializer):
    """Full serializer — used for create/update by the parent."""
    emergency_contacts = EmergencyContactSerializer(many=True, required=False)
    age = serializers.ReadOnlyField()
    active_tag_count = serializers.SerializerMethodField()

    # Explicitly declared so multipart forms (which omit unchecked checkboxes)
    # don't force these to False. required=False + default preserves
    # model-level defaults when the field is absent from the request.
    show_first_name           = serializers.BooleanField(required=False, default=True)
    show_photo                = serializers.BooleanField(required=False, default=True)
    show_communication        = serializers.BooleanField(required=False, default=True)
    show_allergies            = serializers.BooleanField(required=False, default=False)
    show_medical_info         = serializers.BooleanField(required=False, default=False)
    show_special_instructions = serializers.BooleanField(required=False, default=True)
    show_preferred_language   = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Child
        fields = (
            "id", "child_id", "first_name", "last_name",
            "date_of_birth", "age", "gender", "photo",
            "communication_type",
            "allergies", "medical_info", "special_instructions", "preferred_language",
            "show_first_name", "show_photo", "show_communication",
            "show_allergies", "show_medical_info", "show_special_instructions",
            "show_preferred_language",
            "emergency_contacts", "active_tag_count",
            "is_active", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "child_id", "age", "active_tag_count", "is_active", "created_at", "updated_at"
        )

    def get_active_tag_count(self, obj):
        # Count all usable tags — active, activated, or generated (QR ready to use)
        return obj.tags.exclude(status__in=["deactivated", "lost", "replaced"]).count()

    def to_internal_value(self, data):
        """
        When the frontend sends multipart/form-data, emergency_contacts
        arrives as a JSON string (because FormData can't send nested objects).
        Parse it here before DRF validates the nested serializer.
        """
        # Make data mutable if it's a QueryDict
        if hasattr(data, "_mutable"):
            data = data.dict()

        # Parse emergency_contacts JSON string → list of dicts
        contacts_raw = data.get("emergency_contacts")
        if isinstance(contacts_raw, str):
            try:
                data["emergency_contacts"] = json.loads(contacts_raw)
            except (json.JSONDecodeError, ValueError):
                data["emergency_contacts"] = []

        return super().to_internal_value(data)

    def create(self, validated_data):
        contacts_data = validated_data.pop("emergency_contacts", [])
        child = Child.objects.create(**validated_data)
        for i, contact_data in enumerate(contacts_data):
            contact_data.pop("id", None)  # strip id if frontend sends it
            EmergencyContact.objects.create(child=child, **contact_data)
        return child

    def update(self, instance, validated_data):
        contacts_data = validated_data.pop("emergency_contacts", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if contacts_data is not None:
            # Full replace — delete old, create new
            instance.emergency_contacts.all().delete()
            for contact_data in contacts_data:
                contact_data.pop("id", None)  # strip stale UUIDs
                EmergencyContact.objects.create(child=instance, **contact_data)

        return instance


class ChildListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the dashboard list."""
    age = serializers.ReadOnlyField()
    active_tag_count = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Child
        fields = ("id", "child_id", "first_name", "last_name", "age", "photo",
                  "communication_type", "active_tag_count", "tags", "is_active")

    def get_active_tag_count(self, obj):
        # Count all usable tags — active, activated, or generated (QR ready to use)
        return obj.tags.exclude(status__in=["deactivated", "lost", "replaced"]).count()

    def get_tags(self, obj):
        """Return id + tag_id for every non-deactivated/lost tag."""
        return [
            {"id": str(t.id), "tag_id": t.tag_id, "status": t.status}
            for t in obj.tags.exclude(status__in=["deactivated", "lost", "replaced"])
            .order_by("-created_at")
        ]


class PrivacySettingsSerializer(serializers.ModelSerializer):
    """Dedicated serializer for updating only the public/private visibility flags."""
    class Meta:
        model = Child
        fields = (
            "show_first_name", "show_photo", "show_communication",
            "show_allergies", "show_medical_info", "show_special_instructions",
            "show_preferred_language",
        )
