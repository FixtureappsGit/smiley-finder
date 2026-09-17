import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { childrenApi, tagsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";
import { PageSpinner } from "../../components/ui/Spinner";
import { ArrowLeft, QrCode } from "lucide-react";

const TAG_TYPES = [
  { value: "nfc_qr_wristband", label: "NFC + QR Wristband", icon: "😊", desc: "Wearable with both NFC and QR" },
  { value: "qr_sticker", label: "QR Sticker", icon: "📱", desc: "Stick on school bag, shoe, etc." },
  { value: "nfc_keychain", label: "NFC Keychain", icon: "🔑", desc: "Attach to keys or bag" },
  { value: "qr_card", label: "QR Card", icon: "🪪", desc: "Laminated card for wallet" },
];

const PLACEMENTS = [
  "wristband","school_bag","shoe","clothing","id_card","travel_bag","bicycle","lunch_bag","other"
];

export default function RequestTagPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedChild = searchParams.get("child") || "";

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => childrenApi.list().then((r) => r.data.results ?? r.data),
  });

  const [form, setForm] = useState({
    child_id: preselectedChild,
    tag_type: "nfc_qr_wristband",
    placement: "wristband",
    notes: "",
    address_line1: "", city: "", state: "", pincode: "",
  });
  const [wantsPhysical, setWantsPhysical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.child_id) { setError("Please select a child."); return; }
    setError(""); setLoading(true);
    try {
      const payload = { ...form };
      if (!wantsPhysical) {
        delete payload.address_line1;
        delete payload.city;
        delete payload.state;
        delete payload.pincode;
      }
      const { data } = await tagsApi.request(payload);
      queryClient.invalidateQueries(["tags"]);
      setSuccess(data);
    } catch (err) {
      setError(
        err.response?.data?.child_id?.[0] ||
        err.response?.data?.detail ||
        "Request failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (childrenLoading) return <PageSpinner />;

  if (success) {
    return (
      <div className="max-w-sm mx-auto text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Tag Created!</h1>
        <p className="text-gray-500 text-sm mb-1">Tag ID: <span className="font-mono font-medium">{success.tag_id}</span></p>
        {success.order_number && (
          <p className="text-gray-500 text-sm mb-4">Order: <span className="font-mono">{success.order_number}</span></p>
        )}
        {success.qr_image_url && (
          <div className="my-5 flex flex-col items-center gap-3">
            <div className="border-2 border-gray-200 rounded-xl p-4 inline-block">
              <img src={success.qr_image_url} alt="QR Code" className="w-44 h-44" />
            </div>
            <p className="text-xs text-gray-500 font-semibold tracking-wide">SCAN FOR HELP</p>
            <a href={success.qr_image_url} download={`SmileyID-${success.tag_id}.png`}
              className="btn-primary text-sm">
              <QrCode size={15} /> Download QR
            </a>
          </div>
        )}
        <div className="flex gap-2 justify-center mt-2">
          <button onClick={() => setSuccess(null)} className="btn-secondary">Request Another</button>
          <Link to="/tags" className="btn-primary">View All Tags</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/tags" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back
      </Link>
      <h1 className="text-xl font-bold mb-5">Request a Tag</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Child select */}
        <div className="card">
          <FormField label="For which child? *">
            <select className="input" value={form.child_id} onChange={set("child_id")} required>
              <option value="">Select a child</option>
              {children?.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Tag type */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700">Tag Type</h2>
          <div className="space-y-2">
            {TAG_TYPES.map((t) => (
              <label key={t.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                form.tag_type === t.value ? "border-brand-400 bg-brand-50" : "border-gray-100 hover:border-gray-200"
              }`}>
                <input type="radio" name="tag_type" value={t.value}
                  checked={form.tag_type === t.value} onChange={set("tag_type")}
                  className="accent-brand-500" />
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Placement */}
        <div className="card">
          <FormField label="Where will this tag be used?">
            <select className="input" value={form.placement} onChange={set("placement")}>
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>{p.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Physical delivery */}
        <div className="card space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={wantsPhysical}
              onChange={(e) => setWantsPhysical(e.target.checked)}
              className="w-4 h-4 accent-brand-500" />
            <span className="text-sm font-medium">Ship physical tag to me</span>
          </label>

          {wantsPhysical && (
            <div className="space-y-3">
              <FormField label="Address line 1">
                <input className="input" value={form.address_line1} onChange={set("address_line1")} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City">
                  <input className="input" value={form.city} onChange={set("city")} />
                </FormField>
                <FormField label="State">
                  <input className="input" value={form.state} onChange={set("state")} />
                </FormField>
              </div>
              <FormField label="Pincode">
                <input className="input" value={form.pincode} onChange={set("pincode")} />
              </FormField>
            </div>
          )}
        </div>

        <div className="pb-6">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating tag…" : "Request Tag & Generate QR"}
          </button>
        </div>
      </form>
    </div>
  );
}
