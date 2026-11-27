import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge } from "../../components/UI";
import { api, formatDateTime } from "../../lib/api";

export default function AccountsPayments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/accounts/payments")
      .then((d) => setOrders(d.orders || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Fee Payments Ledger</h1>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading ledger...</p>
          ) : orders.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">No payment orders recorded for this college.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Order Ref</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">App No</th>
                    <th className="px-4 py-3">Fee Type</th>
                    <th className="px-4 py-3 text-right">Amount (INR)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-mono text-xs">{o.providerOrderId || o.id.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{o.application?.applicant?.name}</td>
                      <td className="px-4 py-3 tabular-nums">{o.application?.applicationNumber}</td>
                      <td className="px-4 py-3">{o.feeType}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{(o.amountPaise / 100).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3"><Badge variant={o.status === "PAID" ? "success" : "warning"}>{o.status}</Badge></td>
                      <td className="px-4 py-3 tabular-nums text-zinc-500">{formatDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
