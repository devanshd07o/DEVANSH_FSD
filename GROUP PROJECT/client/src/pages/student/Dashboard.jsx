import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

const statusVariant = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  RESUBMITTED: "info",
  UNDER_REVIEW: "warning",
  CORRECTION_REQUIRED: "danger",
  VERIFIED: "success",
  ALLOTTED: "success",
  ENROLLED: "success",
  REJECTED: "danger",
};

export default function Dashboard({ user }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/student/dashboard")
      .then((d) => setApps(d.applications || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const defectApp = apps.find((a) => a.status === "CORRECTION_REQUIRED");
  const offeredApp = apps.find((a) => a.offers?.some((o) => o.status === "OFFERED"));
  const enrolledApp = apps.find((a) => a.enrollment);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <StudentHeader />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Welcome, {user?.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">{user?.institutionName || "Student Portal"}</p>
        </div>
        <Link to="/student/applications">
          <Button>New Application</Button>
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="space-y-3 mb-6">
        {defectApp && (
          <Alert type="warning">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Action needed: Correction raised on #{defectApp.applicationNumber || defectApp.id.slice(0, 8)}.</span>
              <Link to={`/student/applications/${defectApp.id}/corrections`} className="underline font-medium">
                Fix Defects
              </Link>
            </div>
          </Alert>
        )}
        {offeredApp && (
          <Alert type="success">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Seat offered for {offeredApp.admissionTrack?.program?.name}.</span>
              <Link to="/student/offers" className="underline font-medium">
                View Seat Offer
              </Link>
            </div>
          </Alert>
        )}
        {enrolledApp && (
          <Alert type="success">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Admission confirmed. Enrollment No: {enrolledApp.enrollment.enrollmentNumber}</span>
              <Link to="/student/admission" className="underline font-medium">
                Admission Letter
              </Link>
            </div>
          </Alert>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">My Applications</h2>
          <span className="text-xs text-zinc-500 tabular-nums">{apps.length} total</span>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Loading applications...</p>
        ) : apps.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-500 mb-4">No applications started yet.</p>
            <Link to="/student/applications">
              <Button variant="outline">Browse Admission Tracks</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {apps.map((app) => (
              <div key={app.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-medium text-zinc-900">
                      {app.admissionTrack?.program?.name}
                    </span>
                    <Badge variant={statusVariant[app.status] || "neutral"}>{app.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                    {app.admissionTrack?.name} | App #{app.applicationNumber || app.id.slice(0, 8)} | Updated {formatDate(app.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {app.status === "DRAFT" && (
                    <Link to={`/student/applications/${app.id}/edit`}>
                      <Button size="sm">Continue Draft</Button>
                    </Link>
                  )}
                  {app.status === "CORRECTION_REQUIRED" && (
                    <Link to={`/student/applications/${app.id}/corrections`}>
                      <Button size="sm">Fix Defects</Button>
                    </Link>
                  )}
                  <Link to={`/student/applications/${app.id}`}>
                    <Button size="sm" variant="outline">Track</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
