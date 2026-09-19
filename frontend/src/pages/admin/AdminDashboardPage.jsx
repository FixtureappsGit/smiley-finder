import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import { PageSpinner } from "../../components/ui/Spinner";
import { Link } from "react-router-dom";
import { Users, Baby, Tag, ScanLine, ShoppingBag, AlertTriangle, TrendingUp } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, to }) {
  const inner = (
    <div className="card hover:shadow-md transition-shadow flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {value?.toLocaleString("en-IN") ?? "—"}
        </p>
        <p className="text-sm text-gray-500 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

const STATS_CONFIG = (s) => [
  { label: "Parents",          value: s?.parents,          icon: Users,         iconBg: "bg-blue-50",   iconColor: "text-blue-500",   to: "/admin/parents" },
  { label: "Children",         value: s?.children,         icon: Baby,          iconBg: "bg-pink-50",   iconColor: "text-pink-500",   to: "/admin/children" },
  { label: "Active Tags",      value: s?.active_tags,      icon: Tag,           iconBg: "bg-green-50",  iconColor: "text-green-500",  to: "/admin/tags" },
  { label: "QR Scans Today",   value: s?.qr_scans_today,   icon: ScanLine,      iconBg: "bg-purple-50", iconColor: "text-purple-500", to: "/admin/scans",   sub: `${s?.total_scans?.toLocaleString("en-IN") ?? "—"} total` },
  { label: "Tags Requested",   value: s?.tags_requested,   icon: TrendingUp,    iconBg: "bg-amber-50",  iconColor: "text-amber-500",  to: "/admin/tags?status=requested" },
  { label: "Lost / Deactivated",value: s?.lost_deactivated,icon: AlertTriangle, iconBg: "bg-red-50",    iconColor: "text-red-500",    to: "/admin/tags?status=lost" },
  { label: "Pending Orders",   value: s?.pending_orders,   icon: ShoppingBag,   iconBg: "bg-orange-50", iconColor: "text-orange-500", to: "/admin/orders?status=pending" },
  { label: "Unverified Users", value: s?.unverified_users, icon: Users,         iconBg: "bg-gray-100",  iconColor: "text-gray-400",   to: "/admin/parents" },
];

export default function AdminDashboardPage() {
  const { data: stats, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Platform overview
            {updatedAt && <span className="ml-2 text-gray-400">· Updated {updatedAt}</span>}
          </p>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS_CONFIG(stats).map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/tags?status=requested" className="card hover:shadow-md transition-shadow group">
          <p className="font-semibold text-gray-900 group-hover:text-brand-600">Activate Pending Tags</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.tags_requested ?? 0} tag{stats?.tags_requested !== 1 ? "s" : ""} waiting for activation
          </p>
        </Link>
        <Link to="/admin/orders?status=pending" className="card hover:shadow-md transition-shadow group">
          <p className="font-semibold text-gray-900 group-hover:text-brand-600">Process Orders</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.pending_orders ?? 0} order{stats?.pending_orders !== 1 ? "s" : ""} pending shipment
          </p>
        </Link>
        <a
          href="https://smileyfinder.fixtureapps.com/django-admin/"
          target="_blank"
          rel="noreferrer"
          className="card hover:shadow-md transition-shadow group"
        >
          <p className="font-semibold text-gray-900 group-hover:text-brand-600">Django Admin ↗</p>
          <p className="text-sm text-gray-500 mt-1">Direct database access, raw record editing</p>
        </a>
      </div>
    </div>
  );
}
