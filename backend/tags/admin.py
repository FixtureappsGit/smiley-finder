from django.contrib import admin
from .models import Tag, TagEvent, ScanLog, Order


class TagEventInline(admin.TabularInline):
    model = TagEvent
    extra = 0
    readonly_fields = ("event", "performed_by", "notes", "created_at")
    can_delete = False


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("tag_id", "child", "tag_type", "placement", "status", "created_at")
    list_filter = ("tag_type", "status", "placement")
    search_fields = ("tag_id", "child__first_name", "nfc_uid")
    readonly_fields = ("tag_id", "qr_image", "emergency_url", "created_at", "updated_at")
    inlines = [TagEventInline]
    actions = ["activate_tags"]

    @admin.action(description="Activate selected tags")
    def activate_tags(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status="generated").update(
            status="active", activated_at=timezone.now()
        )
        self.message_user(request, f"{updated} tag(s) activated.")


@admin.register(TagEvent)
class TagEventAdmin(admin.ModelAdmin):
    list_display = ("tag", "event", "performed_by", "created_at")
    list_filter = ("event",)
    readonly_fields = ("created_at",)


@admin.register(ScanLog)
class ScanLogAdmin(admin.ModelAdmin):
    list_display = ("tag", "child", "ip_address", "location_consent", "scanned_at")
    list_filter = ("location_consent",)
    readonly_fields = ("scanned_at",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "parent", "child", "tag_type", "status", "created_at")
    list_filter = ("status", "tag_type")
    search_fields = ("order_number", "parent__full_name", "child__first_name")
    readonly_fields = ("order_number", "created_at", "updated_at")
