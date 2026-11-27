import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function ScrutinyQueue() {
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/scrutiny/queue")
      .then((d) => setApps(d.applications || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = apps.filter((a) => {
    if (filter === "PENDING") return ["SUBMITTED", "RESUBMITTED"].includes(a.status);
    if (filter === "REVIEW") return a.status === "UNDER_REVIEW";
    if (filter === "VERIFIED") return a.status === "VERIFIED";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Document Scrutiny Queue</h1>
          <div className="flex gap-2 flex-wrap">
            {[["ALL", "All"], ["PENDING", "Pending"], ["REVIEW", "Under Review"], ["VERIFIED", "Verified"]].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 text-xs rounded border ${filter === k ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-600 border-zinc-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading scrutiny queue...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">No applications in this queue view.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">App No</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filtered.map((app) => (
                    <tr key={app.id}>
                      <td className="px-4 py-3 tabular-nums font-medium">{app.applicationNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{app.applicant?.name}</p>
                        <p className="text-xs text-zinc-500">{app.applicant?.email}</p>
                      </td>
                      <td className="px-4 py-3">{app.admissionTrack?.program?.code}</td>
                      <td className="px-4 py-3"><Badge>{app.status}</Badge></td>
                      <td className="px-4 py-3 tabular-nums text-zinc-500">{formatDate(app.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/scrutiny/${app.id}`}>
                          <Button size="sm" variant="outline">Review</Button>
                        </Link>
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
