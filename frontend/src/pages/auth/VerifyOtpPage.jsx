import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const email = location.state?.email || "";
  const otp_type = location.state?.otp_type || "email";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    if (!email) navigate("/register");
  }, [email, navigate]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      refs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("Please enter the 6-digit OTP."); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({ email, code, otp_type });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.code?.[0] || err.response?.data?.detail || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError(""); setSuccess("");
    try {
      await authApi.resendOtp({ email, otp_type });
      setSuccess("A new OTP has been sent.");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } catch {
      setError("Could not resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📬</div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <div className="card">
          {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
          {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (refs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              ))}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-4">
            Didn't receive it?{" "}
            <button onClick={handleResend} disabled={resending}
              className="text-brand-600 font-medium hover:underline disabled:opacity-50">
              {resending ? "Sending…" : "Resend OTP"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
