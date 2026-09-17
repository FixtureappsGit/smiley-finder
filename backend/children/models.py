import uuid
from django.db import models
from accounts.models import User


def child_photo_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1]
    return f"children/{instance.id}/photo.{ext}"


class Child(models.Model):
    """A child profile linked to a parent/guardian."""

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    COMMUNICATION_CHOICES = [
        ("verbal", "Verbal"),
        ("limited_verbal", "Limited Verbal"),
        ("non_verbal", "Non-Verbal"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Human-readable ID shown on dashboard: CH-XXXXX
    child_id = models.CharField(max_length=20, unique=True, editable=False)

    parent = models.ForeignKey(User, on_delete=models.CASCADE, related_name="children")

    # Basic info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    photo = models.ImageField(upload_to=child_photo_upload_path, null=True, blank=True)

    # Communication
    communication_type = models.CharField(
        max_length=20, choices=COMMUNICATION_CHOICES, default="verbal"
    )

    # Optional medical/special instructions
    allergies = models.TextField(blank=True)
    medical_info = models.TextField(blank=True)
    special_instructions = models.TextField(blank=True)
    preferred_language = models.CharField(max_length=100, blank=True)

    # Privacy flags — parent chooses what appears on the public emergency page
    show_first_name = models.BooleanField(default=True)
    show_photo = models.BooleanField(default=True)
    show_communication = models.BooleanField(default=True)
    show_allergies = models.BooleanField(default=False)
    show_medical_info = models.BooleanField(default=False)
    show_special_instructions = models.BooleanField(default=True)
    show_preferred_language = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "children"
        ordering = ["first_name"]
        verbose_name = "Child"
        verbose_name_plural = "Children"

    def __str__(self):
        return f"{self.first_name} ({self.child_id})"

    def save(self, *args, **kwargs):
        if not self.child_id:
            last = Child.objects.order_by("-created_at").first()
            if last and last.child_id.startswith("CH-"):
                num = int(last.child_id.split("-")[1]) + 1
            else:
                num = 10001
            self.child_id = f"CH-{num:05d}"
        super().save(*args, **kwargs)

    @property
    def age(self):
        from datetime import date
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class EmergencyContact(models.Model):
    """Emergency contacts for a child (primary + secondary)."""

    RELATIONSHIP_CHOICES = [
        ("mother", "Mother"),
        ("father", "Father"),
        ("grandparent", "Grandparent"),
        ("sibling", "Sibling"),
        ("aunt_uncle", "Aunt / Uncle"),
        ("guardian", "Guardian"),
        ("teacher", "Teacher"),
        ("doctor", "Doctor"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    child = models.ForeignKey(
        Child, on_delete=models.CASCADE, related_name="emergency_contacts"
    )
    name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=30, choices=RELATIONSHIP_CHOICES)
    mobile = models.CharField(max_length=15)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=1)  # 1 = first, 2 = second

    class Meta:
        db_table = "emergency_contacts"
        ordering = ["order"]

    def __str__(self):
        return f"{self.name} ({self.relationship}) — {self.child.first_name}"
