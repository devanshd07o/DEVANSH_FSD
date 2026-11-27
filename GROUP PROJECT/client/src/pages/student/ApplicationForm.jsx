import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Badge, Button, Field, SelectField } from "../../components/UI";
import { api } from "../../lib/api";

const STEPS = ["Personal", "Academic", "Category", "Documents", "Review"];

function pct(obt, max) {
  const o = Number(obt) || 0;
  const m = Number(max) || 0;
  return m > 0 ? Number(((o / m) * 100).toFixed(2)) : 0;
}

export default function ApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [personal, setPersonal] = useState({
    dob: "", gender: "Male", fatherName: "", motherName: "", address: "", city: "", state: "", pincode: "",
  });
  const [categoryCode, setCategoryCode] = useState("GENERAL");
  const [q10, setQ10] = useState({ examName: "Class 10", boardUniversity: "CBSE", passingYear: 2022, rollNumber: "", maxMarks: 500, obtainedMarks: 0 });
  const [q12, setQ12] = useState({ examName: "Class 12", boardUniversity: "CBSE", passingYear: 2024, rollNumber: "", maxMarks: 500, obtainedMarks: 0 });

  useEffect(() => {
    api(`/api/v1/applications/${id}`)
      .then(({ application }) => {
        setApp(application);
        setVersion(application.version || 1);
        const p = application.applicant?.profile;
        if (p) {
          setPersonal({
            dob: p.dob ? p.dob.slice(0, 10) : "",
            gender: p.gender || "Male",
            fatherName: p.fatherName || "",
            motherName: p.motherName || "",
            address: p.address || "",
            city: p.city || "",
            state: p.state || "",
            pincode: p.pincode || "",
          });
        }
        const rev = application.revisions?.[0];
        if (rev?.claims?.[0]?.categoryCode) setCategoryCode(rev.claims[0].categoryCode);
        const r10 = rev?.records?.find((r) => r.examName.includes("10"));
        const r12 = rev?.records?.find((r) => r.examName.includes("12"));
        if (r10) setQ10({ examName: r10.examName, boardUniversity: r10.boardUniversity, passingYear: r10.passingYear, rollNumber: r10.rollNumber, maxMarks: r10.maxMarks, obtainedMarks: r10.obtainedMarks });
        if (r12) setQ12({ examName: r12.examName, boardUniversity: r12.boardUniversity, passingYear: r12.passingYear, rollNumber: r12.rollNumber, maxMarks: r12.maxMarks, obtainedMarks: r12.obtainedMarks });
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function saveDraft(nextStep) {
    setError("");
    setMsg("");
    setSaving(true);
    try {
      const payload = {
        personalInfo: personal,
        categoryCode,
        qualifications: [
          { ...q10, passingYear: Number(q10.passingYear), maxMarks: Number(q10.maxMarks), obtainedMarks: Number(q10.obtainedMarks), percentage: pct(q10.obtainedMarks, q10.maxMarks) },
          { ...q12, passingYear: Number(q12.passingYear), maxMarks: Number(q12.maxMarks), obtainedMarks: Number(q12.obtainedMarks), percentage: pct(q12.obtainedMarks, q12.maxMarks) },
        ],
      };
      const res = await api(`/api/v1/applications/${id}/draft`, {
        method: "PATCH",
        body: JSON.stringify({ data: payload, expectedVersion: version }),
      });
      setVersion(res.version);
      setMsg("Draft saved");
      if (typeof nextStep === "number") setStep(nextStep);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadDoc(docTypeId, file) {
    if (!file) return;
    setError("");
    setUploadingId(docTypeId);
    try {
      const fd = new FormData();
      fd.append("documentTypeId", docTypeId);
      fd.append("file", file);
      const res = await api(`/api/v1/applications/${id}/documents`, { method: "POST", body: fd });
      setApp((prev) => ({
        ...prev,
        documents: [...prev.documents.filter((d) => d.documentTypeId !== docTypeId), res.document],
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingId("");
    }
  }

  async function submitApplication() {
    setError("");
    setSubmitting(true);
    try {
      await api(`/api/v1/applications/${id}/submit`, { method: "POST" });
      navigate(`/student/applications/${id}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  if (!app) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <StudentHeader />
        {error ? <Alert type="error">{error}</Alert> : <p className="text-sm text-zinc-500">Loading form...</p>}
      </div>
    );
  }

  const requiredDocs = app.admissionTrack?.requiredDocs || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StudentHeader />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{app.admissionTrack?.program?.name}</h1>
          <p className="text-xs text-zinc-500 tabular-nums">Draft #{app.applicationNumber}</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`px-3 py-1.5 text-xs rounded border ${step === idx ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-600 border-zinc-200"}`}
            >
              {idx + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

      <div className="bg-white border border-zinc-200 rounded-md p-6">
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Date of Birth" type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} />
            <SelectField label="Gender" value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </SelectField>
            <Field label="Father's Name" value={personal.fatherName} onChange={(e) => setPersonal({ ...personal, fatherName: e.target.value })} />
            <Field label="Mother's Name" value={personal.motherName} onChange={(e) => setPersonal({ ...personal, motherName: e.target.value })} />
            <Field label="Address" className="sm:col-span-2" value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
            <Field label="City" value={personal.city} onChange={(e) => setPersonal({ ...personal, city: e.target.value })} />
            <Field label="State" value={personal.state} onChange={(e) => setPersonal({ ...personal, state: e.target.value })} />
            <Field label="Pincode" value={personal.pincode} onChange={(e) => setPersonal({ ...personal, pincode: e.target.value })} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {[["Class 10", q10, setQ10], ["Class 12", q12, setQ12]].map(([title, q, setQ]) => (
              <div key={title} className="border border-zinc-200 rounded p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
                  <Badge variant="info">{pct(q.obtainedMarks, q.maxMarks)}%</Badge>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Board" value={q.boardUniversity} onChange={(e) => setQ({ ...q, boardUniversity: e.target.value })} />
                  <Field label="Passing Year" type="number" value={q.passingYear} onChange={(e) => setQ({ ...q, passingYear: e.target.value })} />
                  <Field label="Roll Number" value={q.rollNumber} onChange={(e) => setQ({ ...q, rollNumber: e.target.value })} />
                  <Field label="Max Marks" type="number" value={q.maxMarks} onChange={(e) => setQ({ ...q, maxMarks: e.target.value })} />
                  <Field label="Obtained Marks" type="number" value={q.obtainedMarks} onChange={(e) => setQ({ ...q, obtainedMarks: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900 mb-3">Reservation Category</p>
            {["GENERAL", "OBC", "SC", "ST", "EWS"].map((cat) => (
              <label key={cat} className="flex items-center gap-3 p-3 border border-zinc-200 rounded cursor-pointer">
                <input type="radio" name="cat" checked={categoryCode === cat} onChange={() => setCategoryCode(cat)} />
                <span className="text-sm font-medium text-zinc-800">{cat}</span>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">Upload PDF or image documents (max 5 MB).</p>
            {requiredDocs.map((reqDoc) => {
              const existing = app.documents?.find((d) => d.documentTypeId === reqDoc.id);
              return (
                <div key={reqDoc.id} className="p-4 border border-zinc-200 rounded flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {reqDoc.label} {reqDoc.isRequired ? "*" : ""}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {existing ? `Uploaded: ${existing.originalName}` : "Not uploaded yet"}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    disabled={uploadingId === reqDoc.id}
                    onChange={(e) => uploadDoc(reqDoc.id, e.target.files?.[0])}
                    className="text-xs text-zinc-700"
                  />
                </div>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <p className="font-medium text-zinc-900">Review Summary</p>
            <div className="grid sm:grid-cols-2 gap-3 p-4 bg-zinc-50 rounded border border-zinc-200">
              <div><span className="text-zinc-500">Father:</span> {personal.fatherName || "-"}</div>
              <div><span className="text-zinc-500">Category:</span> {categoryCode}</div>
              <div><span className="text-zinc-500">Class 10 %:</span> <span className="tabular-nums">{pct(q10.obtainedMarks, q10.maxMarks)}%</span></div>
              <div><span className="text-zinc-500">Class 12 %:</span> <span className="tabular-nums">{pct(q12.obtainedMarks, q12.maxMarks)}%</span></div>
              <div className="sm:col-span-2"><span className="text-zinc-500">Uploaded Docs:</span> {app.documents?.length || 0} / {requiredDocs.length}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-zinc-200">
          <Button variant="outline" onClick={() => saveDraft(Math.max(0, step - 1))} disabled={step === 0 || saving}>
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" isLoading={saving} onClick={() => saveDraft()}>
              Save Draft
            </Button>
            {step < 4 ? (
              <Button isLoading={saving} onClick={() => saveDraft(step + 1)}>Save & Next</Button>
            ) : (
              <Button isLoading={submitting} onClick={submitApplication}>Submit Application</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
