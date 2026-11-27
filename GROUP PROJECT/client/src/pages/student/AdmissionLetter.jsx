import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StudentHeader } from "../../components/Layout";
import { Alert, Button } from "../../components/UI";
import { api, formatDate } from "../../lib/api";

export default function AdmissionLetter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/student/admission")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const enrollment = data?.enrollment;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <StudentHeader />
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {loading && <p className="text-sm text-zinc-500">Loading admission letter...</p>}

      {!loading && !enrollment && (
        <div className="bg-white border border-zinc-200 rounded-md p-8 text-center">
          <p className="text-sm text-zinc-600 mb-4">Admission letter is generated after seat acceptance, fee payment, and Registrar confirmation.</p>
          <Link to="/student/offers"><Button variant="outline">Check Seat Offers</Button></Link>
        </div>
      )}

      {enrollment && (
        <div className="bg-white border border-zinc-200 rounded-md p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">{enrollment.institution?.name}</p>
              <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Provisional Admission Letter</h1>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print Letter</Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Enrollment Number</p>
              <p className="font-semibold text-zinc-900 tabular-nums mt-0.5">{enrollment.enrollmentNumber}</p>
            </div>
            <div>
              <p className="text-zinc-500">Application Number</p>
              <p className="font-semibold text-zinc-900 tabular-nums mt-0.5">{enrollment.application?.applicationNumber}</p>
            </div>
            <div>
              <p className="text-zinc-500">Allotted Program</p>
              <p className="font-semibold text-zinc-900 mt-0.5">{enrollment.program?.name}</p>
            </div>
            <div>
              <p className="text-zinc-500">Enrolled Date</p>
              <p className="font-semibold text-zinc-900 tabular-nums mt-0.5">{formatDate(enrollment.enrolledAt)}</p>
            </div>
          </div>

          {data.qrDataUrl && (
            <div className="pt-4 border-t border-zinc-200 flex items-center gap-5">
              <img src={data.qrDataUrl} alt="Admission Verification QR" className="w-24 h-24 border border-zinc-200 rounded" />
              <div className="text-xs text-zinc-600 space-y-1">
                <p className="font-medium text-zinc-900">QR Credential Verification</p>
                <p>Scan or verify online using token:</p>
                <Link to={`/verify/${data.verificationToken}`} className="font-mono underline text-zinc-900">
                  /verify/{data.verificationToken}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
