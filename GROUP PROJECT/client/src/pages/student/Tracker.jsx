import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

const STAGES = [
  "Draft Created",
  "Application Submitted",
  "Faculty Scrutiny",
  "Verified & Merit Eligible",
  "Seat Allotted",
  "Enrolled",
];

function getStageIndex(app) {
  if (!app) return 0;
  if (app.enrollment || app.status === "ENROLLED") return 5;
  if (app.offers?.length > 0 || app.status === "ALLOTTED") return 4;
  if (app.status === "VERIFIED") return 3;
  if (["UNDER_REVIEW", "CORRECTION_REQUIRED"].includes(app.status)) return 2;
  if (["SUBMITTED", "RESUBMITTED"].includes(app.status)) return 1;
  return 0;
}

export default function Tracker() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/v1/applications/${id}`)
      .then((d) => setApp(d.application))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const stageIndex = getStageIndex(app);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StudentHeader />
      <div className="mb-4">
        <Link to="/student/applications" className="text-sm text-zinc-600 hover:text-zinc-900 underline">
          Back to Applications
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <p className="text-sm text-zinc-500">Loading tracker...</p>}

      {app && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">
                {app.admissionTrack?.program?.name}
              </h1>
              <p className="text-sm text-zinc-500 mt-1 tabular-nums">
                App #{app.applicationNumber || app.id.slice(0, 8)} | {app.admissionTrack?.name} | Updated {formatDate(app.updatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={app.status === "CORRECTION_REQUIRED" ? "danger" : app.status === "VERIFIED" || app.status === "ENROLLED" ? "success" : "info"}>
                {app.status}
              </Badge>
              {app.status === "DRAFT" && (
                <Link to={`/student/applications/${app.id}/edit`}>
                  <Button size="sm">Continue Form</Button>
                </Link>
              )}
              {app.status === "CORRECTION_REQUIRED" && (
                <Link to={`/student/applications/${app.id}/corrections`}>
                  <Button size="sm">Fix Defects</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Admission Progress</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {STAGES.map((label, idx) => {
                const done = idx <= stageIndex;
                return (
                  <div
                    key={label}
                    className={`p-3 border rounded-md ${done ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white opacity-60"}`}
                  >
                    <p className="text-xs font-mono text-zinc-500">Step {idx + 1}</p>
                    <p className="text-sm font-medium text-zinc-900 mt-1">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {app.defects?.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-md p-6">
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Scrutiny Defects</h2>
              <div className="space-y-2">
                {app.defects.map((d) => (
                  <div key={d.id} className="p-3 border border-zinc-200 rounded text-sm flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900">{d.reasonCode}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">{d.studentComment}</p>
                    </div>
                    <Badge variant={d.status === "FIXED" || d.status === "WAIVED" ? "success" : "danger"}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-md p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Uploaded Documents</h2>
            {app.documents?.length ? (
              <div className="divide-y divide-zinc-200">
                {app.documents.map((doc) => {
                  const docType = app.admissionTrack?.requiredDocs?.find((r) => r.id === doc.documentTypeId);
                  return (
                    <div key={doc.id} className="py-2.5 flex items-center justify-between text-sm">
                      <span className="text-zinc-800">{docType?.label || "Document"} ({doc.originalName})</span>
                      <a
                        href={`/api/v1/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-zinc-700"
                      >
                        View PDF
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No documents uploaded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
