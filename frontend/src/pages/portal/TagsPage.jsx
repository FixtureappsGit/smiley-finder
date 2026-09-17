import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tagsApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { PageSpinner } from "../../components/ui/Spinner";
import { Plus, QrCode, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";

const STATUS_BADGE = {
  active: "badge-active",
  requested: "badge-pending",
  generated: "badge-pending",
  activated: "badge-pending",
  lost: "badge-danger",
  deactivated: "badge-inactive",
  replaced: "badge-inactive",
};

const TAG_ICON = {
  nfc_qr_wristband: "😊",
  qr_sticker: "📱",
  nfc_keychain: "🔑",
  qr_card: "🪪",
};

function QRModal({ tag, onClose }) {
  if (!tag) return null;
  return (
    <Modal open={!!tag} onClose={onClose} title="Download QR Code">
      <div className="text-center space-y-4">
        <p className="text-xs text-gray-500 font-mono">{tag.tag_id}</p>
        {tag.qr_image_url ? (
          <div className="flex flex-col items-center gap-3">
            <div className="border-2 border-gray-200 rounded-xl p-4 inline-block">
              <img src={tag.qr_image_url} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-500 font-medium">SCAN FOR HELP</p>
            <div className="flex gap-2 justify-center">
              <a href={tag.qr_image_url} download={`SmileyID-${tag.tag_id}.png`}
                className="btn-primary text-sm">
                <QrCode size={15} /> Download PNG
              </a>
              <button onClick={onClose} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">QR code not yet generated.</p>
        )}
      </div>
    </Modal>
  );
}

export default function TagsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState(null);
  const [reportTag, setReportTag] = useState(null);
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState("");

  const { data: tags, isLoading } = useQuery({
    queryKey: ["tags", user?.id],
    queryFn: () => tagsApi.list().then((r) => r.data.results ?? r.data),
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, status, notes }) => tagsApi.report(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tags"]);
      setReportTag(null);
      setReportNote("");
    },
    onError: (err) => setReportError(err.response?.data?.detail || "Failed to update tag."),
  });

  const grouped = tags?.reduce((acc, tag) => {
    const name = tag.child_name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(tag);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-500 mt-0.5">All your QR and NFC tags</p>
        </div>
        <Link to="/tags/request" className="btn-primary text-sm">
          <Plus size={15} /> Request Tag
        </Link>
      </div>

      {isLoading && <PageSpinner />}

      {!isLoading && !tags?.length && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🏷️</div>
          <p className="font-medium text-gray-700">No tags yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">Request a QR or NFC tag for your child</p>
          <Link to="/tags/request" className="btn-primary inline-flex">
            <Plus size={15} /> Request first tag
          </Link>
        </div>
      )}

      {grouped && Object.entries(grouped).map(([childName, childTags]) => (
        <section key={childName} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {childName}
          </h2>
          <div className="space-y-3">
            {childTags.map((tag) => (
              <div key={tag.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TAG_ICON[tag.tag_type] || "🏷️"}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {tag.tag_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{tag.tag_id}</p>
                      {tag.placement && (
                        <p className="text-xs text-gray-400 capitalize">{tag.placement.replace("_", " ")}</p>
                      )}
                    </div>
                  </div>
                  <span className={STATUS_BADGE[tag.status] || "badge-inactive capitalize"}>
                    {tag.status}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {tag.qr_image_url && (
                    <button onClick={() => setSelectedTag(tag)}
                      className="btn-secondary text-xs px-3 py-1.5">
                      <QrCode size={13} /> View QR
                    </button>
                  )}
                  <Link
                    to={`/tags/${tag.id}/card`}
                    className="btn-secondary text-xs px-3 py-1.5 gap-1 inline-flex items-center"
                  >
                    🪪 ID Card
                  </Link>
                  {["active", "activated", "generated"].includes(tag.status) && (
                    <button onClick={() => { setReportTag(tag); setReportError(""); }}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      <AlertTriangle size={13} /> Report Lost
                    </button>
                  )}
                  {tag.status === "requested" && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock size={13} /> Pending activation
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* QR view modal */}
      <QRModal tag={selectedTag} onClose={() => setSelectedTag(null)} />

      {/* Report lost modal */}
      <Modal open={!!reportTag} onClose={() => setReportTag(null)} title="Report Tag as Lost">
        <div className="space-y-4">
          {reportError && <Alert type="error">{reportError}</Alert>}
          <p className="text-sm text-gray-600">
            This will immediately deactivate <strong className="font-mono">{reportTag?.tag_id}</strong>.
            The QR code will stop working. You can request a replacement tag after.
          </p>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="e.g. Lost at school" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReportTag(null)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => reportMutation.mutate({ id: reportTag.id, status: "lost", notes: reportNote })}
              disabled={reportMutation.isPending}
              className="btn-danger flex-1">
              {reportMutation.isPending ? "Deactivating…" : "Deactivate Tag"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
