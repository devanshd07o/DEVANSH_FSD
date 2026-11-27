import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/UI";
import { api } from "../lib/api";

export default function VerifyPage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    api(`/api/v1/verify/${token}`).then((d) => setResult(d.result)).catch(() => {});
  }, [token]);

  if (!result) return <main className="min-h-screen flex items-center justify-center p-6 text-sm text-text-secondary">Checking document...</main>;

  const ok = result.status === "AUTHENTIC";
  const rows = [
    ["Institution", result.institutionName],
    ["Document", result.documentType?.replace(/_/g, " ")],
    ["Reference No.", result.documentNumber],
    ["Student", result.studentMaskedName],
    ["Program", result.programName],
    ["Session", result.academicYear],
    ["Issued Date", result.issuedDate],
  ];

  return (
    <main className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="text-xl font-bold">{result.institutionName || "College Admission Portal"}</Link>
        <p className="text-sm text-text-secondary mt-1">Document Verification</p>
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-lg bg-surface py-7 px-6 sm:px-8 rounded-card border border-border space-y-5">
        <div className="text-center">
          <Badge variant={ok ? "success" : result.status === "REVOKED" ? "danger" : "neutral"}>
            {ok ? "Verified Document" : result.status === "REVOKED" ? "Revoked Record" : "Record Not Found"}
          </Badge>
        </div>
        {ok ? (
          <div className="space-y-2.5 text-xs sm:text-sm divide-y divide-border">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 gap-4">
                <span className="text-text-muted">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs sm:text-sm text-text-secondary py-3">{result.message}</p>
        )}
        <div className="pt-3 border-t border-border text-center">
          <Link to="/" className="text-xs font-semibold hover:underline">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
