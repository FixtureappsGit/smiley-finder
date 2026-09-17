import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, Baby, Tag, ShoppingBag,
  ScanLine, LogOut, Menu, X, ExternalLink,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/admin",          label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { to: "/admin/parents",  label: "Parents",       icon: Users },
  { to: "/admin/children", label: "Children",      icon: Baby },
  { to: "/admin/tags",     label: "Tags",          icon: Tag },
  { to: "/admin/orders",   label: "Orders",        icon: ShoppingBag },
  { to: "/admin/scans",    label: "Scan Logs",     icon: ScanLine },
];

function NavItem({ to, label, icon: Icon, exact, onClick }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-brand-500 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`${
        mobile
          ? "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 shadow-xl transform transition-transform"
          : "hidden md:flex md:flex-col w-60 bg-white border-r border-gray-100"
      } flex flex-col`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100 flex-shrink-0">
        <span className="text-2xl">😊</span>
        <div>
          <p className="font-bold text-gray-900 leading-none text-sm">SmileyID</p>
          <p className="text-xs text-brand-500 font-medium">Admin Portal</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <a
          href="http://localhost:8000/django-admin/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <ExternalLink size={17} />
          Django Admin
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile />
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 md:flex-none" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{user?.full_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
