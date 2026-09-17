import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { childrenApi } from "../../lib/api";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";
import { PageSpinner } from "../../components/ui/Spinner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const COMM_OPTIONS = [
  { value: "verbal",         label: "Verbal" },
  { value: "limited_verbal", label: "Limited Verbal" },
  { value: "non_verbal",     label: "Non-Verbal" },
];

const GENDER_OPTIONS = [
  { value: "",                label: "Prefer not to say" },
  { value: "male",            label: "Male" },
  { value: "female",          label: "Female" },
  { value: "other",           label: "Other" },
];

const RELATIONSHIP_OPTIONS = [
  "mother","father","grandparent","sibling","aunt_uncle","guardian","teacher","doctor","other"
];

const PRIVACY_FLAGS = [
  { key: "show_first_name",          label: "Show first name" },
  { key: "show_photo",               label: "Show photo" },
  { key: "show_communication",       label: "Show communication type" },
  { key: "show_allergies",           label: "Show allergies" },
  { key: "show_medical_info",        label: "Show medical info" },
  { key: "show_special_instructions",label: "Show special instructions" },
  { key: "show_preferred_language",  label: "Show preferred language" },
];

const EMPTY_CONTACT = { id: null, name: "", relationship: "mother", mobile: "", is_primary: false, order: 1 };

export default function EditChildPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: child, isLoading } = useQuery({
    queryKey: ["child", id],
    queryFn: () => childrenApi.get(id).then((r) => r.data),
  });

  const [form, setForm]       = useState(null);
  const [contacts, setContacts] = useState([]);
  const [photo, setPhoto]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState("basic"); // basic | contacts | privacy

  // Populate form when child data loads
  useEffect(() => {
    if (!child) return;
    setForm({
      first_name:           child.first_name || "",
      last_name:            child.last_name || "",
      date_of_birth:        child.date_of_birth || "",
      gender:               child.gender || "",
      communication_type:   child.communication_type || "verbal",
      allergies:            child.allergies || "",
      medical_info:         child.medical_info || "",
      special_instructions: child.special_instructions || "",
      preferred_language:   child.preferred_language || "",
      show_first_name:           child.show_first_name,
      show_photo:                child.show_photo,
      show_communication:        child.show_communication,
      show_allergies:            child.show_allergies,
      show_medical_info:         child.show_medical_info,
      show_special_instructions: child.show_special_instructions,
      show_preferred_language:   child.show_preferred_language,
    });
    setContacts(
      child.emergency_contacts?.length > 0
        ? child.emergency_contacts.map((c) => ({ ...c }))
        : [{ ...EMPTY_CONTACT, is_primary: true, order: 1 }]
    );
  }, [child]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (k) => () => setForm((p) => ({ ...p, [k]: !p[k] }));

  const setContact = (i, k) => (e) => {
    setContacts((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [k]: e.target.value };
      return next;
    });
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { ...EMPTY_CONTACT, order: prev.length + 1 },
    ]);
  };

  const removeContact = (i) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // Build FormData — send booleans as explicit "true"/"false" strings
      // so Django's BooleanField gets a proper value from multipart.
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        // Convert JS booleans to string so multipart handles them correctly
        fd.append(k, typeof v === "boolean" ? String(v) : v);
      });

      // Attach contacts as JSON blob
      const filledContacts = contacts.filter((c) => c.name.trim() && c.mobile.trim());
      fd.append("emergency_contacts", JSON.stringify(filledContacts));

      if (photo) fd.append("photo", photo);

      await childrenApi.update(id, fd);
      queryClient.invalidateQueries({ queryKey: ["child", id] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      navigate(`/children/${id}`);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join(" · ");
        setError(msgs);
      } else {
        setError("Save failed. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) return <PageSpinner />;

  const TAB_CLS = (t) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === t
        ? "bg-brand-500 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const currentPhoto = photoPreview || child?.photo;

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <Link
        to={`/children/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          {currentPhoto ? (
            <img src={currentPhoto} alt=""
              className="w-14 h-14 rounded-full object-cover border-2 border-brand-100" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl">😊</div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {child.first_name} {child.last_name}
          </h1>
          <p className="text-sm text-gray-400">{child.child_id}</p>
        </div>
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
        <button type="button" className={TAB_CLS("basic")}    onClick={() => setActiveTab("basic")}>Basic Info</button>
        <button type="button" className={TAB_CLS("contacts")} onClick={() => setActiveTab("contacts")}>Contacts</button>
        <button type="button" className={TAB_CLS("privacy")}  onClick={() => setActiveTab("privacy")}>Privacy</button>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Tab: Basic Info ────────────────────────────────────────────── */}
        {activeTab === "basic" && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-700">Basic Information</h2>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="First name *">
                  <input className="input" value={form.first_name}
                    onChange={set("first_name")} required />
                </FormField>
                <FormField label="Last name">
                  <input className="input" value={form.last_name}
                    onChange={set("last_name")} />
                </FormField>
              </div>

              <FormField label="Date of birth *">
                <input type="date" className="input" value={form.date_of_birth}
                  onChange={set("date_of_birth")} required />
              </FormField>

              <FormField label="Gender">
                <select className="input" value={form.gender} onChange={set("gender")}>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Preferred language">
                <input className="input" value={form.preferred_language}
                  onChange={set("preferred_language")} placeholder="e.g. Tamil, English" />
              </FormField>

              <FormField label="Photo">
                <input type="file" accept="image/*" className="input"
                  onChange={handlePhotoChange} />
                {currentPhoto && (
                  <img src={currentPhoto} alt="preview"
                    className="mt-2 w-20 h-20 rounded-xl object-cover border border-gray-200" />
                )}
              </FormField>
            </div>

            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-700">Communication</h2>
              {COMM_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="comm" value={o.value}
                    checked={form.communication_type === o.value}
                    onChange={set("communication_type")}
                    className="accent-brand-500" />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>

            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-700">Medical & Notes</h2>
              <FormField label="Allergies">
                <textarea className="input" rows={2} value={form.allergies}
                  onChange={set("allergies")} placeholder="e.g. peanuts, dairy" />
              </FormField>
              <FormField label="Medical information">
                <textarea className="input" rows={2} value={form.medical_info}
                  onChange={set("medical_info")} />
              </FormField>
              <FormField label="Special instructions">
                <textarea className="input" rows={2} value={form.special_instructions}
                  onChange={set("special_instructions")}
                  placeholder="Instructions for the person who finds the child" />
              </FormField>
            </div>
          </div>
        )}

        {/* ── Tab: Contacts ──────────────────────────────────────────────── */}
        {activeTab === "contacts" && (
          <div className="space-y-3">
            {contacts.map((c, i) => (
              <div key={i} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Contact {i + 1} {i === 0 && "· Primary"}
                  </p>
                  {contacts.length > 1 && (
                    <button type="button" onClick={() => removeContact(i)}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <FormField label="Name">
                  <input className="input" value={c.name}
                    onChange={setContact(i, "name")} placeholder="Full name" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Relationship">
                    <select className="input" value={c.relationship}
                      onChange={setContact(i, "relationship")}>
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " / ").replace(/\b\w/g, ch => ch.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Mobile">
                    <input className="input" value={c.mobile}
                      onChange={setContact(i, "mobile")} placeholder="+91 …" />
                  </FormField>
                </div>
              </div>
            ))}

            {contacts.length < 3 && (
              <button type="button" onClick={addContact}
                className="btn-secondary w-full gap-1">
                <Plus size={15} /> Add Contact
              </button>
            )}
          </div>
        )}

        {/* ── Tab: Privacy ───────────────────────────────────────────────── */}
        {activeTab === "privacy" && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-700">Public Emergency Page</h2>
            <p className="text-xs text-gray-500">
              Choose what someone sees when they scan the QR code. Only checked fields are shown.
            </p>
            <div className="divide-y divide-gray-50">
              {PRIVACY_FLAGS.map(({ key, label }) => (
                <label key={key}
                  className="flex items-center justify-between py-2.5 cursor-pointer group">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                  <div className="relative">
                    <input type="checkbox" checked={!!form[key]} onChange={toggle(key)}
                      className="sr-only" />
                    <div onClick={toggle(key)}
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${
                        form[key] ? "bg-brand-500" : "bg-gray-200"
                      }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${
                        form[key] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-3 mt-5 pb-8">
          <Link to={`/children/${id}`} className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
