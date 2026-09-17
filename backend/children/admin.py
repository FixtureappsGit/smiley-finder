from django.contrib import admin
from .models import Child, EmergencyContact


class EmergencyContactInline(admin.TabularInline):
    model = EmergencyContact
    extra = 1


@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    list_display = ("child_id", "first_name", "last_name", "age", "parent", "communication_type", "is_active", "created_at")
    list_filter = ("communication_type", "gender", "is_active")
    search_fields = ("first_name", "last_name", "child_id", "parent__email")
    inlines = [EmergencyContactInline]
    readonly_fields = ("child_id", "created_at", "updated_at")


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ("name", "relationship", "mobile", "child", "is_primary", "order")
    search_fields = ("name", "child__first_name", "mobile")
