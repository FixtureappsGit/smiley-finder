import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { emergencyApi } from "../../lib/api";

const COMM_DISPLAY = {
  verbal: { icon: "🗣️", text: "This child can communicate verbally." },
  limited_verbal: { icon: "🗣️", text: "This child has limited verbal communication." },
  non_verbal: { icon: "🤐", text: "This child may be non-verbal. Please be patient and calm." },
};

function CallButton({ name, relationship, mobile }) {
  return (
    <a
      href={`tel:${mobile}`}
      className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:shadow-md transition-shadow active:scale-95"
    >
      <div className="text-left">
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500 capitalize">{relationship?.replace("_", " / ")}</p>
      </div>
      <span className="bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
        📞 CALL
      </span>
    </a>
  );
}

export default function EmergencyPage() {
  const { childId } = useParams();
  const [searchParams] = useSearchParams();
  const tagId = searchParams.get("tag");

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locationSent, setLocationSent] = useState(false);
  const [foundReported, setFoundReported] = useState(false);

  useEffect(() => {
    emergencyApi
      .getProfile(childId, tagId)
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        if (err.response?.status === 410) {
          setError("This tag has been deactivated. Please contact local authorities or call emergency services.");
        } else {
          setError("Profile not found. Please contact local authorities.");
        }
      })
      .finally(() => setLoading(false));
  }, [childId, tagId]);

  const reportFound = () => {
    setFoundReported(true);
    // Ask for location consent
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          emergencyApi.recordScan({
            tag_id: tagId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location_consent: true,
          });
          setLocationSent(true);
        },
        () => {
          // User declined location — still record the found report
          emergencyApi.recordScan({ tag_id: tagId, location_consent: false });
        }
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">😊</div>
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tag Inactive</h1>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <a href="tel:112" className="btn-danger w-full justify-center text-base py-3 rounded-xl">
            🚨 Call Emergency Services (112)
          </a>
        </div>
      </div>
    );
  }

  const comm = profile?.communication_type ? COMM_DISPLAY[profile.communication_type] : null;
  const primaryContact = profile?.emergency_contacts?.find((c) => c.is_primary) || profile?.emergency_contacts?.[0];
  const otherContacts = profile?.emergency_contacts?.filter((c) => c !== primaryContact) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header banner */}
      <div className="bg-brand-500 text-white text-center py-4 px-4">
        <p className="text-2xl font-bold tracking-wide">😊 SMILEY SAFE</p>
        <p className="text-sm opacity-90 mt-0.5">This child may need assistance</p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">

        {/* Child identity */}
        <div className="card text-center py-6">
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-brand-100 mx-auto mb-3" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center text-5xl mx-auto mb-3">
              😊
            </div>
          )}
          {profile?.first_name && (
            <h1 className="text-3xl font-bold text-gray-900">{profile.first_name}</h1>
          )}
          {profile?.preferred_language && (
            <p className="text-sm text-gray-500 mt-1">🌐 {profile.preferred_language}</p>
          )}
        </div>

        {/* Communication alert */}
        {comm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{comm.icon}</span>
            <p className="text-sm text-amber-800 font-medium">{comm.text}</p>
          </div>
        )}

        {/* Special instructions */}
        {profile?.special_instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Instructions</p>
            <p className="text-sm text-blue-800">{profile.special_instructions}</p>
          </div>
        )}

        {/* Allergies */}
        {profile?.allergies && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">⚠️ Allergies</p>
            <p className="text-sm text-red-800">{profile.allergies}</p>
          </div>
        )}

        {/* Contacts */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Please Contact</p>

          {primaryContact && (
            <CallButton
              name={primaryContact.name}
              relationship={primaryContact.relationship}
              mobile={primaryContact.mobile}
            />
          )}

          {otherContacts.map((c, i) => (
            <CallButton key={i} name={c.name} relationship={c.relationship} mobile={c.mobile} />
          ))}
        </div>

        {/* Report found */}
        {!foundReported ? (
          <button
            onClick={reportFound}
            className="w-full border-2 border-brand-300 text-brand-700 font-semibold py-3 rounded-xl hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
          >
            📍 I found this child
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <p className="text-green-700 font-medium text-sm">
              ✅ Thank you! The parent has been notified.
            </p>
            {locationSent && (
              <p className="text-green-600 text-xs mt-1">Location shared to help them find you.</p>
            )}
          </div>
        )}

        {/* Emergency services */}
        <a
          href="tel:112"
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          🚨 EMERGENCY — Call 112
        </a>

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by SmileyID · smileyid.in
        </p>
      </div>
    </div>
  );
}
