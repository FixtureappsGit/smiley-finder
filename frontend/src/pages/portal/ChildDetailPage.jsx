import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childrenApi, tagsApi } from "../../lib/api";
import { PageSpinner } from "../../components/ui/Spinner";
import { ArrowLeft, Edit, Tag, Plus, AlertTriangle, QrCode } from "lucide-react";

const STATUS_BADGE = {
  active: "badge-active",
  requested: "badge-pending",
  generated: "badge-pending",
  activated: "badge-pending",
  lost: "badge-danger",
  deactivated: "badge-inactive",
  replaced: "badge-inactive",
};

const TAG_TYPE_ICON = {
  nfc_qr_wristband: "😊",
  qr_sticker: "📱",
  nfc_keychain: "🔑",
  qr_card: "🪪",
};

function TagCard({ tag, onReport }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TAG_TYPE_ICON[tag.tag_type] || "🏷️"}</span>
          <div>
            <p className="font-medium text-sm text-gray-800">{tag.tag_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
            <p className="text-xs text-gray-400 font-mono">{tag.tag_id}</p>
          </div>
        </div>
        <span className={STATUS_BADGE[tag.status] || "badge-inactive"}>{tag.status}</span>
      </div>

      <div className="flex gap-2 mt-3">
        {tag.qr_image_url && (
          <a href={tag.qr_image_url} download={`QR-${tag.tag_id}.png`}
            className="btn-secondary text-xs px-3 py-1.5 gap-1">
            <QrCode size={13} /> Download QR
          </a>
        )}
        <Link to={`/tags/${tag.id}/card`}
          className="btn-secondary text-xs px-3 py-1.5 gap-1 inline-flex items-center">
          🪪 ID Card
        </Link>
        {(tag.status === "active" || tag.status === "activated") && (
          <button onClick={() => onReport(tag)}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <AlertTriangle size={13} /> Report Lost
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: child, isLoading } = useQuery({
    queryKey: ["child", id],
    queryFn: () => childrenApi.get(id).then((r) => r.data),
  });

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ["child-tags", id],
    queryFn: () => tagsApi.childTags(id).then((r) => r.data.results ?? r.data),
  });

  const reportMutation = useMutation({
    mutationFn: ({ tagId }) => tagsApi.report(tagId, { status: "lost", notes: "Reported lost by parent" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["child-tags", id]);
      queryClient.invalidateQueries(["tags"]);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!child) return <div className="text-center py-12 text-gray-500">Child not found.</div>;

  const commMap = { verbal: "🗣️ Verbal", limited_verbal: "🗣️ Limited Verbal", non_verbal: "🤐 Non-Verbal" };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Profile header */}
      <div className="card flex items-center gap-5 mb-5">
        {child.photo ? (
          <img src={child.photo} alt={child.first_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-brand-100" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-4xl">😊</div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{child.first_name} {child.last_name}</h1>
          <p className="text-sm text-gray-500">{child.age} years old · {child.child_id}</p>
          <p className="text-sm text-gray-600 mt-1">{commMap[child.communication_type]}</p>
        </div>
        <Link to={`/children/${id}/edit`} className="btn-secondary text-sm gap-1 flex-shrink-0">
          <Edit size={15} /> Edit
        </Link>
      </div>

      {/* Emergency contacts */}
      {child.emergency_contacts?.length > 0 && (
        <div className="card mb-5">
          <h2 className="font-semibold text-gray-700 mb-3">Emergency Contacts</h2>
          <div className="space-y-3">
            {child.emergency_contacts.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.relationship.replace("_", " / ")} {c.is_primary && "· Primary"}</p>
                </div>
                <a href={`tel:${c.mobile}`} className="btn-primary text-xs px-3 py-1.5">📞 {c.mobile}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional info */}
      {(child.allergies || child.medical_info || child.special_instructions) && (
        <div className="card mb-5 space-y-2">
          <h2 className="font-semibold text-gray-700 mb-1">Medical & Notes</h2>
          {child.allergies && <p className="text-sm"><span className="font-medium">Allergies:</span> {child.allergies}</p>}
          {child.medical_info && <p className="text-sm"><span className="font-medium">Medical:</span> {child.medical_info}</p>}
          {child.special_instructions && <p className="text-sm"><span className="font-medium">Instructions:</span> {child.special_instructions}</p>}
        </div>
      )}

      {/* Tags */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Tags</h2>
          <Link to={`/tags/request?child=${id}`} className="btn-primary text-xs px-3 py-1.5">
            <Plus size={13} /> Request Tag
          </Link>
        </div>

        {tagsLoading && <div className="text-sm text-gray-400 py-3">Loading tags…</div>}

        {!tagsLoading && tags?.length === 0 && (
          <p className="text-sm text-gray-500 py-3">No tags yet. Request one above.</p>
        )}

        <div className="space-y-3">
          {tags?.map((tag) => (
            <TagCard key={tag.id} tag={tag}
              onReport={(t) => reportMutation.mutate({ tagId: t.id })} />
          ))}
        </div>
      </div>
    </div>
  );
}
