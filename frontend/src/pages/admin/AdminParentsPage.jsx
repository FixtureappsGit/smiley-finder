import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import DataTable, { Pagination } from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import { Search, UserCheck, UserX } from "lucide-react";

export default function AdminParentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [q, setQ]             = useState("");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg]         = useState({ type: "", text: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-parents", page, q],
    queryFn: () => adminApi.users({ page, q: q || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => adminApi.updateUser(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-parents"]);
      queryClient.invalidateQueries(["admin-stats"]);
      setSelected(null);
      setMsg({ type: "success", text: "User updated." });
      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    },
    onError: () => setMsg({ type: "error", text: "Update failed." }),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  };

  const COLS = [
    { key: "full_name", label: "Name", render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.full_name}</p>
        <p className="text-xs text-gray-400">{r.email}</p>
      </div>
    )},
    { key: "mobile",    label: "Mobile" },
    { key: "children_count", label: "Children", render: (r) => (
      <span className="font-medium">{r.children_count}</span>
    )},
    { key: "is_email_verified", label: "Verified", render: (r) => (
      <div className="flex gap-1">
        <span className={r.is_email_verified ? "badge-active" : "badge-inactive"}>
          {r.is_email_verified ? "✉️ Email" : "✉️ Email ✗"}
        </span>
      </div>
    )},
    { key: "is_active", label: "Status", render: (r) => (
      <span className={r.is_active ? "badge-active" : "badge-danger"}>
        {r.is_active ? "Active" : "Suspended"}
      </span>
    )},
    { key: "created_at", label: "Joined", render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
    { key: "actions", label: "", render: (r) => (
      <button
        onClick={() => setSelected(r)}
        className="text-xs text-brand-600 hover:underline font-medium"
      >
        Manage
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Parents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count?.toLocaleString("en-IN") ?? "—"} registered parents
          </p>
        </div>
      </div>

      {msg.text && (
        <div className="mb-4"><Alert type={msg.type}>{msg.text}</Alert></div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search by name, email, or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">Search</button>
        {q && (
          <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(1); }}
            className="btn-secondary">Clear</button>
        )}
      </form>

      <DataTable columns={COLS} data={data?.results} isLoading={isLoading} emptyText="No parents found." />
      <Pagination count={data?.count ?? 0} page={page} onPage={setPage} />

      {/* Manage modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`Manage — ${selected.full_name}`}>
          <div className="space-y-4">
            <div className="text-sm space-y-1 text-gray-600">
              <p><span className="font-medium">Email:</span> {selected.email}</p>
              <p><span className="font-medium">Mobile:</span> {selected.mobile}</p>
              <p><span className="font-medium">Children:</span> {selected.children_count}</p>
              <p><span className="font-medium">Joined:</span> {new Date(selected.created_at).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="flex gap-2 pt-2">
              {selected.is_active ? (
                <button
                  onClick={() => toggleMutation.mutate({ id: selected.id, is_active: false })}
                  disabled={toggleMutation.isPending}
                  className="btn-danger flex-1 gap-1"
                >
                  <UserX size={15} /> Suspend Account
                </button>
              ) : (
                <button
                  onClick={() => toggleMutation.mutate({ id: selected.id, is_active: true })}
                  disabled={toggleMutation.isPending}
                  className="btn-primary flex-1 gap-1"
                >
                  <UserCheck size={15} /> Reactivate Account
                </button>
              )}
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
