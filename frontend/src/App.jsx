import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Parent portal pages
import DashboardPage from "./pages/portal/DashboardPage";
import ChildDetailPage from "./pages/portal/ChildDetailPage";
import AddChildPage from "./pages/portal/AddChildPage";
import EditChildPage from "./pages/portal/EditChildPage";
import TagsPage from "./pages/portal/TagsPage";
import RequestTagPage from "./pages/portal/RequestTagPage";
import TagCardPage from "./pages/portal/TagCardPage";
import ProfilePage from "./pages/portal/ProfilePage";
import OrdersPage from "./pages/portal/OrdersPage";

// Public
import EmergencyPage from "./pages/public/EmergencyPage";

// Admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminParentsPage   from "./pages/admin/AdminParentsPage";
import AdminChildrenPage  from "./pages/admin/AdminChildrenPage";
import AdminTagsPage      from "./pages/admin/AdminTagsPage";
import AdminOrdersPage    from "./pages/admin/AdminOrdersPage";
import AdminScansPage     from "./pages/admin/AdminScansPage";

// Layouts
import PortalLayout from "./layouts/PortalLayout";
import AdminLayout  from "./layouts/AdminLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,          // always refetch when component mounts
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  // While loading OR while we have a token but user hasn't populated yet
  // (the 1-render gap after login before setUser commits), show a spinner
  // instead of bouncing to /login.
  const hasToken = !!localStorage.getItem("access_token");
  if (loading || (hasToken && !user)) {
    return <div className="flex h-screen items-center justify-center text-brand-500 text-lg">Loading…</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem("access_token");
  if (loading || (hasToken && !user)) {
    return <div className="flex h-screen items-center justify-center text-brand-500 text-lg">Loading…</div>;
  }
  return user?.is_staff ? children : <Navigate to="/dashboard" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem("access_token");
  if (loading || (hasToken && !user)) return null;
  return !user ? children : <Navigate to={user.is_staff ? "/admin" : "/dashboard"} replace />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem("access_token");
  if (loading || (hasToken && !user)) {
    return <div className="flex h-screen items-center justify-center text-brand-500 text-lg">Loading…</div>;
  }
  return <Navigate to={user?.is_staff ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public — no auth */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/e/:childId" element={<EmergencyPage />} />

            {/* Guest only */}
            <Route path="/login"      element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register"   element={<GuestRoute><RegisterPage /></GuestRoute>} />

            {/* Protected parent portal */}
            <Route element={<PrivateRoute><PortalLayout /></PrivateRoute>}>
              <Route path="/dashboard"          element={<DashboardPage />} />
              <Route path="/children/add"       element={<AddChildPage />} />
              <Route path="/children/:id"       element={<ChildDetailPage />} />
              <Route path="/children/:id/edit"  element={<EditChildPage />} />
              <Route path="/tags"               element={<TagsPage />} />
              <Route path="/tags/request"       element={<RequestTagPage />} />
              <Route path="/tags/:id/card"      element={<TagCardPage />} />
              <Route path="/orders"             element={<OrdersPage />} />
              <Route path="/profile"            element={<ProfilePage />} />
            </Route>

            {/* Admin portal — staff only, own layout with sidebar */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/admin"          element={<AdminDashboardPage />} />
              <Route path="/admin/parents"  element={<AdminParentsPage />} />
              <Route path="/admin/children" element={<AdminChildrenPage />} />
              <Route path="/admin/tags"     element={<AdminTagsPage />} />
              <Route path="/admin/orders"   element={<AdminOrdersPage />} />
              <Route path="/admin/scans"    element={<AdminScansPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
