from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPVerification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "full_name", "mobile", "is_email_verified", "is_mobile_verified", "is_staff", "created_at")
    list_filter = ("is_staff", "is_active", "is_email_verified", "is_mobile_verified")
    search_fields = ("email", "full_name", "mobile")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "mobile")}),
        ("Verification", {"fields": ("is_email_verified", "is_mobile_verified")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "mobile", "full_name", "password1", "password2"),
        }),
    )


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("user", "otp_type", "code", "is_used", "expires_at", "created_at")
    list_filter = ("otp_type", "is_used")
    search_fields = ("user__email",)
