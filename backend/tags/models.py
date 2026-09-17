import uuid
import qrcode
import io
from django.db import models
from django.core.files import File
from children.models import Child
from accounts.models import User


def qr_upload_path(instance, filename):
    return f"qrcodes/{instance.tag_id}/{filename}"


class Tag(models.Model):
    """A physical or digital tag (NFC wristband, QR sticker, etc.) linked to a child."""

    TAG_TYPE_CHOICES = [
        ("nfc_qr_wristband", "NFC + QR Wristband"),
        ("qr_sticker", "QR Sticker"),
        ("nfc_keychain", "NFC Keychain"),
        ("qr_card", "QR Card"),
    ]

    STATUS_CHOICES = [
        ("requested", "Requested"),
        ("generated", "Generated"),
        ("activated", "Activated"),
        ("active", "Active"),
        ("lost", "Lost"),
        ("deactivated", "Deactivated"),
        ("replaced", "Replaced"),
    ]

    PLACEMENT_CHOICES = [
        ("wristband", "Wristband"),
        ("school_bag", "School Bag"),
        ("shoe", "Shoe"),
        ("clothing", "Clothing"),
        ("id_card", "ID Card"),
        ("travel_bag", "Travel Bag"),
        ("bicycle", "Bicycle"),
        ("lunch_bag", "Lunch Bag"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Human-readable tag ID shown to parent: SM-XXXXXX
    tag_id = models.CharField(max_length=20, unique=True, editable=False)

    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="tags")

    tag_type = models.CharField(max_length=30, choices=TAG_TYPE_CHOICES)
    placement = models.CharField(
        max_length=30, choices=PLACEMENT_CHOICES, default="wristband"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="requested")

    # The QR code encodes this URL: /e/<child_id>?tag=<tag_id>
    qr_image = models.ImageField(upload_to=qr_upload_path, null=True, blank=True)
    emergency_url = models.URLField(blank=True)

    # NFC-specific
    nfc_uid = models.CharField(max_length=64, blank=True, help_text="Physical NFC chip UID")

    notes = models.TextField(blank=True)

    activated_at = models.DateTimeField(null=True, blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tags"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tag_id} ({self.tag_type}) — {self.child.first_name}"

    def save(self, *args, **kwargs):
        if not self.tag_id:
            last = Tag.objects.order_by("-created_at").first()
            if last and last.tag_id.startswith("SM-"):
                num = int(last.tag_id.split("-")[1]) + 1
            else:
                num = 50001
            self.tag_id = f"SM-{num:06d}"
        super().save(*args, **kwargs)

    def generate_qr(self, base_url: str):
        """
        Generate QR code image and save it.
        base_url example: "https://smileyid.in"
        """
        url = f"{base_url}/e/{self.child.child_id}?tag={self.tag_id}"
        self.emergency_url = url

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        filename = f"qr_{self.tag_id}.png"
        self.qr_image.save(filename, File(buf), save=False)
        self.save()


class TagEvent(models.Model):
    """Audit log for every status transition on a tag."""

    EVENT_CHOICES = [
        ("requested", "Requested"),
        ("generated", "Generated"),
        ("activated", "Activated"),
        ("lost", "Lost"),
        ("deactivated", "Deactivated"),
        ("replaced", "Replaced"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="events")
    event = models.CharField(max_length=20, choices=EVENT_CHOICES)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tag_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tag.tag_id} → {self.event}"


class ScanLog(models.Model):
    """Recorded every time a QR or NFC tag is scanned on the emergency page."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tag = models.ForeignKey(
        Tag, on_delete=models.SET_NULL, null=True, blank=True, related_name="scans"
    )
    child = models.ForeignKey(
        Child, on_delete=models.SET_NULL, null=True, blank=True, related_name="scans"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Optional — only if user consents and browser grants permission
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_consent = models.BooleanField(default=False)

    user_agent = models.TextField(blank=True)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "scan_logs"
        ordering = ["-scanned_at"]

    def __str__(self):
        tag_id = self.tag.tag_id if self.tag else "unknown"
        return f"Scan of {tag_id} at {self.scanned_at:%Y-%m-%d %H:%M}"


class Order(models.Model):
    """Tracks physical tag orders (useful once you ship physical products)."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    parent = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="orders")
    tag = models.OneToOneField(
        Tag, on_delete=models.SET_NULL, null=True, blank=True, related_name="order"
    )
    tag_type = models.CharField(max_length=30, choices=Tag.TAG_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Shipping address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.order_number} — {self.parent.full_name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            last = Order.objects.order_by("-created_at").first()
            num = int(last.order_number.split("-")[1]) + 1 if last else 1001
            self.order_number = f"ORD-{num:05d}"
        super().save(*args, **kwargs)
