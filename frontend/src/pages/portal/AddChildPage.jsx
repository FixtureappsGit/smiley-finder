import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { childrenApi } from "../../lib/api";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";
import { ArrowLeft } from "lucide-react";

const COMM_OPTIONS = [
  { value: "verbal", label: "Verbal" },
  { value: "limited_verbal", label: "Limited Verbal" },
  { value: "non_verbal", label: "Non-Verbal" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function AddChildPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", gender: "",
    communication_type: "verbal", allergies: "", medical_info: "",
    special_instructions: "", preferred_language: "",
  });
  const [photo, setPhoto] = useState(null);
  const [contacts, setContacts] = useState([
    { name: "", relationship: "mother", mobile: "", is_primary: true, order: 1 },
    { name: "", relationship: "father", mobile: "", is_primary: false, order: 2 },
  ]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setContact = (i, k) => (e) => {
    const next = [...contacts];
    next[i] = { ...next[i], [k]: e.target.value };
    setContacts(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setFieldErrors({});
    setLoading(true);

    try {
      const fd = new FormData();
      // Include all fields — skip only null/undefined, not false or empty strings
      // (booleans like show_* must be sent explicitly)
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      if (photo) fd.append("photo", photo);

      const filledContacts = contacts.filter((c) => c.name && c.mobile);
      if (filledContacts.length > 0) {
        fd.append("emergency_contacts", JSON.stringify(filledContacts));
      }

      await childrenApi.create(fd);
      queryClient.invalidateQueries(["children"]);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        setFieldErrors(data);
        setError("Please fix the errors below.");
      } else {
        setError("Failed to add child. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Add Child</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Basic Information</h2>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name *" error={fieldErrors.first_name?.[0]}>
              <input className="input" value={form.first_name} onChange={set("first_name")} required />
            </FormField>
            <FormField label="Last name" error={fieldErrors.last_name?.[0]}>
              <input className="input" value={form.last_name} onChange={set("last_name")} />
            </FormField>
          </div>

          <FormField label="Date of birth *" error={fieldErrors.date_of_birth?.[0]}>
            <input type="date" className="input" value={form.date_of_birth} onChange={set("date_of_birth")} required />
          </FormField>

          <FormField label="Gender">
            <select className="input" value={form.gender} onChange={set("gender")}>
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>

          <FormField label="Photo (optional)">
            <input type="file" accept="image/*" className="input" onChange={(e) => setPhoto(e.target.files[0])} />
          </FormField>
        </div>

        {/* Communication */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-700">Communication</h2>
          <div className="space-y-2">
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
        </div>

        {/* Emergency contacts */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Emergency Contacts</h2>
          {contacts.map((c, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Contact {i + 1} {i === 0 && "(Primary)"}</p>
              <FormField label="Name">
                <input className="input" value={c.name} onChange={setContact(i, "name")} placeholder="Full name" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Relationship">
                  <select className="input" value={c.relationship} onChange={setContact(i, "relationship")}>
                    {["mother","father","grandparent","sibling","aunt_uncle","guardian","teacher","other"]
                      .map((r) => <option key={r} value={r}>{r.replace("_", " / ")}</option>)}
                  </select>
                </FormField>
                <FormField label="Mobile">
                  <input className="input" value={c.mobile} onChange={setContact(i, "mobile")} placeholder="+91 ..." />
                </FormField>
              </div>
            </div>
          ))}
        </div>

        {/* Optional info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Optional Information</h2>
          <FormField label="Allergies">
            <textarea className="input" rows={2} value={form.allergies} onChange={set("allergies")}
              placeholder="e.g. peanuts, dairy" />
          </FormField>
          <FormField label="Medical information">
            <textarea className="input" rows={2} value={form.medical_info} onChange={set("medical_info")}
              placeholder="Any relevant medical notes" />
          </FormField>
          <FormField label="Special instructions">
            <textarea className="input" rows={2} value={form.special_instructions} onChange={set("special_instructions")}
              placeholder="Instructions for the person who finds the child" />
          </FormField>
          <FormField label="Preferred language">
            <input className="input" value={form.preferred_language} onChange={set("preferred_language")}
              placeholder="e.g. Tamil, English" />
          </FormField>
        </div>

        <div className="flex gap-3 pb-6">
          <Link to="/dashboard" className="btn-secondary flex-1 justify-center">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Saving…" : "Add Child"}
          </button>
        </div>
      </form>
    </div>
  );
}
