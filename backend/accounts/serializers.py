from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import OTPVerification
from django.conf import settings

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, label="Confirm password")

    class Meta:
        model = User
        fields = ("full_name", "email", "mobile", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_email_verified = True  # auto-verify on registration (no OTP)
        user.save()
        return user


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    otp_type = serializers.ChoiceField(choices=["email", "mobile"])

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found."})

        otp = (
            OTPVerification.objects.filter(
                user=user,
                otp_type=attrs["otp_type"],
                code=attrs["code"],
                is_used=False,
                expires_at__gte=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not otp:
            raise serializers.ValidationError({"code": "Invalid or expired OTP."})

        attrs["user"] = user
        attrs["otp"] = otp
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_type = serializers.ChoiceField(choices=["email", "mobile"])

    def validate_email(self, value):
        try:
            return User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

    def validate(self, attrs):
        attrs["user"] = attrs.pop("email")  # renamed above
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "mobile", "full_name",
            "is_staff", "is_email_verified", "is_mobile_verified", "created_at",
        )
        read_only_fields = ("id", "email", "is_staff", "is_email_verified", "is_mobile_verified", "created_at")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password.")
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user info to the token response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserProfileSerializer(self.user).data
        return data


# --------------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------------- #

def _create_otp(user, otp_type: str) -> OTPVerification:
    expiry = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    code = f"{random.randint(100000, 999999)}"
    otp = OTPVerification.objects.create(
        user=user, otp_type=otp_type, code=code, expires_at=expiry
    )

    # ------------------------------------------------------------------ #
    # DEV: print OTP to the Django console so you can use it immediately.
    # Replace this block with a real SMS / email provider in production.
    # ------------------------------------------------------------------ #
    if settings.DEBUG:
        print(
            f"\n{'='*50}\n"
            f"  OTP for {user.email} ({otp_type}): {code}\n"
            f"  Expires at: {expiry:%Y-%m-%d %H:%M:%S}\n"
            f"{'='*50}\n",
            flush=True,
        )

    return otp
