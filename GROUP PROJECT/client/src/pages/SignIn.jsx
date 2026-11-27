import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Field, SelectField } from "../components/UI";
import { api } from "../lib/api";

export default function SignInPage({ onAuth }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [colleges, setColleges] = useState([]);
  const [institutionId, setInstitutionId] = useState(params.get("college") || "");
  const [portalTab, setPortalTab] = useState(["student", "staff", "college"].includes(params.get("tab")) ? params.get("tab") : "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/api/v1/colleges").then((d) => {
      setColleges(d.colleges || []);
      if (!institutionId && d.colleges?.[0]?.id) setInstitutionId(d.colleges[0].id);
    }).catch(() => {});
  }, []);

  const selectedCollege = colleges.find((c) => c.id === institutionId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, institutionId, portalTab }),
      });
      await onAuth();
      navigate(data.redirectUrl || "/student/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tight">
          {selectedCollege ? selectedCollege.name : "College Admission Portal"}
        </Link>
        <p className="text-sm text-text-secondary mt-1 capitalize">{portalTab} Portal Sign In</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex bg-zinc-200 p-1 rounded-t-card gap-1">
          {["student", "staff", "college"].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => { setPortalTab(role); setError(""); }}
              className={`flex-1 py-2 min-h-[40px] text-xs sm:text-sm font-medium rounded-control capitalize ${
                portalTab === role ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="bg-surface p-6 sm:p-7 rounded-b-card border border-border border-t-0 space-y-4">
          <Alert>{error}</Alert>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <SelectField label="College" id="college" required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </SelectField>
            <Field label="Email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" />
            <Field label="Password" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
            <Button type="submit" isLoading={loading} className="w-full">Sign In</Button>
          </form>

          <div className="pt-1 text-center text-xs sm:text-sm text-text-secondary">
            {portalTab === "student" && <p>No account? <Link to={`/register?college=${institutionId}`} className="font-semibold text-text-primary hover:underline">Register</Link></p>}
            {portalTab === "staff" && <p>New staff? <Link to={`/register-staff?college=${institutionId}`} className="font-semibold text-text-primary hover:underline">Register Staff</Link></p>}
            {portalTab === "college" && <p>New college? <Link to="/register-college" className="font-semibold text-text-primary hover:underline">Register College</Link></p>}
          </div>
        </div>
      </div>
    </main>
  );
}
