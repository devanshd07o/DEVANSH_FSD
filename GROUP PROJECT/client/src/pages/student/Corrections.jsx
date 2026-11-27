import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button, SelectField } from "../../components/UI";
import { api } from "../../lib/api";

export default function Corrections() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [docTypeId, setDocTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/v1/applications/${id}`)
      .then(({ application }) => {
        setApp(application);
        const firstDocId = application.defects?.find((d) => d.status === "OPEN")?.document?.documentTypeId
          || application.admissionTrack?.requiredDocs?.[0]?.id
          || "";
        setDocTypeId(firstDocId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("studentNotes", notes);
      if (docTypeId) fd.append("replacementDocTypeId", docTypeId);
      if (file) fd.append("file", file);
      await api(`/api/v1/applications/${id}/corrections`, { method: "POST", body: fd });
      navigate(`/student/applications/${id}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <StudentHeader />
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Submit Application Correction</h1>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {loading && <p className="text-sm text-zinc-500">Loading defects...</p>}

      {app && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-md p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Open Scrutiny Defects</h2>
            {(app.defects || []).filter((d) => d.status === "OPEN").map((d) => (
              <div key={d.id} className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-950">{d.reasonCode}</span>
                  <Badge variant="danger">{d.status}</Badge>
                </div>
                <p className="text-amber-900 mt-1">{d.studentComment}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-md p-6 space-y-4">
            <SelectField label="Replacement Document Type" value={docTypeId} onChange={(e) => setDocTypeId(e.target.value)}>
              {(app.admissionTrack?.requiredDocs || []).map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.label}</option>
              ))}
            </SelectField>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Upload Corrected File (PDF/Image)</label>
              <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Clarification Notes</label>
              <textarea
                rows={3}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain what was updated..."
                className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-zinc-300 rounded-md"
              />
            </div>
            <Button type="submit" isLoading={submitting}>Resubmit for Review</Button>
          </form>
        </div>
      )}
    </div>
  );
}
