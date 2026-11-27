import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Field, SelectField } from "../components/UI";
import { api } from "../lib/api";

export default function RegisterPage({ onAuth }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [colleges, setColleges] = useState([]);
  const [institutionId, setInstitutionId] = useState(params.get("college") || "");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
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
      const data = await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ institutionId, ...form }),
      });
      await onAuth();
      navigate(data.redirectUrl || "/student/applications/new");
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
        <p className="text-sm text-text-secondary mt-1">Student Registration</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-surface p-6 sm:p-7 rounded-card border border-border space-y-4">
        <Alert>{error}</Alert>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="College" id="college" required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
            {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </SelectField>
          <Field label="Full Name" id="name" required placeholder="Enter full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Email" id="email" type="email" required placeholder="Enter email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Phone" id="phone" type="tel" placeholder="Enter phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Field label="Password" id="password" type="password" required minLength={8} placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" isLoading={loading} className="w-full">Create Account</Button>
        </form>
        <p className="text-center text-xs sm:text-sm text-text-secondary">
          Already registered? <Link to={`/sign-in?college=${institutionId}`} className="font-semibold text-text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </main>
  );
}
