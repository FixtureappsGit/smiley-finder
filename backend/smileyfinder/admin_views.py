"""
Admin-only API views — all require is_staff=True.
Mounted under /api/admin/ in urls.py.
"""
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.pagination import PageNumberPagination


# ── Pagination ──────────────────────────────────────────────────────────────

class AdminPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Serializers (admin-only, show more fields) ───────────────────────────────

class AdminUserSerializer(drf_serializers.Serializer):
    id = drf_serializers.UUIDField()
    email = drf_serializers.EmailField()
    full_name = drf_serializers.CharField()
    mobile = drf_serializers.CharField()
    is_active = drf_serializers.BooleanField()
    is_staff = drf_serializers.BooleanField()
    is_email_verified = drf_serializers.BooleanField()
    is_mobile_verified = drf_serializers.BooleanField()
    children_count = drf_serializers.SerializerMethodField()
    created_at = drf_serializers.DateTimeField()

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()


class AdminChildSerializer(drf_serializers.Serializer):
    id = drf_serializers.UUIDField()
    child_id = drf_serializers.CharField()
    first_name = drf_serializers.CharField()
    last_name = drf_serializers.CharField()
    age = drf_serializers.IntegerField()
    gender = drf_serializers.CharField()
    communication_type = drf_serializers.CharField()
    parent_name = drf_serializers.SerializerMethodField()
    parent_email = drf_serializers.SerializerMethodField()
    parent_mobile = drf_serializers.SerializerMethodField()
    active_tag_count = drf_serializers.SerializerMethodField()
    is_active = drf_serializers.BooleanField()
    created_at = drf_serializers.DateTimeField()

    def get_parent_name(self, obj): return obj.parent.full_name
    def get_parent_email(self, obj): return obj.parent.email
    def get_parent_mobile(self, obj): return obj.parent.mobile
    def get_active_tag_count(self, obj):
        return obj.tags.exclude(status__in=["deactivated", "lost", "replaced"]).count()


class AdminTagSerializer(drf_serializers.Serializer):
    id = drf_serializers.UUIDField()
    tag_id = drf_serializers.CharField()
    tag_type = drf_serializers.CharField()
    placement = drf_serializers.CharField()
    status = drf_serializers.CharField()
    nfc_uid = drf_serializers.CharField()
    emergency_url = drf_serializers.CharField()
    child_id = drf_serializers.SerializerMethodField()
    child_name = drf_serializers.SerializerMethodField()
    parent_name = drf_serializers.SerializerMethodField()
    parent_email = drf_serializers.SerializerMethodField()
    qr_image_url = drf_serializers.SerializerMethodField()
    activated_at = drf_serializers.DateTimeField()
    deactivated_at = drf_serializers.DateTimeField()
    created_at = drf_serializers.DateTimeField()
    notes = drf_serializers.CharField()

    def get_child_id(self, obj): return obj.child.child_id
    def get_child_name(self, obj): return obj.child.first_name
    def get_parent_name(self, obj): return obj.child.parent.full_name
    def get_parent_email(self, obj): return obj.child.parent.email
    def get_qr_image_url(self, obj):
        request = self.context.get("request")
        if obj.qr_image and request:
            return request.build_absolute_uri(obj.qr_image.url)
        return None


class AdminOrderSerializer(drf_serializers.Serializer):
    id = drf_serializers.UUIDField()
    order_number = drf_serializers.CharField()
    tag_type = drf_serializers.CharField()
    status = drf_serializers.CharField()
    parent_name = drf_serializers.SerializerMethodField()
    parent_email = drf_serializers.SerializerMethodField()
    child_name = drf_serializers.SerializerMethodField()
    tag_id = drf_serializers.SerializerMethodField()
    address_line1 = drf_serializers.CharField()
    city = drf_serializers.CharField()
    state = drf_serializers.CharField()
    pincode = drf_serializers.CharField()
    notes = drf_serializers.CharField()
    created_at = drf_serializers.DateTimeField()

    def get_parent_name(self, obj): return obj.parent.full_name
    def get_parent_email(self, obj): return obj.parent.email
    def get_child_name(self, obj): return obj.child.first_name
    def get_tag_id(self, obj): return obj.tag.tag_id if obj.tag else None


class AdminScanLogSerializer(drf_serializers.Serializer):
    id = drf_serializers.UUIDField()
    tag_id = drf_serializers.SerializerMethodField()
    child_name = drf_serializers.SerializerMethodField()
    child_id = drf_serializers.SerializerMethodField()
    parent_name = drf_serializers.SerializerMethodField()
    ip_address = drf_serializers.IPAddressField()
    latitude = drf_serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True)
    longitude = drf_serializers.DecimalField(max_digits=9, decimal_places=6, allow_null=True)
    location_consent = drf_serializers.BooleanField()
    user_agent = drf_serializers.CharField()
    scanned_at = drf_serializers.DateTimeField()

    def get_tag_id(self, obj): return obj.tag.tag_id if obj.tag else None
    def get_child_name(self, obj): return obj.child.first_name if obj.child else None
    def get_child_id(self, obj): return obj.child.child_id if obj.child else None
    def get_parent_name(self, obj): return obj.child.parent.full_name if obj.child else None


# ── Stats ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_stats(request):
    from accounts.models import User
    from children.models import Child
    from tags.models import Tag, ScanLog, Order

    today = timezone.now().date()
    return Response({
        "parents":         User.objects.filter(is_staff=False).count(),
        "children":        Child.objects.filter(is_active=True).count(),
        "active_tags":     Tag.objects.filter(status="active").count(),
        "qr_scans_today":  ScanLog.objects.filter(scanned_at__date=today).count(),
        "tags_requested":  Tag.objects.filter(status="requested").count(),
        "lost_deactivated":Tag.objects.filter(status__in=["lost", "deactivated"]).count(),
        "pending_orders":  Order.objects.filter(status="pending").count(),
        "total_scans":     ScanLog.objects.count(),
        "unverified_users":User.objects.filter(
            is_email_verified=False, is_mobile_verified=False, is_staff=False
        ).count(),
    })


# ── Users ────────────────────────────────────────────────────────────────────

class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from accounts.models import User
        qs = User.objects.filter(is_staff=False).order_by("-created_at")

        # Search
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                **{"full_name__icontains": q}
            ) | qs.filter(email__icontains=q) | qs.filter(mobile__icontains=q)
            # Re-query cleanly
            from django.db.models import Q
            qs = User.objects.filter(is_staff=False).filter(
                Q(full_name__icontains=q) | Q(email__icontains=q) | Q(mobile__icontains=q)
            ).order_by("-created_at")

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminUserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, pk):
        from accounts.models import User
        try:
            return User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, pk):
        from accounts.models import User
        user = self.get_object(pk)
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        allowed = {"is_active", "is_email_verified", "is_mobile_verified"}
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(AdminUserSerializer(user).data)


# ── Children ─────────────────────────────────────────────────────────────────

class AdminChildrenView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from children.models import Child
        from django.db.models import Q
        qs = Child.objects.select_related("parent").prefetch_related("tags").order_by("-created_at")

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(first_name__icontains=q) | Q(child_id__icontains=q) | Q(parent__email__icontains=q))

        active = request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        elif active == "false":
            qs = qs.filter(is_active=False)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminChildSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ── Tags ─────────────────────────────────────────────────────────────────────

class AdminTagsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from tags.models import Tag
        from django.db.models import Q
        qs = Tag.objects.select_related("child", "child__parent").order_by("-created_at")

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(tag_id__icontains=q) | Q(child__first_name__icontains=q) | Q(nfc_uid__icontains=q))

        s = request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminTagSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class AdminTagDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, pk):
        from tags.models import Tag
        try:
            return Tag.objects.select_related("child", "child__parent").get(pk=pk)
        except Tag.DoesNotExist:
            return None

    def patch(self, request, pk):
        from tags.models import Tag, TagEvent
        tag = self.get_object(pk)
        if not tag:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        nfc_uid = request.data.get("nfc_uid")
        notes = request.data.get("notes", "")

        if nfc_uid is not None:
            tag.nfc_uid = nfc_uid

        if new_status and new_status != tag.status:
            allowed_transitions = {
                "requested": ["generated", "deactivated"],
                "generated": ["activated", "active", "deactivated"],
                "activated": ["active", "deactivated"],
                "active":    ["deactivated", "lost", "replaced"],
                "lost":      ["deactivated", "replaced"],
                "deactivated": ["replaced"],
                "replaced":  [],
            }
            if new_status not in allowed_transitions.get(tag.status, []):
                return Response(
                    {"detail": f"Cannot transition from '{tag.status}' to '{new_status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tag.status = new_status
            if new_status in ("activated", "active"):
                tag.activated_at = timezone.now()
            elif new_status in ("deactivated", "lost"):
                tag.deactivated_at = timezone.now()

            TagEvent.objects.create(
                tag=tag, event=new_status, performed_by=request.user, notes=notes
            )

        tag.save()
        return Response(AdminTagSerializer(tag, context={"request": request}).data)


# ── Orders ───────────────────────────────────────────────────────────────────

class AdminOrdersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from tags.models import Order
        from django.db.models import Q
        qs = Order.objects.select_related("parent", "child", "tag").order_by("-created_at")

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(order_number__icontains=q) | Q(parent__full_name__icontains=q))

        s = request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminOrderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminOrderDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from tags.models import Order
        try:
            order = Order.objects.select_related("parent", "child", "tag").get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status:
            order.status = new_status
        if "notes" in request.data:
            order.notes = request.data["notes"]
        order.save()
        return Response(AdminOrderSerializer(order).data)


# ── Scan Logs ────────────────────────────────────────────────────────────────

class AdminScanLogsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from tags.models import ScanLog
        from django.db.models import Q
        qs = ScanLog.objects.select_related("tag", "child", "child__parent").order_by("-scanned_at")

        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(tag__tag_id__icontains=q) | Q(child__first_name__icontains=q))

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminScanLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
