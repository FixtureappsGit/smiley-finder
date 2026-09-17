import Spinner from "./Spinner";

export default function DataTable({ columns, data, isLoading, emptyText = "No records found." }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex justify-center"><Spinner size="md" /></div>
              </td>
            </tr>
          ) : data?.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data?.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ count, page, pageSize = 25, onPage }) {
  const total = Math.ceil(count / pageSize);
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <p>{count.toLocaleString("en-IN")} records</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg font-medium">
          {page} / {total}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === total}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
