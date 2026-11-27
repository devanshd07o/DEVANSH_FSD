import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge, Button, SelectField } from "../../components/UI";
import { api } from "../../lib/api";

export default function ScrutinyDesk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [activeDocId, setActiveDocId] = useState("");
  const [notes, setNotes] = useState("");
  const [showDefect, setShowDefect] = useState(false);
  const [reasonCode, setReasonCode] = useState("BLURRED_DOCUMENT");
  const [defectComment, setDefectComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function loadApp() {
    api(`/api/v1/applications/${id}`)
      .then(({ application }) => {
        setApp(application);
        if (!activeDocId && application.documents?.[0]?.id) {
          setActiveDocId(application.documents[0].id);
        }
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => { loadApp(); }, [id]);

  async function claim() {
    setError("");
    setBusy(true);
    try {
      await api(`/api/v1/scrutiny/${id}/claim`, { method: "POST" });
      loadApp();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setError("");
    setBusy(true);
    try {
      await api(`/api/v1/scrutiny/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ reviewerNotes: notes || "Documents verified" }),
      });
      navigate("/scrutiny/queue");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function raiseDefect(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/api/v1/scrutiny/${id}/defects`, {
        method: "POST",
        body: JSON.stringify({
          reviewerNotes: notes || "Correction requested",
          defects: [{
            documentId: activeDocId || undefined,
            fieldPath: "documents",
            reasonCode,
            studentComment: defectComment,
            dueDays: 3,
          }],
        }),
      });
      navigate("/scrutiny/queue");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const rev = app?.revisions?.[0];
  const needsClaim = app && ["SUBMITTED", "RESUBMITTED", "CORRECTION_REQUIRED"].includes(app.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <Link to="/scrutiny/queue" className="text-xs underline text-zinc-500">Back to Queue</Link>
            <h1 className="text-xl font-semibold text-zinc-900 mt-1">
              {app ? `${app.applicant?.name} (${app.applicationNumber})` : "Scrutiny Desk"}
            </h1>
          </div>
          {app && <Badge>{app.status}</Badge>}
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        {app && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-md p-4">
              <div className="flex gap-2 flex-wrap mb-3">
                {(app.documents || []).map((doc) => {
                  const label = app.admissionTrack?.requiredDocs?.find((r) => r.id === doc.documentTypeId)?.label || doc.originalName;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveDocId(doc.id)}
                      className={`px-2.5 py-1 text-xs rounded border ${activeDocId === doc.id ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-700 border-zinc-200"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {activeDocId ? (
                <iframe
                  src={`/api/v1/documents/${activeDocId}/download`}
                  title="Document Preview"
                  className="w-full h-[480px] border border-zinc-200 rounded bg-zinc-50"
                />
              ) : (
                <p className="text-sm text-zinc-500 py-12 text-center">No uploaded documents.</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 rounded-md p-5 text-sm space-y-2">
                <h2 className="font-semibold text-zinc-900 mb-2">Application Details</h2>
                <p><span className="text-zinc-500">Program:</span> {app.admissionTrack?.program?.name}</p>
                <p><span className="text-zinc-500">Category:</span> {rev?.claims?.[0]?.categoryCode || "GENERAL"}</p>
                {(rev?.records || []).map((r) => (
                  <p key={r.id}>
                    <span className="text-zinc-500">{r.examName}:</span>{" "}
                    <span className="tabular-nums font-medium">{r.percentage}%</span> ({r.boardUniversity})
                  </p>
                ))}
              </div>

              {needsClaim && (
                <div className="bg-white border border-zinc-200 rounded-md p-5">
                  <p className="text-sm text-zinc-600 mb-3">Claim this application to unlock verification actions.</p>
                  <Button isLoading={busy} onClick={claim}>Start Review</Button>
                </div>
              )}

              {app.status === "UNDER_REVIEW" && (
                <div className="bg-white border border-zinc-200 rounded-md p-5 space-y-4">
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reviewer notes..."
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button isLoading={busy} onClick={approve}>Approve & Verify</Button>
                    <Button variant="outline" onClick={() => setShowDefect(!showDefect)}>
                      {showDefect ? "Cancel Defect" : "Raise Defect"}
                    </Button>
                  </div>

                  {showDefect && (
                    <form onSubmit={raiseDefect} className="pt-3 border-t border-zinc-200 space-y-3">
                      <SelectField label="Defect Reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                        <option value="BLURRED_DOCUMENT">Blurred Document</option>
                        <option value="MARKS_MISMATCH">Marks Mismatch</option>
                        <option value="EXPIRED_CERTIFICATE">Expired Certificate</option>
                        <option value="INVALID_DATE">Invalid Date</option>
                      </SelectField>
                      <textarea
                        rows={2}
                        required
                        value={defectComment}
                        onChange={(e) => setDefectComment(e.target.value)}
                        placeholder="Instruction for student..."
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                      />
                      <Button type="submit" variant="danger" isLoading={busy}>Send Defect to Student</Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
