import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function Enrollments() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function loadOffers() {
    api("/api/v1/accounts/enrollments")
      .then((d) => setOffers(d.offers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOffers(); }, []);

  async function issue(offerId) {
    setError("");
    setMsg("");
    setBusyId(offerId);
    try {
      const res = await api("/api/v1/registrar/enrollments", { method: "POST", body: JSON.stringify({ offerId }) });
      setMsg(`Enrollment issued: ${res.enrollment?.enrollmentNumber}`);
      loadOffers();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Registrar Enrollments</h1>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading confirmed seats...</p>
          ) : offers.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">No fee-confirmed offers ready for enrollment yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">App No</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Enrollment</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {offers.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 tabular-nums">{o.application?.applicationNumber}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{o.application?.applicant?.name}</td>
                      <td className="px-4 py-3">{o.programName}</td>
                      <td className="px-4 py-3">{o.categoryCode}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {o.enrollment ? (
                          <Badge variant="success">{o.enrollment.enrollmentNumber} ({formatDate(o.enrollment.enrolledAt)})</Badge>
                        ) : (
                          <Badge variant="warning">Pending Issue</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!o.enrollment && (
                          <Button size="sm" isLoading={busyId === o.id} onClick={() => issue(o.id)}>
                            Issue Enrollment
                          </Button>
                        )}
                      </td>
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
