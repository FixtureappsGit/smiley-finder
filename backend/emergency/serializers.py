from rest_framework import serializers
from children.models import Child, EmergencyContact
from tags.models import Tag


class PublicEmergencyContactSerializer(serializers.ModelSerializer):
    """Only expose name, relationship, and a masked mobile for the public page."""
    # Show full mobile — finder needs to be able to call
    class Meta:
        model = EmergencyContact
        fields = ("name", "relationship", "mobile", "is_primary", "order")


class PublicEmergencyProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the public emergency page.
    Respects every show_* privacy flag set by the parent.
    """
    emergency_contacts = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    communication_type = serializers.SerializerMethodField()
    allergies = serializers.SerializerMethodField()
    special_instructions = serializers.SerializerMethodField()
    preferred_language = serializers.SerializerMethodField()

    class Meta:
        model = Child
        fields = (
            "child_id",
            "first_name",
            "photo_url",
            "communication_type",
            "allergies",
            "special_instructions",
            "preferred_language",
            "emergency_contacts",
        )

    # ------------------------------------------------------------------ #
    # Privacy-aware field methods
    # ------------------------------------------------------------------ #

    def get_first_name(self, obj):
        return obj.first_name if obj.show_first_name else None

    def get_photo_url(self, obj):
        if not obj.show_photo or not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url

    def get_communication_type(self, obj):
        return obj.communication_type if obj.show_communication else None

    def get_allergies(self, obj):
        return obj.allergies if obj.show_allergies else None

    def get_special_instructions(self, obj):
        return obj.special_instructions if obj.show_special_instructions else None

    def get_preferred_language(self, obj):
        return obj.preferred_language if obj.show_preferred_language else None

    def get_emergency_contacts(self, obj):
        contacts = obj.emergency_contacts.order_by("order")
        return PublicEmergencyContactSerializer(contacts, many=True).data
