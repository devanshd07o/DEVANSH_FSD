import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert } from "../../components/UI";
import { api } from "../../lib/api";

export default function Overview({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admissions/overview")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const m = data?.metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">College Admissions Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">{user?.institutionName}</p>
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        {m && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {[
              ["Applications", m.totalApps],
              ["Verified", m.verifiedApps],
              ["Open Defects", m.openDefects],
              ["Offers Issued", m.totalOffers],
              ["Enrolled", m.totalEnrolled],
            ].map(([label, val]) => (
              <div key={label} className="bg-white border border-zinc-200 rounded-md p-4">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200">
            <h2 className="text-sm font-semibold text-zinc-900">Participating Programs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Degree</th>
                  <th className="px-4 py-3 text-right">Intake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(data?.programs || []).map((p) => {
                  const totalIntake = (p.seatPools || []).reduce((sum, pool) => sum + pool.capacity, 0);
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{p.degree}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{totalIntake}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
