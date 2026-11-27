import { useEffect, useState } from "react";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge } from "../../components/UI";
import { api, formatDateTime } from "../../lib/api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/student/notifications")
      .then((d) => setItems(d.notifications || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StudentHeader />
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Notifications</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="bg-white border border-zinc-200 rounded-md divide-y divide-zinc-200">
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Loading notifications...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No notifications yet.</p>
        ) : (
          items.map((n) => (
            <div key={n.id} className="p-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm text-zinc-900">{n.subject || n.eventType}</p>
                <p className="text-sm text-zinc-600 mt-1">{n.body}</p>
                <p className="text-xs text-zinc-400 mt-1 tabular-nums">{formatDateTime(n.createdAt)}</p>
              </div>
              <Badge variant={n.status === "SENT" ? "info" : "neutral"}>{n.channel}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
