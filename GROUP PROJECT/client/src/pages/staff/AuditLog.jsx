import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert } from "../../components/UI";
import { api, formatDateTime } from "../../lib/api";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admin/audit")
      .then((d) => setLogs(d.auditLogs || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Audit Log</h1>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading audit log...</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">No audit entries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 tabular-nums text-zinc-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                      <td className="px-4 py-3">{log.actor?.name || log.actor?.email || "System"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{log.entityType || "-"} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}</td>
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
