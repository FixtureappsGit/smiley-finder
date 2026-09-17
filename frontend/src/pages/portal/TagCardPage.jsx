import { useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tagsApi, childrenApi } from "../../lib/api";
import { PageSpinner } from "../../components/ui/Spinner";
import { ArrowLeft, Download, Printer, Phone } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const COMM_LABEL = {
  verbal:         { text: "Can communicate verbally",         color: "bg-green-100 text-green-700" },
  limited_verbal: { text: "Limited verbal communication",     color: "bg-yellow-100 text-yellow-700" },
  non_verbal:     { text: "May be non-verbal — be patient",   color: "bg-orange-100 text-orange-700" },
};

// ── Printable card component (rendered into a fixed-size div) ─────────────────
function IDCard({ child, tag, contacts }) {
  const comm = COMM_LABEL[child.communication_type] || COMM_LABEL.verbal;

  return (
    <div
      id="smiley-id-card"
      style={{ width: "340px", minHeight: "520px", fontFamily: "Inter, system-ui, sans-serif" }}
      className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200 flex flex-col"
    >
      {/* Header band */}
      <div className="bg-orange-500 px-5 py-3 flex items-center gap-2">
        <span style={{ fontSize: "22px" }}>😊</span>
        <div>
          <p className="text-white font-bold text-sm leading-none">SMILEY ID</p>
          <p className="text-orange-100 text-xs">Child Safety Identification</p>
        </div>
        <div className="ml-auto">
          <p className="text-orange-200 text-xs font-mono">{tag.tag_id}</p>
        </div>
      </div>

      {/* Child section */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-4 border-b border-gray-100">
        {child.photo && child.show_photo ? (
          <img
            src={child.photo}
            alt={child.first_name}
            crossOrigin="anonymous"
            style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover",
                     border: "2px solid #fed7aa" }}
          />
        ) : (
          <div style={{ width: "64px", height: "64px", borderRadius: "50%",
                        background: "#ffedd5", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "28px" }}>
            😊
          </div>
        )}
        <div>
          {child.show_first_name && (
            <p style={{ fontSize: "20px", fontWeight: "700", color: "#111", lineHeight: 1.2 }}>
              {child.first_name} {child.last_name}
            </p>
          )}
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
            {child.age} years old
          </p>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>{child.child_id}</p>
        </div>
      </div>

      {/* Communication alert */}
      {child.show_communication && (
        <div style={{ margin: "10px 20px 0", padding: "8px 12px",
                      borderRadius: "8px", fontSize: "11px", fontWeight: "600" }}
             className={comm.color}>
          🗣 {comm.text}
        </div>
      )}

      {/* Special instructions */}
      {child.show_special_instructions && child.special_instructions && (
        <div style={{ margin: "8px 20px 0", padding: "8px 12px",
                      borderRadius: "8px", background: "#eff6ff",
                      border: "1px solid #bfdbfe" }}>
          <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase",
                      letterSpacing: "0.07em", color: "#3b82f6", marginBottom: "3px" }}>
            Special Instructions
          </p>
          <p style={{ fontSize: "11px", color: "#1e40af", lineHeight: 1.5 }}>
            {child.special_instructions}
          </p>
        </div>
      )}

      {/* Preferred language */}
      {child.show_preferred_language && child.preferred_language && (
        <div style={{ margin: "6px 20px 0", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px" }}>🌐</span>
          <p style={{ fontSize: "11px", color: "#6b7280" }}>
            Language: <strong style={{ color: "#374151" }}>{child.preferred_language}</strong>
          </p>
        </div>
      )}

      {/* Emergency contacts */}
      <div className="px-5 pt-3 flex-1">
        <p style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "6px" }}>
          Emergency Contacts
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {contacts.slice(0, 3).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                                   background: "#f9fafb", borderRadius: "8px", padding: "7px 10px" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>{c.name}</p>
                <p style={{ fontSize: "10px", color: "#6b7280", textTransform: "capitalize" }}>
                  {c.relationship.replace(/_/g, " / ")}
                  {c.is_primary ? " · Primary" : ""}
                </p>
              </div>
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#ea580c",
                           fontFamily: "monospace" }}>{c.mobile}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR code + instructions */}
      <div className="px-5 py-4 flex items-center gap-4 border-t border-gray-100 mt-3">
        {tag.qr_image_url && (
          <div style={{ border: "2px solid #e5e7eb", borderRadius: "8px", padding: "4px",
                        background: "white" }}>
            <img
              src={tag.qr_image_url}
              alt="QR"
              crossOrigin="anonymous"
              style={{ width: "72px", height: "72px" }}
            />
          </div>
        )}
        <div>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#111", marginBottom: "2px" }}>
            SCAN FOR HELP
          </p>
          <p style={{ fontSize: "10px", color: "#6b7280", lineHeight: 1.5 }}>
            Scanning this QR shows<br />
            emergency contacts instantly.<br />
            No app required.
          </p>
          {child.show_communication && child.communication_type === "non_verbal" && (
            <p style={{ fontSize: "10px", color: "#ea580c", fontWeight: "600", marginTop: "4px" }}>
              ⚠ May be non-verbal
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6",
                    padding: "6px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "9px", color: "#d1d5db" }}>
          smileyid.in · {tag.tag_id} · If found, scan QR or call emergency contact
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TagCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const { data: tag, isLoading: tagLoading } = useQuery({
    queryKey: ["tag", id],
    queryFn: () => tagsApi.get(id).then((r) => r.data),
  });

  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ["child", tag?.child],
    queryFn: () => childrenApi.get(tag.child).then((r) => r.data),
    enabled: !!tag?.child,
  });

  const isLoading = tagLoading || childLoading;

  const contacts = child?.emergency_contacts || [];

  // ── Download as PNG ────────────────────────────────────────────────────────
  const downloadPNG = async () => {
    const el = document.getElementById("smiley-id-card");
    if (!el) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#fff" });
      const link = document.createElement("a");
      link.download = `SmileyID-${tag.tag_id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setGenerating(false);
    }
  };

  // ── Download as PDF ────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    const el = document.getElementById("smiley-id-card");
    if (!el) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: [canvas.width / 3, canvas.height / 3] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
      pdf.save(`SmileyID-${tag.tag_id}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const printCard = () => window.print();

  if (isLoading) return <PageSpinner />;
  if (!tag || !child) return (
    <div className="text-center py-12 text-gray-500">Tag or child not found.</div>
  );

  return (
    <>
      {/* Print styles — hide everything except the card */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #smiley-id-card, #smiley-id-card * { visibility: visible !important; }
          #smiley-id-card {
            position: fixed !important;
            top: 20mm !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <Link
          to={`/children/${child.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
        >
          <ArrowLeft size={15} /> Back to {child.first_name}'s profile
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ID Card</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Print, download as PNG or PDF, laminate, and attach to school bag, shoe, or clothing.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Card preview */}
          <div ref={cardRef} className="flex-shrink-0">
            <IDCard child={child} tag={tag} contacts={contacts} />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[180px]">
            <button
              onClick={downloadPNG}
              disabled={generating}
              className="btn-primary gap-2 justify-center"
            >
              <Download size={16} />
              {generating ? "Generating…" : "Download PNG"}
            </button>

            <button
              onClick={downloadPDF}
              disabled={generating}
              className="btn-secondary gap-2 justify-center"
            >
              <Download size={16} />
              {generating ? "Generating…" : "Download PDF"}
            </button>

            <button
              onClick={printCard}
              className="btn-secondary gap-2 justify-center"
            >
              <Printer size={16} /> Print
            </button>

            {tag.qr_image_url && (
              <a
                href={tag.qr_image_url}
                download={`QR-${tag.tag_id}.png`}
                className="btn-secondary gap-2 justify-center text-sm"
              >
                QR only (PNG)
              </a>
            )}

            <div className="card mt-2 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Tips</p>
              <p>• Laminate for durability</p>
              <p>• Stick inside shoe tongue</p>
              <p>• Attach to school bag strap</p>
              <p>• Sew inside clothing label</p>
              <p>• Keep in wallet / ID holder</p>
            </div>
          </div>
        </div>

        {/* Contacts preview for reference */}
        {contacts.length === 0 && (
          <div className="mt-6 card border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-700 font-medium">⚠ No emergency contacts added</p>
            <p className="text-xs text-amber-600 mt-1">
              Add emergency contacts to {child.first_name}'s profile so they appear on this card.
            </p>
            <Link to={`/children/${child.id}/edit`}
              className="btn-primary text-xs mt-3 inline-flex">
              Add Contacts
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
