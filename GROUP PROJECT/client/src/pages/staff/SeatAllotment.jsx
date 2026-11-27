import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge, Button, SelectField } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function SeatAllotment() {
  const [rounds, setRounds] = useState([]);
  const [roundId, setRoundId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function loadRounds() {
    api("/api/v1/admissions/rounds")
      .then((d) => {
        const list = d.rounds || [];
        setRounds(list);
        if (!roundId && list[0]?.id) setRoundId(list[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRounds(); }, []);

  const round = rounds.find((r) => r.id === roundId) || rounds[0];
  const latestAlloc = round?.allocationRuns?.[0];

  async function previewAllocation() {
    if (!round) return;
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await api("/api/v1/admissions/allocations/preview", { method: "POST", body: JSON.stringify({ roundId: round.id }) });
      setMsg("Allocation preview created.");
      loadRounds();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function publishAllocation() {
    if (!latestAlloc) return;
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await api("/api/v1/admissions/allocations/publish", { method: "POST", body: JSON.stringify({ allocationId: latestAlloc.id }) });
      setMsg("Seat offers published to students.");
      loadRounds();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Seat Allotment Rounds</h1>
            <p className="text-sm text-zinc-500 mt-1">Run category-wise seat allocation from published merit lists.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {rounds.length > 0 && (
              <SelectField value={round?.id || ""} onChange={(e) => setRoundId(e.target.value)} className="min-w-[200px]">
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.admissionTrack?.program?.code} - Round {r.roundNumber}
                  </option>
                ))}
              </SelectField>
            )}
            <Button isLoading={busy} onClick={previewAllocation} disabled={!round}>Preview Allocation</Button>
            {latestAlloc?.status === "PREVIEW" && (
              <Button variant="secondary" isLoading={busy} onClick={publishAllocation}>Publish Offers</Button>
            )}
          </div>
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading allotment rounds...</p>
          ) : !latestAlloc?.offers?.length ? (
            <p className="p-6 text-sm text-zinc-500">No seat offers generated for this round yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
                <span>Allocation Status: <Badge variant={latestAlloc.status === "PUBLISHED" ? "success" : "warning"}>{latestAlloc.status}</Badge></span>
                <span className="tabular-nums">{latestAlloc.offers.length} offers</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">App No</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Accept By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {latestAlloc.offers.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 tabular-nums font-medium">{o.application?.applicationNumber}</td>
                      <td className="px-4 py-3">{o.application?.applicant?.name}</td>
                      <td className="px-4 py-3">{o.programName}</td>
                      <td className="px-4 py-3">{o.categoryCode}</td>
                      <td className="px-4 py-3"><Badge>{o.status}</Badge></td>
                      <td className="px-4 py-3 tabular-nums text-zinc-500">{formatDate(o.acceptBy)}</td>
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
