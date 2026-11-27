import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDateTime } from "../../lib/api";

export default function Payments() {
  const [params] = useSearchParams();
  const offerId = params.get("offerId") || "";
  const [orders, setOrders] = useState([]);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function loadPayments() {
    api(`/api/v1/student/payments${offerId ? `?offerId=${offerId}` : ""}`)
      .then((d) => {
        setOrders(d.orders || []);
        setPendingOffer(d.pendingOffer || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPayments(); }, [offerId]);

  async function handlePay() {
    if (!pendingOffer) return;
    setError("");
    setMsg("");
    setPaying(true);
    try {
      const created = await api("/api/v1/payments/orders", {
        method: "POST",
        body: JSON.stringify({ applicationId: pendingOffer.applicationId, feeType: "ADMISSION_FEE", offerId: pendingOffer.id }),
      });
      await api("/api/v1/payments/confirm", {
        method: "POST",
        body: JSON.stringify({ orderId: created.order.id }),
      });
      setMsg("Fee payment completed.");
      loadPayments();
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  }

  const paidOrder = orders.find((o) => o.status === "PAID");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StudentHeader />
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Fee Payments</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

      {pendingOffer && !paidOrder && (
        <div className="bg-white border border-zinc-200 rounded-md p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-zinc-900">Admission Seat Confirmation Fee Due</p>
            <p className="text-sm text-zinc-600 mt-1">Pay online to unlock final Registrar enrollment.</p>
          </div>
          <Button isLoading={paying} onClick={handlePay}>Pay Admission Fee</Button>
        </div>
      )}

      {paidOrder && (
        <div className="mb-6">
          <Alert type="success">
            <div className="flex items-center justify-between gap-4">
              <span>Payment received. Check Admission Letter once Registrar issues enrollment.</span>
              <Link to="/student/admission" className="underline font-medium">Admission Letter</Link>
            </div>
          </Alert>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Transaction History</h2>
          {orders.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print Receipt</Button>
          )}
        </div>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Loading transactions...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No fee orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Order Ref</th>
                  <th className="px-4 py-3">Fee Type</th>
                  <th className="px-4 py-3">Amount (INR)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs">{o.providerOrderId || o.id.slice(0, 10)}</td>
                    <td className="px-4 py-3">{o.feeType}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{(o.amountPaise / 100).toLocaleString("en-IN")}</td>
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
  );
}
