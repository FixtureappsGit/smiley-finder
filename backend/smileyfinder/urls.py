from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .admin_views import (
    admin_stats,
    AdminUsersView, AdminUserDetailView,
    AdminChildrenView,
    AdminTagsView, AdminTagDetailView,
    AdminOrdersView, AdminOrderDetailView,
    AdminScanLogsView,
)

urlpatterns = [
    path("django-admin/", admin.site.urls),

    # Auth
    path("api/auth/", include("accounts.urls")),

    # Parent-facing
    path("api/children/", include("children.urls")),
    path("api/tags/", include("tags.urls")),
    path("api/orders/", include("orders.urls")),

    # Public — no auth
    path("api/emergency/", include("emergency.urls")),

    # Admin API — all require is_staff=True
    path("api/admin/stats/",          admin_stats,            name="admin-stats"),
    path("api/admin/users/",          AdminUsersView.as_view(),        name="admin-users"),
    path("api/admin/users/<uuid:pk>/",AdminUserDetailView.as_view(),   name="admin-user-detail"),
    path("api/admin/children/",       AdminChildrenView.as_view(),     name="admin-children"),
    path("api/admin/tags/",           AdminTagsView.as_view(),         name="admin-tags"),
    path("api/admin/tags/<uuid:pk>/", AdminTagDetailView.as_view(),    name="admin-tag-detail"),
    path("api/admin/orders/",         AdminOrdersView.as_view(),       name="admin-orders"),
    path("api/admin/orders/<uuid:pk>/",AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("api/admin/scans/",          AdminScanLogsView.as_view(),     name="admin-scans"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
