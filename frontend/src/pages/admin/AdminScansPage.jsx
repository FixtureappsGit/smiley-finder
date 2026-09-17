import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import DataTable, { Pagination } from "../../components/ui/DataTable";
import { Search, MapPin } from "lucide-react";

export default function AdminScansPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ]           = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-scans", page, q],
    queryFn: () => adminApi.scans({ page, q: q || undefined }).then((r) => r.data),
    keepPreviousData: true,
    refetchInterval: 60_000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  };

  const COLS = [
    { key: "scanned_at", label: "Time", render: (r) => (
      <div>
        <p className="font-medium text-sm">{new Date(r.scanned_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
        <p className="text-xs text-gray-400">{new Date(r.scanned_at).toLocaleDateString("en-IN")}</p>
      </div>
    )},
    { key: "tag_id", label: "Tag", render: (r) => (
      r.tag_id
        ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.tag_id}</span>
        : <span className="text-gray-300 text-xs">—</span>
    )},
    { key: "child", label: "Child", render: (r) => (
      r.child_name
        ? <div>
            <p className="font-medium text-sm">{r.child_name}</p>
            <p className="text-xs text-gray-400">{r.child_id}</p>
          </div>
        : <span className="text-gray-300 text-xs">—</span>
    )},
    { key: "parent_name", label: "Parent", render: (r) => (
      <span className="text-sm">{r.parent_name || "—"}</span>
    )},
    { key: "ip_address", label: "IP Address", render: (r) => (
      <span className="font-mono text-xs">{r.ip_address || "—"}</span>
    )},
    { key: "location", label: "Location", render: (r) => (
      r.location_consent && r.latitude
        ? <a
            href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <MapPin size={11} /> View map
          </a>
        : <span className="text-gray-300 text-xs">Not shared</span>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Scan Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count?.toLocaleString("en-IN") ?? "—"} total scans · refreshes every 60s
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Tag ID or child name…"
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

      <DataTable columns={COLS} data={data?.results} isLoading={isLoading} emptyText="No scans recorded yet." />
      <Pagination count={data?.count ?? 0} page={page} onPage={setPage} />
    </div>
  );
}
