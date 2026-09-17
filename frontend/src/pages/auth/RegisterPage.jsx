import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    full_name: "", email: "", mobile: "", password: "", password2: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Name is required.";
    if (!form.email.trim())     errs.email = "Email is required.";
    if (!form.mobile.trim())    errs.mobile = "Mobile number is required.";
    if (form.password.length < 8) errs.password = "Minimum 8 characters.";
    if (form.password !== form.password2) errs.password2 = "Passwords do not match.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      // Backend now returns tokens directly — store and redirect
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      updateUser(data.user);
      navigate(data.user.is_staff ? "/admin" : "/dashboard");
    } catch (err) {
      const data = err.response?.data || {};
      if (typeof data === "object" && !data.detail) {
        setErrors(data);
      } else {
        setApiError(data.detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">😊</div>
          <h1 className="text-2xl font-bold text-gray-900">SmileyID</h1>
          <p className="text-gray-500 text-sm mt-1">Create a parent account</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-5">Register</h2>

          {apiError && <div className="mb-4"><Alert type="error">{apiError}</Alert></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full name" error={errors.full_name}>
              <input type="text" className="input" placeholder="Full Name"
                value={form.full_name} onChange={set("full_name")} required />
            </FormField>

            <FormField label="Email address" error={errors.email}>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={set("email")} required autoComplete="email" />
            </FormField>

            <FormField label="Mobile number" error={errors.mobile}>
              <input type="tel" className="input" placeholder="+91 XXXXX XXXXX"
                value={form.mobile} onChange={set("mobile")} required />
            </FormField>

            <FormField label="Password" error={errors.password}>
              <input type="password" className="input" placeholder="Min. 8 characters"
                value={form.password} onChange={set("password")} required autoComplete="new-password" />
            </FormField>

            <FormField label="Confirm password" error={errors.password2}>
              <input type="password" className="input" placeholder="Repeat password"
                value={form.password2} onChange={set("password2")} required autoComplete="new-password" />
            </FormField>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
