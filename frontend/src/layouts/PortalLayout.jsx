import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, Tag, ShoppingBag, User, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tags", label: "Tags", icon: Tag },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: User },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2 font-bold text-brand-500 text-lg">
            😊 SmileyID
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-gray-500">
              {user?.full_name?.split(" ")[0]}
            </span>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-danger-500 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
            {/* Mobile hamburger */}
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium mt-1 ${
                    isActive ? "bg-brand-50 text-brand-600" : "text-gray-700"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-danger-500 mt-1 w-full"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
