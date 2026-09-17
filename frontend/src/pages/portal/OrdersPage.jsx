import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { PageSpinner } from "../../components/ui/Spinner";

const STATUS_BADGE = {
  pending: "badge-pending",
  processing: "badge-pending",
  shipped: "badge-active",
  delivered: "badge-active",
  cancelled: "badge-inactive",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => ordersApi.list().then((r) => r.data.results ?? r.data),
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-5">Orders</h1>

      {isLoading && <PageSpinner />}

      {!isLoading && !orders?.length && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium text-gray-700">No orders yet</p>
          <p className="text-sm text-gray-500 mt-1">Orders appear when you request a physical tag with shipping.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders?.map((order) => (
          <div key={order.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold font-mono text-sm">{order.order_number}</p>
                <p className="text-sm text-gray-600 mt-0.5">{order.child_name} — {order.tag_type.replace(/_/g, " ")}</p>
                {order.city && (
                  <p className="text-xs text-gray-400 mt-1">
                    {order.address_line1}, {order.city}, {order.state} {order.pincode}
                  </p>
                )}
              </div>
              <span className={STATUS_BADGE[order.status] || "badge-inactive capitalize"}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Ordered {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
