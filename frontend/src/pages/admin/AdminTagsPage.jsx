import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../lib/api";
import DataTable, { Pagination } from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import { Search, QrCode, CheckCircle } from "lucide-react";

const STATUS_BADGE = {
  active:      "badge-active",
  requested:   "badge-pending",
  generated:   "badge-pending",
  activated:   "badge-pending",
  lost:        "badge-danger",
  deactivated: "badge-inactive",
  replaced:    "badge-inactive",
};

const TAG_ICON = {
  nfc_qr_wristband: "😊",
  qr_sticker: "📱",
  nfc_keychain: "🔑",
  qr_card: "🪪",
};

// Which transitions admin can trigger from UI
const NEXT_STATUSES = {
  requested:   ["generated", "deactivated"],
  generated:   ["activated", "active", "deactivated"],
  activated:   ["active", "deactivated"],
  active:      ["deactivated", "replaced"],
  lost:        ["deactivated", "replaced"],
  deactivated: ["replaced"],
  replaced:    [],
};

export default function AdminTagsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [q, setQ]             = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [nfcUid, setNfcUid]   = useState("");
  const [notes, setNotes]     = useState("");
  const [msg, setMsg]         = useState({ type: "", text: "" });

  // When URL param changes (e.g. from dashboard quick-link), update filter
  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatusFilter(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tags", page, q, statusFilter],
    queryFn: () => adminApi.tags({
      page,
      q: q || undefined,
      status: statusFilter || undefined,
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => adminApi.updateTag(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["admin-tags"]);
      queryClient.invalidateQueries(["admin-stats"]);
      setSelected(null);
      const s = res.data.status;
      setMsg({ type: "success", text: `Tag updated to "${s}".` });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    },
    onError: (err) => setMsg({ type: "error", text: err.response?.data?.detail || "Update failed." }),
  });

  const openModal = (tag) => {
    setSelected(tag);
    setNewStatus("");
    setNfcUid(tag.nfc_uid || "");
    setNotes("");
  };

  const handleUpdate = () => {
    if (!newStatus && !nfcUid) return;
    updateMutation.mutate({
      id: selected.id,
      ...(newStatus ? { status: newStatus, notes } : {}),
      ...(nfcUid !== selected.nfc_uid ? { nfc_uid: nfcUid } : {}),
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  };

  const STATUS_OPTIONS = ["", "requested", "generated", "activated", "active", "lost", "deactivated", "replaced"];

  const COLS = [
    { key: "tag_id", label: "Tag ID", render: (r) => (
      <div className="flex items-center gap-2">
        <span className="text-lg">{TAG_ICON[r.tag_type] || "🏷️"}</span>
        <div>
          <p className="font-mono text-xs font-semibold">{r.tag_id}</p>
          <p className="text-xs text-gray-400">{r.tag_type.replace(/_/g, " ")}</p>
        </div>
      </div>
    )},
    { key: "child", label: "Child / Parent", render: (r) => (
      <div>
        <p className="font-medium text-sm">{r.child_name} <span className="text-gray-400 text-xs">{r.child_id}</span></p>
        <p className="text-xs text-gray-400">{r.parent_name}</p>
      </div>
    )},
    { key: "status", label: "Status", render: (r) => (
      <span className={`capitalize ${STATUS_BADGE[r.status] || "badge-inactive"}`}>{r.status}</span>
    )},
    { key: "nfc_uid", label: "NFC UID", render: (r) => (
      r.nfc_uid
        ? <span className="font-mono text-xs text-gray-600">{r.nfc_uid}</span>
        : <span className="text-gray-300 text-xs">—</span>
    )},
    { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
    { key: "actions", label: "", render: (r) => (
      <button onClick={() => openModal(r)} className="text-xs text-brand-600 hover:underline font-medium">
        Manage
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count?.toLocaleString("en-IN") ?? "—"} tags
          </p>
        </div>
      </div>

      {msg.text && <div className="mb-4"><Alert type={msg.type}>{msg.text}</Alert></div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 w-56" placeholder="Tag ID or child name…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <select
          className="input w-44"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All statuses"}</option>
          ))}
        </select>
        {(q || statusFilter) && (
          <button onClick={() => { setQ(""); setSearch(""); setStatusFilter(""); setPage(1); }}
            className="btn-secondary text-sm">Clear filters</button>
        )}
      </div>

      <DataTable columns={COLS} data={data?.results} isLoading={isLoading} emptyText="No tags found." />
      <Pagination count={data?.count ?? 0} page={page} onPage={setPage} />

      {/* Manage modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`Manage Tag — ${selected.tag_id}`}>
          <div className="space-y-4">
            {/* QR preview */}
            {selected.qr_image_url && (
              <div className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                <img src={selected.qr_image_url} alt="QR" className="w-16 h-16 rounded" />
                <div className="text-sm">
                  <p className="font-medium">{selected.tag_id}</p>
                  <p className="text-gray-500 text-xs">{selected.child_name} · {selected.parent_name}</p>
                  <a href={selected.qr_image_url} download={`QR-${selected.tag_id}.png`}
                    className="text-brand-600 text-xs hover:underline flex items-center gap-1 mt-1">
                    <QrCode size={12} /> Download QR
                  </a>
                </div>
              </div>
            )}

            <div className="text-sm space-y-1 text-gray-600">
              <p><span className="font-medium">Current status:</span>{" "}
                <span className={`capitalize ml-1 ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
              </p>
              <p><span className="font-medium">Type:</span> {selected.tag_type.replace(/_/g, " ")}</p>
              <p><span className="font-medium">Placement:</span> {selected.placement}</p>
              {selected.activated_at && <p><span className="font-medium">Activated:</span> {new Date(selected.activated_at).toLocaleDateString("en-IN")}</p>}
            </div>

            {/* NFC UID assignment */}
            <div>
              <label className="label">Assign NFC UID (optional)</label>
              <input className="input font-mono" placeholder="e.g. 04:A1:B2:C3:D4:E5"
                value={nfcUid} onChange={(e) => setNfcUid(e.target.value)} />
            </div>

            {/* Status transition */}
            {NEXT_STATUSES[selected.status]?.length > 0 && (
              <div>
                <label className="label">Change status to</label>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[selected.status].map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        newStatus === s
                          ? "bg-brand-500 text-white border-brand-500"
                          : "border-gray-200 text-gray-600 hover:border-brand-300"
                      }`}
                    >
                      {s === "active" && <CheckCircle size={13} className="inline mr-1" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {newStatus && (
              <div>
                <label className="label">Notes (optional)</label>
                <input className="input" placeholder="Reason for status change…"
                  value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleUpdate}
                disabled={updateMutation.isPending || (!newStatus && nfcUid === (selected.nfc_uid || ""))}
                className="btn-primary flex-1"
              >
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
