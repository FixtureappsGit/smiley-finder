import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../../lib/api";
import DataTable, { Pagination } from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import { Search } from "lucide-react";

const STATUS_BADGE = {
  pending:    "badge-pending",
  processing: "badge-pending",
  shipped:    "badge-active",
  delivered:  "badge-active",
  cancelled:  "badge-inactive",
};

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [q, setQ]             = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes]     = useState("");
  const [msg, setMsg]         = useState({ type: "", text: "" });

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatusFilter(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, q, statusFilter],
    queryFn: () => adminApi.orders({
      page,
      q: q || undefined,
      status: statusFilter || undefined,
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }) => adminApi.updateOrder(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-orders"]);
      queryClient.invalidateQueries(["admin-stats"]);
      setSelected(null);
      setMsg({ type: "success", text: "Order updated." });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    },
    onError: () => setMsg({ type: "error", text: "Update failed." }),
  });

  const openModal = (order) => {
    setSelected(order);
    setNewStatus(order.status);
    setNotes(order.notes || "");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  };

  const COLS = [
    { key: "order_number", label: "Order #", render: (r) => (
      <span className="font-mono text-xs font-semibold">{r.order_number}</span>
    )},
    { key: "parent", label: "Parent", render: (r) => (
      <div>
        <p className="font-medium text-sm">{r.parent_name}</p>
        <p className="text-xs text-gray-400">{r.parent_email}</p>
      </div>
    )},
    { key: "child_name", label: "Child" },
    { key: "tag_type", label: "Tag Type", render: (r) => (
      <span className="text-xs text-gray-600">{r.tag_type.replace(/_/g, " ")}</span>
    )},
    { key: "address", label: "Ship To", render: (r) => (
      r.city ? <span className="text-xs">{r.city}, {r.state} {r.pincode}</span>
              : <span className="text-gray-300 text-xs">Digital only</span>
    )},
    { key: "status", label: "Status", render: (r) => (
      <span className={`capitalize ${STATUS_BADGE[r.status] || "badge-inactive"}`}>{r.status}</span>
    )},
    { key: "created_at", label: "Date", render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
    { key: "actions", label: "", render: (r) => (
      <button onClick={() => openModal(r)} className="text-xs text-brand-600 hover:underline font-medium">
        Update
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count?.toLocaleString("en-IN") ?? "—"} orders
          </p>
        </div>
      </div>

      {msg.text && <div className="mb-4"><Alert type={msg.type}>{msg.text}</Alert></div>}

      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 w-56" placeholder="Order # or parent name…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        <select className="input w-40" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(q || statusFilter) && (
          <button onClick={() => { setQ(""); setSearch(""); setStatusFilter(""); setPage(1); }}
            className="btn-secondary text-sm">Clear</button>
        )}
      </div>

      <DataTable columns={COLS} data={data?.results} isLoading={isLoading} emptyText="No orders found." />
      <Pagination count={data?.count ?? 0} page={page} onPage={setPage} />

      {/* Update modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`Order — ${selected.order_number}`}>
          <div className="space-y-4">
            <div className="text-sm space-y-1 text-gray-600">
              <p><span className="font-medium">Parent:</span> {selected.parent_name} · {selected.parent_email}</p>
              <p><span className="font-medium">Child:</span> {selected.child_name}</p>
              <p><span className="font-medium">Tag type:</span> {selected.tag_type.replace(/_/g, " ")}</p>
              {selected.tag_id && <p><span className="font-medium">Tag:</span> <span className="font-mono">{selected.tag_id}</span></p>}
              {selected.city && (
                <p><span className="font-medium">Ship to:</span> {selected.address_line1}, {selected.city}, {selected.state} {selected.pincode}</p>
              )}
            </div>

            <div>
              <label className="label">Order Status</label>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setNewStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                      newStatus === s
                        ? "bg-brand-500 text-white border-brand-500"
                        : "border-gray-200 text-gray-600 hover:border-brand-300"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tracking number, courier details…" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateMutation.mutate({ id: selected.id, status: newStatus, notes })}
                disabled={updateMutation.isPending}
                className="btn-primary flex-1"
              >
                {updateMutation.isPending ? "Saving…" : "Update Order"}
              </button>
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
