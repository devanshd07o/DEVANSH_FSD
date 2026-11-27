import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/v1/student/dashboard"), api("/api/v1/student/tracks")])
      .then(([dash, trk]) => {
        setApps(dash.applications || []);
        setTracks(trk.tracks || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function startApplication(trackId) {
    setError("");
    setCreatingId(trackId);
    try {
      const res = await api("/api/v1/applications", {
        method: "POST",
        body: JSON.stringify({ trackId }),
      });
      navigate(`/student/applications/${res.application.id}/edit`);
    } catch (e) {
      setError(e.message);
      setCreatingId("");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <StudentHeader />
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Applications & Tracks</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="bg-white border border-zinc-200 rounded-md mb-8">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Start New Application</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-zinc-500">Loading tracks...</p>
        ) : tracks.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No active admission tracks available.</p>
        ) : (
          <div className="divide-y divide-zinc-200">
            {tracks.map((track) => {
              const existing = apps.find((a) => a.admissionTrackId === track.id);
              return (
                <div key={track.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {track.program?.name} ({track.program?.code})
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Track: {track.name} | {track.program?.degree} · {track.program?.department}
                    </p>
                  </div>
                  {existing ? (
                    <Link to={existing.status === "DRAFT" ? `/student/applications/${existing.id}/edit` : `/student/applications/${existing.id}`}>
                      <Button size="sm" variant="outline">Open Existing</Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      isLoading={creatingId === track.id}
                      onClick={() => startApplication(track.id)}
                    >
                      Apply Now
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-md">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Submitted & Draft Applications</h2>
        </div>
        {apps.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {apps.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3 tabular-nums font-medium text-zinc-900">
                      {app.applicationNumber || app.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{app.admissionTrack?.program?.name}</td>
                    <td className="px-4 py-3"><Badge>{app.status}</Badge></td>
                    <td className="px-4 py-3 text-zinc-500 tabular-nums">{formatDate(app.updatedAt)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {app.status === "DRAFT" && (
                        <Link to={`/student/applications/${app.id}/edit`} className="underline text-zinc-900">
                          Edit
                        </Link>
                      )}
                      {app.status === "CORRECTION_REQUIRED" && (
                        <Link to={`/student/applications/${app.id}/corrections`} className="underline text-amber-700">
                          Fix
                        </Link>
                      )}
                      <Link to={`/student/applications/${app.id}`} className="underline text-zinc-700">
                        View
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
  );
}
