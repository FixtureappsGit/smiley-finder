import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { childrenApi } from "../../lib/api";
import { PageSpinner } from "../../components/ui/Spinner";
import { Plus, Tag, ChevronRight, CreditCard, ChevronDown } from "lucide-react";

const COMM_LABEL = {
  verbal: "Verbal",
  limited_verbal: "Limited Verbal",
  non_verbal: "Non-Verbal",
};

// ── ID Card button — direct link if 1 tag, dropdown if multiple ──────────────
function IDCardButton({ tags, childId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!tags || tags.length === 0) {
    return (
      <Link
        to={`/tags/request?child=${childId}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs text-brand-600 border border-brand-200
                   bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
      >
        <Tag size={11} /> Get Tag
      </Link>
    );
  }

  if (tags.length === 1) {
    return (
      <Link
        to={`/tags/${tags[0].id}/card`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200
                   bg-white hover:bg-gray-50 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
      >
        <CreditCard size={11} /> ID Card
      </Link>
    );
  }

  // Multiple tags — dropdown
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((p) => !p); }}
        className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200
                   bg-white hover:bg-gray-50 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
      >
        <CreditCard size={11} /> ID Card <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-100
                        rounded-xl shadow-lg py-1 min-w-[160px]">
          {tags.map((t) => (
            <Link
              key={t.id}
              to={`/tags/${t.id}/card`}
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50
                         text-gray-700 transition-colors"
            >
              <span className="font-mono font-medium">{t.tag_id}</span>
              <span className={`ml-2 capitalize text-xs ${
                t.status === "active" ? "text-green-600" : "text-amber-600"
              }`}>{t.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Child card ───────────────────────────────────────────────────────────────
function ChildCard({ child }) {
  return (
    <div className="card hover:border-brand-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Link to={`/children/${child.id}`} className="flex-shrink-0">
          {child.photo ? (
            <img src={child.photo} alt={child.first_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-brand-100" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl">
              😊
            </div>
          )}
        </Link>

        {/* Info */}
        <Link to={`/children/${child.id}`} className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{child.first_name} {child.last_name}</p>
          <p className="text-sm text-gray-500">{child.age} year{child.age !== 1 ? "s" : ""} old</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tag size={11} />
              {child.active_tag_count} tag{child.active_tag_count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-gray-400">
              {COMM_LABEL[child.communication_type] || child.communication_type}
            </span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <IDCardButton tags={child.tags} childId={child.id} />
          <Link to={`/children/${child.id}`}
            className="text-gray-300 hover:text-brand-400 transition-colors">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { data: children, isLoading } = useQuery({
    queryKey: ["children", user?.id],
    queryFn: () => childrenApi.list().then((r) => r.data.results ?? r.data),
  });

  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your children's safety profiles</p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Link to="/children/add" className="btn-primary flex-1 justify-center">
          <Plus size={16} /> Add Child
        </Link>
        <Link to="/tags/request" className="btn-secondary flex-1 justify-center">
          <Tag size={16} /> Request Tag
        </Link>
      </div>

      {/* Children list */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          My Children
        </h2>

        {isLoading && <PageSpinner />}

        {!isLoading && children?.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">👶</div>
            <p className="font-medium text-gray-700">No children added yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Add your child to create their safety profile
            </p>
            <Link to="/children/add" className="btn-primary inline-flex">
              <Plus size={16} /> Add first child
            </Link>
          </div>
        )}

        {!isLoading && children?.length > 0 && (
          <div className="space-y-3">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
