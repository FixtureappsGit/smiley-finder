import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../lib/api";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({ full_name: "", mobile: "" });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Populate form once user is available (handles the login race condition)
  useEffect(() => {
    if (user) {
      setForm({ full_name: user.full_name || "", mobile: user.mobile || "" });
    }
  }, [user]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setPw = (k) => (e) => setPwForm((p) => ({ ...p, [k]: e.target.value }));

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    setProfileLoading(true);
    try {
      const { data } = await authApi.updateProfile(form);
      updateUser(data);
      setProfileMsg({ type: "success", text: "Profile updated." });
    } catch {
      setProfileMsg({ type: "error", text: "Update failed. Please try again." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    setPwLoading(true);
    try {
      await authApi.changePassword(pwForm);
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setPwForm({ old_password: "", new_password: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.old_password?.[0] || "Failed to change password." });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-5">My Profile</h1>

      {/* Account info */}
      <div className="card mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-2xl">👤</div>
          <div>
            <p className="font-semibold">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <span className={`flex items-center gap-1 ${user?.is_email_verified ? "text-green-600" : "text-gray-400"}`}>
            {user?.is_email_verified ? "✅" : "⭕"} Email {user?.is_email_verified ? "verified" : "not verified"}
          </span>
          <span className={`flex items-center gap-1 ${user?.is_mobile_verified ? "text-green-600" : "text-gray-400"}`}>
            {user?.is_mobile_verified ? "✅" : "⭕"} Mobile {user?.is_mobile_verified ? "verified" : "not verified"}
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card mb-5">
        <h2 className="font-semibold text-gray-700 mb-4">Edit Profile</h2>
        {profileMsg.text && <div className="mb-3"><Alert type={profileMsg.type}>{profileMsg.text}</Alert></div>}
        <form onSubmit={handleProfile} className="space-y-4">
          <FormField label="Full name">
            <input className="input" value={form.full_name} onChange={set("full_name")} required />
          </FormField>
          <FormField label="Mobile number">
            <input className="input" value={form.mobile} onChange={set("mobile")} required />
          </FormField>
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Change Password</h2>
        {pwMsg.text && <div className="mb-3"><Alert type={pwMsg.type}>{pwMsg.text}</Alert></div>}
        <form onSubmit={handlePassword} className="space-y-4">
          <FormField label="Current password">
            <input type="password" className="input" value={pwForm.old_password}
              onChange={setPw("old_password")} required autoComplete="current-password" />
          </FormField>
          <FormField label="New password" hint="Minimum 8 characters">
            <input type="password" className="input" value={pwForm.new_password}
              onChange={setPw("new_password")} required autoComplete="new-password" minLength={8} />
          </FormField>
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
