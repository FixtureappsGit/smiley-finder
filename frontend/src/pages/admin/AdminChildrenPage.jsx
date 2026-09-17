import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import DataTable, { Pagination } from "../../components/ui/DataTable";
import { Search } from "lucide-react";

const COMM_LABEL = {
  verbal: "Verbal",
  limited_verbal: "Limited Verbal",
  non_verbal: "Non-Verbal",
};

export default function AdminChildrenPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ]           = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-children", page, q],
    queryFn: () => adminApi.children({ page, q: q || undefined, active: "true" }).then((r) => r.data),
    keepPreviousData: true,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  };

  const COLS = [
    { key: "child_id", label: "Child ID", render: (r) => (
      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.child_id}</span>
    )},
    { key: "name", label: "Name", render: (r) => (
      <div>
        <p className="font-medium">{r.first_name} {r.last_name}</p>
        <p className="text-xs text-gray-400">{r.age} yrs · {COMM_LABEL[r.communication_type]}</p>
      </div>
    )},
    { key: "parent", label: "Parent", render: (r) => (
      <div>
        <p className="font-medium text-sm">{r.parent_name}</p>
        <p className="text-xs text-gray-400">{r.parent_email}</p>
      </div>
    )},
    { key: "parent_mobile", label: "Parent Mobile" },
    { key: "active_tag_count", label: "Active Tags", render: (r) => (
      <span className={`font-semibold ${r.active_tag_count > 0 ? "text-green-600" : "text-gray-400"}`}>
        {r.active_tag_count}
      </span>
    )},
    { key: "created_at", label: "Added", render: (r) => new Date(r.created_at).toLocaleDateString("en-IN") },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Children</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count?.toLocaleString("en-IN") ?? "—"} registered children
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search by name, child ID, or parent email…"
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

      <DataTable columns={COLS} data={data?.results} isLoading={isLoading} emptyText="No children found." />
      <Pagination count={data?.count ?? 0} page={page} onPage={setPage} />
    </div>
  );
}
