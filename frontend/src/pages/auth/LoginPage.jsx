import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.is_staff ? "/admin" : "/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">😊</div>
          <h1 className="text-2xl font-bold text-gray-900">SmileyID</h1>
          <p className="text-gray-500 text-sm mt-1">Child safety identification</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-5">Sign in to your account</h2>

          {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email address">
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password">
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                required
                autoComplete="current-password"
              />
            </FormField>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            No account?{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
