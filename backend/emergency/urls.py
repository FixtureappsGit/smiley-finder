from django.urls import path
from .views import EmergencyProfileView, RecordScanView

urlpatterns = [
    path("record-scan/", RecordScanView.as_view(), name="emergency-record-scan"),
    path("<str:child_id>/", EmergencyProfileView.as_view(), name="emergency-profile"),
]
