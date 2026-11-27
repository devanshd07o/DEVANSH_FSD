import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert } from "../../components/UI";
import { api } from "../../lib/api";

export default function SeatMatrix() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admissions/seat-matrix")
      .then((d) => setPrograms(d.programs || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Category Seat Matrix</h1>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {loading && <p className="text-sm text-zinc-500">Loading seat pools...</p>}

        <div className="space-y-6">
          {programs.map((prog) => {
            const totalIntake = (prog.seatPools || []).reduce((sum, s) => sum + s.capacity, 0);
            return (
              <div key={prog.id} className="bg-white border border-zinc-200 rounded-md overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900">{prog.name} ({prog.code})</h2>
                  <span className="text-xs text-zinc-500 tabular-nums">Total Intake: {totalIntake}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Quota %</th>
                        <th className="px-4 py-3 text-right">Capacity</th>
                        <th className="px-4 py-3 text-right">Filled / Held</th>
                        <th className="px-4 py-3 text-right">Vacant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(prog.seatPools || []).map((pool) => {
                        const used = pool.confirmedCount + pool.heldCount;
                        return (
                          <tr key={pool.id}>
                            <td className="px-4 py-3 font-medium">{pool.category?.code}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{pool.category?.percentage}%</td>
                            <td className="px-4 py-3 text-right tabular-nums">{pool.capacity}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{used}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {Math.max(0, pool.capacity - used)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
